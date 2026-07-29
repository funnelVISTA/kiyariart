import { AnimatePresence, motion } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { useTapSwipe } from "@/hooks/useTapSwipe";
import { AddToCartButton } from "@/components/site/AddToCartButton";

type Props = {
  open: boolean;
  src: string | null;
  alt?: string;
  caption?: string;
  title?: string;
  description?: string;
  price?: number;
  medium?: string;
  sold?: boolean;
  canBuy?: boolean;
  inCart?: boolean;
  onAdd?: () => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  prevSrc?: string | null;
  nextSrc?: string | null;
};

export function Lightbox({ open, src, alt, caption, title, description, price, medium, sold, canBuy, inCart, onAdd, onClose, onPrev, onNext, prevSrc, nextSrc }: Props) {
  const swipe = useTapSwipe({
    onSwipe: (dir) => {
      if (dir === "left" && onNext) onNext();
      if (dir === "right" && onPrev) onPrev();
    },
    threshold: 50,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, onPrev, onNext, src]);

  return (
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl overflow-hidden"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 md:right-6 md:top-6 grid h-11 w-11 place-items-center rounded-full border border-border bg-card/60 hover:border-gold transition z-20"
          >
            <X className="h-5 w-5" />
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
            className="relative w-[92vw] max-h-[90vh] md:h-[88vh] overflow-y-auto overscroll-contain md:overflow-visible flex flex-col md:flex-row items-center justify-center gap-5 md:gap-8 px-2 md:px-6 py-6 md:py-0"
            onClick={(e) => e.stopPropagation()}
            {...swipe}
          >
            <div className="relative shrink-0 md:flex-1 md:min-h-0 w-full flex items-center justify-center">
              {prevSrc && (
                <img
                  src={prevSrc}
                  alt=""
                  aria-hidden
                  draggable={false}
                  onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                  className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[55%] max-h-[70vh] max-w-[35vw] object-contain opacity-25 hover:opacity-50 transition cursor-pointer pointer-events-auto select-none"
                />
              )}
              {nextSrc && (
                <img
                  src={nextSrc}
                  alt=""
                  aria-hidden
                  draggable={false}
                  onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                  className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-[55%] max-h-[70vh] max-w-[35vw] object-contain opacity-25 hover:opacity-50 transition cursor-pointer pointer-events-auto select-none"
                />
              )}
              <img
                src={src}
                alt={alt}
                draggable={false}
                className="relative z-10 max-h-[52vh] md:max-h-[85vh] max-w-full object-contain select-none"
              />
              {/* Mobile edge peeks */}
              {prevSrc && (
                <img
                  src={prevSrc}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-[40vh] w-auto max-w-[30vw] object-contain opacity-25 pointer-events-none select-none"
                />
              )}
              {nextSrc && (
                <img
                  src={nextSrc}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-[40vh] w-auto max-w-[30vw] object-contain opacity-25 pointer-events-none select-none"
                />
              )}
            </div>

            {(title || description || (price ?? 0) > 0 || sold || canBuy) && (
              <div className="w-full md:w-[300px] shrink-0 md:self-start md:pt-16 text-left">
                {title && (
                  <h2 className="font-display text-xl md:text-2xl text-gold leading-tight mb-2">{title}</h2>
                )}
                {medium && (
                  <div className="mb-2 text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    {medium}
                  </div>
                )}
                {(price ?? 0) > 0 && (
                  <div className="mb-3 text-sm md:text-base text-foreground font-medium">
                    ${price!.toLocaleString()} <span className="text-xs opacity-60">CAD</span>
                  </div>
                )}
                {description && (
                  <p className="mt-3 mb-4 text-xs md:text-sm text-foreground/85 leading-relaxed">
                    {description}
                  </p>
                )}
                {canBuy && onAdd ? (
                  <div className="mt-4 pb-2">
                    <AddToCartButton onAdd={onAdd} inCart={!!inCart} label="Add to cart" size="md" />
                  </div>
                ) : sold ? (
                  <div className="mt-4 inline-block border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    Sold
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {(caption || onPrev || onNext) && (
            <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 text-[10px] md:text-xs uppercase tracking-[0.3em] text-muted-foreground text-center">
              {caption}
              <div className="mt-1 text-[9px] opacity-60 normal-case tracking-wider">
                ← → to navigate
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
