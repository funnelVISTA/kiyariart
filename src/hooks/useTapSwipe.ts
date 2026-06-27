import { useRef } from "react";

type Opts = {
  onTap?: () => void;
  onSwipe?: (dir: "left" | "right") => void;
  threshold?: number;
};

/**
 * Lightweight touch gesture detector.
 * - Horizontal drag past `threshold` (default 40px) fires onSwipe.
 * - Quick release with little movement fires onTap.
 * Returns props to spread on the target element.
 */
export function useTapSwipe({ onTap, onSwipe, threshold = 40 }: Opts) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const moved = useRef(false);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
      moved.current = false;
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (!start.current) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - start.current.x) > 8 || Math.abs(t.clientY - start.current.y) > 8) {
        moved.current = true;
      }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!start.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      const dt = Date.now() - start.current.t;
      start.current = null;

      // Horizontal swipe wins if mostly horizontal and past threshold
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.2) {
        onSwipe?.(dx < 0 ? "left" : "right");
        return;
      }
      // Treat as tap if barely moved and quick
      if (!moved.current && dt < 500) {
        onTap?.();
      }
    },
  };
}
