import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Copy, Download, ExternalLink, Check } from "lucide-react";

export const Route = createFileRoute("/export")({
  head: () => ({
    meta: [
      { title: "ClickFunnels Export · art by KIYARI" },
      { name: "description", content: "Export this site's HTML/CSS/JS for ClickFunnels + BarnumPT." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExportPage,
});

const ROUTES = [
  { path: "/", label: "Home" },
  { path: "/artworks", label: "Artworks" },
  { path: "/exhibitions", label: "Exhibitions" },
  { path: "/community", label: "Community" },
];

function ExportPage() {
  const [target, setTarget] = useState("/");
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const grab = async () => {
    setBusy(true);
    try {
      const res = await fetch(target, { headers: { accept: "text/html" } });
      const raw = await res.text();
      // Parse and isolate the main <body> innerHTML (Lovable preview removes some bootstrap)
      const doc = new DOMParser().parseFromString(raw, "text/html");
      // Remove TanStack scripts + dev-mode bits we don't need in CF
      doc.querySelectorAll("script, link[rel='modulepreload']").forEach((n) => n.remove());
      const bodyInner = doc.body.innerHTML;
      setHtml(bodyInner.trim());

      // Pull all stylesheet hrefs and inline their CSS
      const links = Array.from(doc.querySelectorAll("link[rel='stylesheet']"))
        .map((l) => (l as HTMLLinkElement).href)
        .filter(Boolean);
      const sheets = await Promise.all(
        links.map((href) => fetch(href).then((r) => r.text()).catch(() => ""))
      );
      const inlineStyles = Array.from(doc.querySelectorAll("style")).map((s) => s.textContent || "").join("\n");
      setCss([inlineStyles, ...sheets].join("\n\n").trim());
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { grab(); /* eslint-disable-next-line */ }, [target]);

  const copy = async (val: string, key: string) => {
    await navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  const download = (filename: string, content: string, mime = "text/plain") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const singleFile = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>art by KIYARI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap">
<style>
${css}
</style>
</head>
<body>
${html}
</body>
</html>`;

  return (
    <div className="pt-32 pb-24 container-page max-w-5xl">
      <div className="text-xs uppercase tracking-[0.4em] text-gold mb-3">Internal · ClickFunnels</div>
      <h1 className="font-display text-5xl md:text-6xl">Export to ClickFunnels</h1>
      <p className="mt-4 text-muted-foreground max-w-2xl">
        Grab the rendered HTML + bundled CSS for any page. Paste into a ClickFunnels Custom HTML / BarnumPT block.
        For best results, paste the <strong className="text-foreground">CSS</strong> into CF's Custom CSS panel and the <strong className="text-foreground">HTML</strong> into a Custom HTML element.
      </p>

      {/* Page picker */}
      <div className="mt-10 flex flex-wrap gap-2">
        {ROUTES.map((r) => (
          <button
            key={r.path}
            onClick={() => setTarget(r.path)}
            className={`px-4 py-2 text-xs uppercase tracking-[0.2em] border transition ${
              target === r.path ? "border-gold text-gold" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={grab}
          disabled={busy}
          className="ml-auto px-4 py-2 text-xs uppercase tracking-[0.2em] border border-border hover:border-gold hover:text-gold transition disabled:opacity-50"
        >
          {busy ? "Fetching…" : "Re-fetch"}
        </button>
      </div>

      {/* HTML */}
      <Block
        title="HTML"
        subtitle="Paste into a ClickFunnels Custom HTML element."
        value={html}
        copied={copied === "html"}
        onCopy={() => copy(html, "html")}
        onDownload={() => download(`kiyari-${target.replace(/\W+/g, "") || "home"}.html`, html, "text/html")}
      />

      {/* CSS */}
      <Block
        title="CSS"
        subtitle="Paste into ClickFunnels → Page Settings → Tracking Code (in a <style> tag) OR into BarnumPT's CSS field."
        value={css}
        copied={copied === "css"}
        onCopy={() => copy(css, "css")}
        onDownload={() => download(`kiyari-${target.replace(/\W+/g, "") || "home"}.css`, css, "text/css")}
      />

      {/* Single-file bundle */}
      <Block
        title="Single-file bundle (HTML + CSS)"
        subtitle="Standalone .html — open it directly in a browser to preview, or hand to BarnumPT."
        value={singleFile}
        copied={copied === "bundle"}
        onCopy={() => copy(singleFile, "bundle")}
        onDownload={() => download(`kiyari-${target.replace(/\W+/g, "") || "home"}-bundle.html`, singleFile, "text/html")}
      />

      {/* Live preview */}
      <div className="mt-12">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Live preview of target page</div>
        <div className="border border-border overflow-hidden">
          <iframe ref={iframeRef} src={target} title="preview" className="w-full h-[600px] bg-background" />
        </div>
        <a href={target} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold transition">
          Open in new tab <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-16 p-6 border border-border bg-card/40">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Tips for ClickFunnels editability</div>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          <li>Each section is wrapped in a <code className="text-foreground">&lt;section&gt;</code> with a <code className="text-foreground">data-cf-page</code> attribute — split sections into separate CF blocks to let Kiyari edit text inline.</li>
          <li>Replace artwork <code className="text-foreground">&lt;img src&gt;</code> URLs with CF's image picker so she can swap images without code.</li>
          <li>Drop the CSS into CF's global custom CSS once — every page reuses it.</li>
          <li>The cart, lightbox, and tilt effects require the React JS bundle. For CF-editable static pages, skip those features in the exported HTML and use CF's native gallery for those areas.</li>
        </ul>
      </div>
    </div>
  );
}

function Block({
  title, subtitle, value, copied, onCopy, onDownload,
}: { title: string; subtitle: string; value: string; copied: boolean; onCopy: () => void; onDownload: () => void }) {
  return (
    <div className="mt-10">
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <div className="font-display text-2xl">{title}</div>
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={onCopy} className="inline-flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.2em] border border-border hover:border-gold hover:text-gold transition">
            {copied ? <Check className="h-3 w-3 text-gold" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={onDownload} className="inline-flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.2em] border border-border hover:border-gold hover:text-gold transition">
            <Download className="h-3 w-3" /> Download
          </button>
        </div>
      </div>
      <textarea
        readOnly
        value={value}
        className="w-full h-56 bg-card/60 border border-border p-4 text-xs font-mono text-muted-foreground"
      />
      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1">
        {value.length.toLocaleString()} chars
      </div>
    </div>
  );
}
