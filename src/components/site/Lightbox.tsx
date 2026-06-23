import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  src: string | null;
  alt?: string;
  caption?: string;
  onClose: () => void;
};

export function Lightbox({ open, src, alt, caption, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    if (!open) return;
    setScale(1); x.set(0); y.set(0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(5, s + 0.5));
      if (e.key === "-") setScale((s) => Math.max(1, s - 0.5));
      if (e.key === "0") { setScale(1); x.set(0); y.set(0); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, x, y]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(1, Math.min(5, s + (e.deltaY < 0 ? 0.15 : -0.15))));
  };

  return (
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-full border border-border bg-card/60 hover:border-gold transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute left-1/2 top-6 -translate-x-1/2 flex gap-2 z-10">
            <Tool icon={<ZoomOut className="h-4 w-4" />} onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(1, s - 0.5)); }} />
            <Tool icon={<RotateCcw className="h-4 w-4" />} onClick={(e) => { e.stopPropagation(); setScale(1); x.set(0); y.set(0); }} />
            <Tool icon={<ZoomIn className="h-4 w-4" />} onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(5, s + 0.5)); }} />
          </div>

          <motion.div
            className="relative max-h-[85vh] max-w-[90vw] overflow-hidden cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            onWheel={onWheel}
          >
            <motion.img
              src={src}
              alt={alt}
              draggable={false}
              style={{ x, y, scale }}
              drag={scale > 1}
              dragMomentum={false}
              dragElastic={0.1}
              animate={{ scale }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
              className="max-h-[85vh] max-w-[90vw] object-contain select-none"
            />
          </motion.div>

          {caption && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {caption}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tool({ icon, onClick }: { icon: React.ReactNode; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/60 hover:border-gold transition"
    >
      {icon}
    </button>
  );
}
