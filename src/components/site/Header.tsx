import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

const NAV = [
  { to: "/", key: "nav.home" },
  { to: "/artworks", key: "nav.artworks" },
  { to: "/exhibitions", key: "nav.exhibitions" },
  { to: "/community", key: "nav.community" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count, setOpen: setCartOpen } = useCart();
  const { lang, setLang, t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on(); window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "backdrop-blur-xl bg-background/80 border-b border-border" : "bg-transparent"}`}>
      <div className="container-page flex items-center justify-between py-5">
        <Link to="/" className="group flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-gold text-gold font-display text-lg transition-transform group-hover:rotate-3">K</span>
          <span className="font-display text-sm md:text-base lg:text-xl tracking-wide whitespace-nowrap">
            art by <span className="text-gradient-gold">KIYARI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-3 lg:gap-9 text-sm tracking-[0.18em] uppercase">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="link-underline text-muted-foreground hover:text-foreground transition-colors data-[status=active]:text-gold"
              activeOptions={{ exact: n.to === "/" }}
            >
              {t(n.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <LangToggle lang={lang} setLang={setLang} />
          <button
            onClick={() => setCartOpen(true)}
            aria-label="Cart"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-border hover:border-gold transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="md:hidden grid h-10 w-10 place-items-center rounded-full border border-border hover:border-gold"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl"
          >
            <nav className="container-page flex flex-col py-6">
              {NAV.map((n, i) => (
                <motion.div
                  key={n.to}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: i * 0.06 } }}
                >
                  <Link
                    to={n.to}
                    className="block py-4 font-display text-3xl text-foreground/90 hover:text-gold transition-colors"
                    activeOptions={{ exact: n.to === "/" }}
                  >
                    {t(n.key)}
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function LangToggle({ lang, setLang }: { lang: "en" | "fr"; setLang: (l: "en" | "fr") => void }) {
  return (
    <div className="relative flex h-10 items-center rounded-full border border-border p-0.5 text-[10px] uppercase tracking-[0.2em]">
      {(["en", "fr"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className="relative grid h-8 w-9 place-items-center"
          aria-pressed={lang === l}
        >
          {lang === l && (
            <motion.span
              layoutId="lang-pill"
              className="absolute inset-0 rounded-full bg-gradient-gold"
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            />
          )}
          <span className={`relative z-10 ${lang === l ? "text-primary-foreground font-semibold" : "text-muted-foreground"}`}>
            {l}
          </span>
        </button>
      ))}
    </div>
  );
}
