import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { X, Check, RotateCw } from "lucide-react";

type Props = {
  src: string;
  aspect?: number;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
};

type Area = { x: number; y: number; width: number; height: number };

async function getCroppedBlob(src: string, crop: Area, rotation = 0): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bW = img.width * cos + img.height * sin;
  const bH = img.width * sin + img.height * cos;

  const canvas = document.createElement("canvas");
  canvas.width = bW;
  canvas.height = bH;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(bW / 2, bH / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  const data = ctx.getImageData(0, 0, bW, bH);
  canvas.width = crop.width;
  canvas.height = crop.height;
  ctx.putImageData(data, -crop.x, -crop.y);

  return await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", 0.92),
  );
}

export function ImageCropper({ src, aspect = 4 / 5, onCancel, onCropped }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [ratio, setRatio] = useState(aspect);

  const onComplete = useCallback((_: any, px: Area) => setAreaPx(px), []);

  const apply = async () => {
    if (!areaPx) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(src, areaPx, rotation);
      onCropped(blob);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-background/95 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="text-xs uppercase tracking-[0.3em] text-gold">Crop image</div>
        <button onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-gold">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative flex-1 bg-black/40">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={ratio}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onComplete}
        />
      </div>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Aspect
            {[
              { l: "4:5", v: 4 / 5 },
              { l: "1:1", v: 1 },
              { l: "3:4", v: 3 / 4 },
              { l: "free", v: 0 },
            ].map((o) => (
              <button
                key={o.l}
                onClick={() => setRatio(o.v || NaN)}
                className={`px-2 py-1 border ${ratio === o.v || (isNaN(ratio) && !o.v) ? "border-gold text-gold" : "border-border"}`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold"
          >
            <RotateCw className="h-3 w-3" /> Rotate
          </button>
          <label className="flex-1 min-w-[180px] flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Zoom
            <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[hsl(var(--gold))]" />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-5 py-2 text-xs uppercase tracking-[0.2em] border border-border">
            Cancel
          </button>
          <button
            onClick={apply}
            disabled={busy}
            className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> {busy ? "Cropping…" : "Use crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
