import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import { ARTWORKS, HERO_IMAGE, type Artwork } from "@/lib/artworks";
import { useI18n } from "@/lib/i18n";
import { TiltCard } from "@/components/ui/TiltCard";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { Lightbox } from "@/components/site/Lightbox";
import { useCart } from "@/lib/cart";
import { useIsTouch } from "@/hooks/useIsTouch";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "art by KIYARI — Original Mixed-Media Paintings" },
      { name: "description", content: "Culturally guided, textured fine art by Kiyari. Browse originals, upcoming exhibitions, and the artist's community." },
      { property: "og:title", content: "art by KIYARI" },
      { property: "og:description", content: "Culturally guided, textured fine art you're encouraged to feel." },
      { property: "og:image", content: HERO_IMAGE },
      { name: "twitter:image", content: HERO_IMAGE },
    ],
  }),
  component: Home,
});

function Home() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const { t } = useI18n();
  const { add } = useCart();
  const [lightbox, setLightbox] = useState<Artwork | null>(null);

  const featured = ARTWORKS.filter((a) => !a.sold).slice(0, 6);

  return (
    <div data-cf-page="home">
      {/* HERO */}
      <section ref={ref} className="relative min-h-screen overflow-hidden bg-gradient-hero noise">
        <motion.div style={{ scale, y }} className="absolute inset-0 z-0">
          <img
            src={HERO_IMAGE}
            alt="Unbothered — featured painting by Kiyari"
            className="h-full w-full object-cover object-center opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/40" />
        </motion.div>

        <motion.div style={{ opacity }} className="relative z-10 container-page min-h-screen flex flex-col justify-end pb-24 pt-40">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
            className="max-w-3xl"
          >
            <div className="text-xs uppercase tracking-[0.4em] text-gold mb-6">— {t("hero.tag")}</div>
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl leading-[0.95]">
              <span className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: "100%" }} animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
                >{t("hero.line1")}</motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: "100%" }} animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                >{t("hero.line2")}</motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="block italic text-gradient-gold"
                  initial={{ y: "100%" }} animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                >{t("hero.line3")}</motion.span>
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.8 }}
              className="mt-8 max-w-xl text-lg text-muted-foreground leading-relaxed"
            >
              {t("hero.lede")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.7 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link to="/artworks" className="group inline-flex items-center gap-3 bg-gradient-gold px-8 py-4 text-sm uppercase tracking-[0.2em] text-primary-foreground font-medium hover:shadow-glow transition">
                {t("hero.cta1")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/exhibitions" className="inline-flex items-center gap-3 border border-border px-8 py-4 text-sm uppercase tracking-[0.2em] hover:border-gold hover:text-gold transition">
                {t("hero.cta2")}
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
        >
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            {t("hero.scroll")}
          </motion.span>
        </motion.div>
      </section>

      {/* MARQUEE */}
      <section className="border-y border-border bg-card/40 py-8 overflow-hidden">
        <div className="marquee">
          {[0, 1].map((k) => (
            <div key={k} className="marquee-track font-display text-5xl md:text-7xl" aria-hidden={k === 1}>
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="flex items-center gap-16">
                  art by KIYARI
                  <span className="text-gold">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-28 container-page grid md:grid-cols-12 gap-12">
        <div className="md:col-span-4">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-4">{t("about.kicker")}</div>
          </Reveal>
          <RevealText
            as="h2"
            text={t("about.title")}
            className="font-display text-5xl md:text-6xl block"
          />
        </div>
        <div className="md:col-span-7 md:col-start-6 space-y-6 text-lg text-muted-foreground leading-relaxed">
          <Reveal delay={0.1}><p>{t("about.p1")}</p></Reveal>
          <Reveal delay={0.2}><p className="text-foreground"><em className="text-gold">{t("about.p2")}</em></p></Reveal>
          <Reveal delay={0.3}>
            <div className="grid grid-cols-3 gap-6 pt-6 text-sm">
              <Stat label={t("stat.originals")} value="26+" />
              <Stat label={t("stat.exhibitions")} value="12" />
              <Stat label={t("stat.years")} value="9" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURED ARTWORKS */}
      <section className="py-28 container-page">
        <div className="flex items-end justify-between mb-12">
          <div>
            <Reveal>
              <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">{t("feat.kicker")}</div>
            </Reveal>
            <RevealText as="h2" text={t("feat.title")} className="font-display text-5xl md:text-6xl block" />
          </div>
          <Link to="/artworks" className="hidden md:inline-flex items-center gap-2 text-sm link-underline">
            {t("feat.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 [perspective:1500px]">
          {featured.map((a, i) => (
            <Reveal
              key={a.id}
              delay={(i % 3) * 0.08}
              className={i === 0 ? "md:row-span-2 md:col-span-2" : ""}
            >
              <TiltCard max={8} scale={1.02} className="group relative h-full">
                <div className={`relative overflow-hidden ${i === 0 ? "aspect-square md:aspect-[4/5]" : "aspect-square"}`}>
                  <img
                    src={a.image}
                    alt={a.title}
                    className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                    style={{ transform: "translateZ(0)" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/10 to-transparent opacity-70 group-hover:opacity-95 transition-opacity duration-500" />

                  {/* Top-right actions */}
                  <div className="absolute right-3 top-3 flex gap-2 opacity-0 group-hover:opacity-100 transition" style={{ transform: "translateZ(40px)" }}>
                    <button
                      aria-label="Zoom"
                      onClick={(e) => { e.preventDefault(); setLightbox(a); }}
                      className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background/70 backdrop-blur hover:border-gold transition"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500" style={{ transform: "translateZ(30px)" }}>
                    <div className="font-display text-2xl md:text-3xl">{a.title}</div>
                    <div className="mt-1 flex items-center justify-between gap-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-gold">
                        {a.price > 0 ? `$${a.price.toLocaleString()} CAD` : t("art.inquire")} · {a.collection}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          add(a);
                          toast.success(`${a.title} ${t("art.addedToast")}`);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] border border-border px-3 py-2 hover:border-gold hover:text-gold transition"
                      >
                        <Plus className="h-3 w-3" /> {t("feat.add")}
                      </button>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="relative container-page text-center">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.4em] text-gold mb-6">{t("cta.kicker")}</div>
          </Reveal>
          <RevealText as="h2" text={t("cta.title")} className="font-display text-5xl md:text-7xl max-w-3xl mx-auto leading-tight block" />
          <Reveal delay={0.2}>
            <p className="mt-6 text-muted-foreground max-w-xl mx-auto">{t("cta.lede")}</p>
          </Reveal>
          <Reveal delay={0.3}>
            <Link to="/community" className="mt-10 inline-flex items-center gap-3 bg-gradient-gold px-8 py-4 text-sm uppercase tracking-[0.2em] text-primary-foreground font-medium hover:shadow-glow transition">
              {t("cta.btn")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      <Lightbox
        open={!!lightbox}
        src={lightbox?.image ?? null}
        alt={lightbox?.title}
        caption={lightbox ? `${lightbox.title} — ${lightbox.collection}` : undefined}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-4xl text-gold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
    </div>
  );
}
