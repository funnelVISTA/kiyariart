import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    let lenis: any;
    let raf: number;
    let cancelled = false;
    (async () => {
      const Lenis = (await import("lenis")).default;
      if (cancelled) return;
      lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        prevent: (node: Element) => Boolean(node.closest("[data-native-scroll]")),
      });
      (window as any).__kiyariLenis = lenis;
      const loop = (time: number) => {
        lenis.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy?.();
      if ((window as any).__kiyariLenis === lenis) delete (window as any).__kiyariLenis;
    };
  }, []);
  return null;
}
