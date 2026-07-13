import { Check, Plus } from "lucide-react";

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

  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!inCart) onAdd();
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