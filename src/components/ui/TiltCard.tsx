import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  max?: number;
  scale?: number;
  glare?: boolean;
};

export function TiltCard({ children, className, max = 10, scale = 1.03, glare = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let destroyed = false;
    (async () => {
      const VanillaTilt = (await import("vanilla-tilt")).default;
      if (destroyed) return;
      VanillaTilt.init(el, {
        max,
        scale,
        speed: 700,
        glare,
        "max-glare": 0.25,
        perspective: 1200,
        "gyroscope": false,
      } as any);
    })();
    return () => {
      destroyed = true;
      (el as any).vanillaTilt?.destroy?.();
    };
  }, [max, scale, glare]);

  return (
    <div ref={ref} className={className} style={{ transformStyle: "preserve-3d" }}>
      {children}
    </div>
  );
}
