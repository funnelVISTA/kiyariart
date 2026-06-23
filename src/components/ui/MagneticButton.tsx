import { useRef, type ReactNode, type ElementType, type ComponentPropsWithoutRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

type Props<T extends ElementType> = {
  as?: T;
  strength?: number;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function MagneticButton<T extends ElementType = "button">({
  as,
  strength = 0.35,
  className,
  children,
  ...rest
}: Props<T>) {
  const Comp: any = as || "button";
  const ref = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.3 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.span
      style={{ x: sx, y: sy, display: "inline-block" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      ref={ref as any}
    >
      <Comp className={className} {...rest}>{children}</Comp>
    </motion.span>
  );
}
