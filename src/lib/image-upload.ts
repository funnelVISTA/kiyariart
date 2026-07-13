// Client-side image compression + safe base64 encoding for admin uploads.
// Fixes "Maximum call stack size exceeded" caused by
// `btoa(String.fromCharCode(...new Uint8Array(buf)))` on large images:
// spreading a multi-MB byte array into function args overflows the JS stack.
// Here we (1) resize/re-encode via <canvas> so the payload is small, and
// (2) convert the resulting Blob to base64 with FileReader — no spread, no
// recursion — so even a raw fallback path never overflows.

const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.85;
const JPEG_QUALITY = 0.85;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e instanceof Error ? e : new Error("Could not decode image"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encoding failed"))),
      type,
      quality,
    );
  });
}

async function supportsWebp(): Promise<boolean> {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/webp", 0.5));
    return !!blob && blob.type === "image/webp";
  } catch {
    return false;
  }
}

export type CompressedImage = {
  blob: Blob;
  filename: string;
  contentType: string;
};

/**
 * Resize (longest edge <= 1600px) and re-encode a user-selected image.
 * Skips work for tiny already-optimized files. Returns a Blob suitable for
 * direct storage upload.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  // GIF/SVG: don't touch — canvas re-encoding would strip animation/vectors.
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return { blob: file, filename: file.name, contentType: file.type || "application/octet-stream" };
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    // If decode fails, fall through to raw upload — server will validate.
    return { blob: file, filename: file.name, contentType: file.type || "application/octet-stream" };
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const longest = Math.max(w, h);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { blob: file, filename: file.name, contentType: file.type || "application/octet-stream" };
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, tw, th);

  const preferWebp = await supportsWebp();
  const outType = preferWebp ? "image/webp" : "image/jpeg";
  const quality = preferWebp ? WEBP_QUALITY : JPEG_QUALITY;
  const encoded = await canvasToBlob(canvas, outType, quality);

  // Only keep the re-encode if it actually reduced size; otherwise stick with
  // the original (already smaller than what we'd produce).
  const useEncoded = encoded.size < file.size || scale < 1;
  const finalBlob = useEncoded ? encoded : file;
  const finalType = useEncoded ? outType : (file.type || outType);
  const ext = finalType === "image/webp" ? "webp" : finalType === "image/jpeg" ? "jpg" : file.name.split(".").pop() || "img";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  const filename = useEncoded ? `${base}.${ext}` : file.name;

  return { blob: finalBlob, filename, contentType: finalType };
}

/**
 * Safely convert a Blob to a raw base64 string (no data: prefix).
 * Uses FileReader instead of `btoa(String.fromCharCode(...bytes))`, which
 * overflows the stack on multi-MB arrays.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected reader result"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}