import { AnimatePresence, motion } from "motion/react";
import { X, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

type Props = {
  open: boolean;
  src: string | null;
  alt?: string;
  caption?: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export function Lightbox({ open, src, alt, caption, onClose, onPrev, onNext }: Props) {
  const ref = useRef<ReactZoomPanPinchRef | null>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.resetTransform();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
      if (e.key === "0") ref.current?.resetTransform();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onPrev, onNext, src]);

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
            className="absolute right-4 top-4 md:right-6 md:top-6 grid h-11 w-11 place-items-center rounded-full border border-border bg-card/60 hover:border-gold transition z-20"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); ref.current?.resetTransform(); }}
            aria-label="Reset zoom"
            className="absolute left-1/2 top-4 md:top-6 -translate-x-1/2 grid h-10 w-10 place-items-center rounded-full border border-border bg-card/60 hover:border-gold transition z-20"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {onPrev && (
            <button
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              aria-label="Previous"
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full border border-border bg-card/60 hover:border-gold transition z-20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {onNext && (
            <button
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              aria-label="Next"
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full border border-border bg-card/60 hover:border-gold transition z-20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div
            className="relative w-[90vw] h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <TransformWrapper
              ref={ref}
              initialScale={1}
              minScale={1}
              maxScale={5}
              centerOnInit
              doubleClick={{ mode: "toggle", step: 1.5 }}
              wheel={{ step: 0.15 }}
              pinch={{ step: 5 }}
            >
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <img
                  src={src}
                  alt={alt}
                  draggable={false}
                  className="max-h-[80vh] max-w-[90vw] object-contain select-none"
                />
              </TransformComponent>
            </TransformWrapper>
          </div>

          {caption && (
            <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground text-center">
              {caption}
              <div className="mt-1 text-[9px] opacity-60 normal-case tracking-wider">
                Pinch / scroll to zoom · drag to pan · ← → to navigate
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
