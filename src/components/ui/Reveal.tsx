import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const wordVariants: Variants = {
  hidden: { y: "110%" },
  show: (i: number) => ({
    y: "0%",
    transition: { duration: 0.85, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] },
  }),
};

export function RevealText({
  text,
  className,
  as: As = "span",
}: {
  text: string;
  className?: string;
  as?: React.ElementType;
}) {
  const words = text.split(" ");
  return (
    <As className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pr-[0.25em]">
          <motion.span
            className="inline-block"
            variants={wordVariants}
            custom={i}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10%" }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </As>
  );
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
