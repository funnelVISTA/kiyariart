import { Check, Plus } from "lucide-react";
import { useRef } from "react";

type Props = {
  onAdd: () => void;
  inCart: boolean;
  label: string;
  variant?: "solid" | "outline";
  size?: "sm" | "md";
};

/**
 * Shared Add-to-Cart control used everywhere on the site.
 * A real <button> with cursor:pointer, stopPropagation on all pointer events
 * so parent card handlers (e.g. open lightbox) never eat the click.
 */
export function AddToCartButton({ onAdd, inCart, label, variant = "solid", size = "md" }: Props) {
  const pad =
    size === "sm"
      ? "px-2.5 md:px-3.5 py-1.5 md:py-2 text-[9px] md:text-[10px]"
      : "px-3.5 py-2 text-[10px]";
  const base =
    "relative z-20 inline-flex items-center gap-1 uppercase tracking-[0.2em] font-semibold transition-all duration-300 cursor-pointer select-none pointer-events-auto touch-manipulation";
  const state = inCart
    ? "border border-gold text-gold cursor-default"
    : variant === "solid"
      ? "bg-gradient-gold text-primary-foreground hover:shadow-glow active:scale-95"
      : "border border-border hover:border-gold hover:text-gold";

  // Chrome swallows the synthesized `click` event when the button's transform
  // shifts between pointerdown and pointerup — which happens continuously
  // inside a vanilla-tilt TiltCard. We fire the add on `pointerup` after
  // capturing the pointer on `pointerdown`, so the interaction survives any
  // parent transform. `onClick` remains as the keyboard/AT fallback (Space /
  // Enter never produce a pointerdown). `add` in the cart is idempotent, so
  // the two paths never double-add.
  const handledRef = useRef(false);

  const fire = () => {
    if (inCart || handledRef.current) return;
    handledRef.current = true;
    // Release the guard on the next frame so a legitimate second interaction
    // isn't blocked, but the synthesized click that follows pointerup is.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        handledRef.current = false;
      });
    });
    onAdd();
  };

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.button !== undefined && e.button !== 0) return;
        try {
          (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        } catch {}
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (e.button !== undefined && e.button !== 0) return;
        try {
          (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
        } catch {}
        // Only fire if the release happened over the button itself.
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && e.currentTarget.contains(target)) fire();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        fire();
      }}
      disabled={inCart}
      aria-label={inCart ? "In cart" : label}
      className={`${base} ${pad} ${state}`}
    >
      {inCart ? (
        <>
          <Check className="h-3 w-3" /> In cart
        </>
      ) : (
        <>
          <Plus className="h-3 w-3" /> {label}
        </>
      )}
    </button>
  );
}