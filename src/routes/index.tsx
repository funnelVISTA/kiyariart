import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ARTWORKS, HERO_IMAGE, isArtworkPurchasable, type Artwork } from "@/lib/artworks";
import { useI18n } from "@/lib/i18n";
import { TiltCard } from "@/components/ui/TiltCard";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { Lightbox } from "@/components/site/Lightbox";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { useCart } from "@/lib/cart";
import { useIsTouch } from "@/hooks/useIsTouch";
import { useTapSwipe } from "@/hooks/useTapSwipe";
import { toast } from "sonner";

const thumb = (url: string, w = 800) => url.replace(/rs=w:\d+/, `rs=w:${w}`);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kiyari Art | Bold Afrocentric Textured Originals — Calgary" },
      { name: "description", content: "Bold Colours, Fearless Textures & Stories You Can Feel. Vibrant, stand-out Afrocentric originals by Kiyari, merging abstract expression with tactile elements — Calgary." },
      { property: "og:title", content: "Kiyari Art | Bold Afrocentric Textured Originals — Calgary" },
      { property: "og:description", content: "Vibrant, stand-out Afrocentric originals that merge abstract expression with tactile elements — to honour the depth and brilliance of our culture." },
      { property: "og:image", content: HERO_IMAGE },
      { name: "twitter:image", content: HERO_IMAGE },
    ],
    links: [
      { rel: "preload", as: "image", href: HERO_IMAGE, fetchpriority: "high" } as any,
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
  const isTouch = useIsTouch();
  const { add, has } = useCart();
  const [lightbox, setLightbox] = useState<Artwork | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const featured = ARTWORKS.filter(isArtworkPurchasable).slice(0, 6);

  return (
    <div data-cf-page="home">
      {/* HERO */}
      <section ref={ref} className="relative min-h-screen overflow-hidden bg-gradient-hero noise">
        <motion.div style={{ scale, y }} className="absolute inset-0 z-0">
          <img
            src={HERO_IMAGE}
            alt="Unbothered — featured painting by Kiyari"
            fetchPriority="high"
            decoding="async"
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
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[1.02]">
              <span className="block overflow-hidden">
                <motion.span
                  className="block pr-1 pb-1"
                  initial={{ y: "100%" }} animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
                >{t("hero.line1")}</motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="block pr-1 pb-1"
                  initial={{ y: "100%" }} animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                >{t("hero.line2")}</motion.span>
              </span>
              <span className="block overflow-visible pr-[0.35em]">
                <motion.span
                  className="inline-block pr-[0.35em] pb-2 whitespace-nowrap"
                  initial={{ y: "100%" }} animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {t("hero.line3a")}
                  <span className="relative z-20 italic text-gradient-gold pr-[0.15em]">{t("hero.line3b")}</span>
                </motion.span>
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.8 }}
              className="mt-8 max-w-[60ch] text-lg text-muted-foreground leading-relaxed"
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
          <Reveal delay={0.2}><p>{t("about.p2")}</p></Reveal>
          <Reveal delay={0.25}>
            <p>
              {t("about.p3a")}
              <span className="italic font-semibold text-gradient-gold">{t("about.p3b")}</span>
              {t("about.p3c")}
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="text-foreground italic border-l-2 border-gold pl-5">
              {t("about.p4")}
            </p>
          </Reveal>
          <Reveal delay={0.35}>
            <div className="grid grid-cols-3 gap-6 pt-6 text-sm">
              <Stat label={t("stat.originals")} value="26+" />
              <Stat label={t("stat.exhibitions")} value="12" />
              <Stat label={t("stat.years")} value="9" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* EXHIBITIONS */}
      <section className="py-24 container-page">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <Reveal>
              <div className="text-xs uppercase tracking-[0.3em] text-gold mb-4">Live shows</div>
            </Reveal>
            <RevealText as="h2" text="Exhibitions" className="font-display text-5xl md:text-6xl block" />
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <ul className="divide-y divide-border border-y border-border">
              {[
                { title: "Future Stars Foundation", date: "June 2026" },
                { title: "Essence of a Butterfly", date: "May 2023" },
                { title: "Our Essence: Beautiful in Black", date: "Feb 2023" },
              ].map((ex) => (
                <li key={ex.title} className="flex items-center justify-between gap-6 py-6">
                  <div className="min-w-0">
                    <div className="font-display text-2xl md:text-3xl leading-tight">{ex.title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{ex.date}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SUPPORTERS */}
      <section className="py-20 border-y border-border bg-card/30">
        <div className="container-page">
          <Reveal>
            <div className="text-center text-xs uppercase tracking-[0.3em] text-gold mb-8">Our Supporters</div>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 items-center">
            {["Future Stars Foundation", "Pyoor Entertainment", "Big Rich Entertainment", "L&R Studios"].map((s) => (
              <div
                key={s}
                className="text-center text-[11px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold transition-colors"
              >
                {s}
              </div>
            ))}
          </div>
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
              <FeaturedCard
                a={a}
                hero={i === 0}
                isTouch={isTouch}
                revealed={revealedId === a.id}
                inCart={has(a.id)}
                onToggleReveal={() => setRevealedId(revealedId === a.id ? null : a.id)}
                onOpen={() => setLightbox(a)}
                onAdd={() => {
                  if (!isArtworkPurchasable(a)) {
                    toast.error(t("art.soldToast"));
                    return;
                  }
                  if (has(a.id)) {
                    toast.info(`${a.title} — already in your cart`);
                    return;
                  }
                  add(a);
                  toast.success(`${a.title} ${t("art.addedToast")}`);
                }}
                t={t}
              />
            </Reveal>
          ))}
        </div>
      </section>


      {/* CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="relative container-page max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.4em] text-gold mb-4">{t("cta.kicker")}</div>
          </Reveal>
          <RevealText as="h2" text={t("cta.title")} className="font-display text-4xl md:text-5xl max-w-2xl mx-auto leading-tight block" />
          <Reveal delay={0.15}>
            <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-lg mx-auto">{t("cta.lede")}</p>
          </Reveal>
          <Reveal delay={0.25}>
            <Link to="/community" className="mt-6 inline-flex items-center gap-3 bg-gradient-gold px-8 py-4 text-sm uppercase tracking-[0.2em] text-primary-foreground font-medium hover:shadow-glow transition">
              {t("cta.btn")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <Reveal delay={0.35}>
            <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto">
              {t("cta.commission")}
            </p>
          </Reveal>
        </div>
      </section>

      <Lightbox
        open={!!lightbox}
        src={lightbox?.image ?? null}
        alt={lightbox?.title}
        title={lightbox?.title}
        description={lightbox?.description}
        price={lightbox?.price}
        caption={lightbox ? lightbox.title : undefined}
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

type FeaturedCardProps = {
  a: Artwork;
  hero: boolean;
  isTouch: boolean;
  revealed: boolean;
  inCart: boolean;
  onToggleReveal: () => void;
  onOpen: () => void;
  onAdd: () => void;
  t: (k: string) => string;
};

function FeaturedCard({ a, hero, isTouch, revealed, inCart, onToggleReveal, onOpen, onAdd, t }: FeaturedCardProps) {
  const swipe = useTapSwipe({ onTap: onOpen, onSwipe: onToggleReveal });
  const imageInteractionProps = isTouch ? swipe : { onClick: onOpen };
  return (
    <div className="group relative h-full" data-reveal={revealed}>
      {/* Zone 1 — Image only. Tilt + lightbox click confined here. */}
      <TiltCard
        max={8}
        scale={1.02}
        className="relative cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`Open ${a.title}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        {...imageInteractionProps}
      >
        <div className={`relative overflow-hidden ${hero ? "aspect-square md:aspect-[4/5]" : "aspect-square"}`}>
          <img
            src={thumb(a.image, hero ? 1100 : 700)}
            alt={a.title}
            loading={hero ? "eager" : "lazy"}
            decoding="async"
            sizes={hero ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 50vw"}
            className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
            style={{ transform: "translateZ(0)" }}
          />
        </div>
      </TiltCard>

      {/* Zone 2 — Info + action strip. Outside TiltCard, no transform. */}
      <div className="pt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-lg md:text-2xl leading-tight truncate">{a.title}</div>
          {isArtworkPurchasable(a) && (
            <div className="mt-1 text-[10px] md:text-xs text-gold uppercase tracking-[0.2em]">
              ${a.price.toLocaleString()} CAD
            </div>
          )}
        </div>
        <div className="shrink-0">
          <AddToCartButton onAdd={onAdd} inCart={inCart} label={t("feat.add")} variant="outline" size="sm" />
        </div>
      </div>
    </div>
  );
}

