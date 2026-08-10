import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ARTWORKS, HERO_IMAGE, HERO_WIDE_SRC, HERO_WIDE_SRCSET, HERO_TALL_SRCSET, HERO_SQUARE_SRC, HERO_SQUARE_SRCSET, isArtworkPurchasable, type Artwork } from "@/lib/artworks";
import { absUrl, canonical } from "@/lib/site-config";
import { useI18n } from "@/lib/i18n";
import { TiltCard } from "@/components/ui/TiltCard";
import { Reveal, RevealText } from "@/components/ui/Reveal";
import { Lightbox } from "@/components/site/Lightbox";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { useCart } from "@/lib/cart";
import { useIsTouch } from "@/hooks/useIsTouch";
import { useTapSwipe } from "@/hooks/useTapSwipe";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listArtworkAvailability } from "@/lib/payments.functions";
import { AboutArtistSection } from "@/components/site/AboutArtist";
import { PartnersStrip } from "@/components/site/PartnersStrip";
import { HomeEventsSection } from "@/components/site/HomeEvents";

const thumb = (url: string, w = 800) => url.replace(/rs=w:\d+/, `rs=w:${w}`);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kiyari Art | Bold Textured Originals — Calgary" },
      { name: "description", content: "Shop bold textured originals by Kiyari — vibrant, one-of-a-kind mixed-media paintings from Calgary." },
      { property: "og:title", content: "Kiyari Art | Bold Textured Originals — Calgary" },
      { property: "og:description", content: "Vibrant, stand-out originals that merge abstract expression with tactile elements." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absUrl("/") },
      { property: "og:image", content: absUrl(HERO_IMAGE) },
      { name: "twitter:image", content: absUrl(HERO_IMAGE) },
    ],
    links: [
      {
        rel: "preload",
        as: "image",
        href: HERO_SQUARE_SRC,
        imagesrcset: HERO_SQUARE_SRCSET,
        imagesizes: "100vw",
        media: "(max-width: 767px)",
        fetchpriority: "high",
      } as any,
      {
        rel: "preload",
        as: "image",
        href: HERO_WIDE_SRC,
        imagesrcset: HERO_WIDE_SRCSET,
        imagesizes: "100vw",
        media: "(min-width: 768px)",
        fetchpriority: "high",
      } as any,
      canonical("/"),
    ],
  }),
  component: Home,
});

function Home() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const { t } = useI18n();
  const isTouch = useIsTouch();
  const { add, has } = useCart();
  const [lightbox, setLightbox] = useState<Artwork | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const { data: availability } = useQuery({
    queryKey: ["artwork-availability"],
    queryFn: () => listArtworkAvailability(),
    staleTime: 60_000,
  });
  const { data: customRows } = useQuery({
    queryKey: ["artworks-custom-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks_custom")
        .select("id,title,description,price,image_url,medium,sold,display_order,created_at,on_sale,sale_price")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const featured = useMemo<Artwork[]>(() => {
    const soldSet = new Set(availability?.soldIds ?? []);
    const availOverride = new Set(availability?.availableOverrideIds ?? []);
    const deletedCatalog = new Set(availability?.deletedCatalogIds ?? []);
    const ovMap = new Map<string, any>();
    for (const r of availability?.catalogOverrides ?? []) ovMap.set(r.artwork_id, r);

    const fromCustom: Artwork[] = (customRows ?? []).map((r: any) => {
      const list = Number(r.price ?? 0);
      const onSale = !!r.on_sale && r.sale_price != null;
      const sale = onSale ? Number(r.sale_price) : null;
      const effective = onSale && sale != null ? sale : list;
      return {
        id: r.id, title: r.title, image: r.image_url, price: effective,
        originalPrice: onSale ? list : undefined,
        onSale: onSale && sale != null && sale < list,
        sold: !!r.sold, collection: "Our Essence" as const,
        medium: r.medium ?? undefined, description: r.description ?? undefined,
        shipping_cad: Number((availability?.customShipping ?? {})[r.id] ?? 0),
      };
    });
    const fromCatalog: Artwork[] = ARTWORKS.filter((a) => !deletedCatalog.has(a.id)).map((a) => {
      const ov = ovMap.get(a.id);
      const list = ov?.price_override ?? a.price;
      const onSale = !!ov?.on_sale && ov?.sale_price != null;
      const sale = onSale ? Number(ov.sale_price) : null;
      const effective = onSale && sale != null ? sale : list;
      return {
        ...a, collection: "Our Essence" as const,
        title: ov?.title ?? a.title, image: ov?.image_url ?? a.image,
        description: ov?.description ?? a.description, medium: ov?.medium ?? a.medium,
        price: effective, originalPrice: onSale ? list : undefined,
        onSale: onSale && sale != null && sale < list,
        sold: availOverride.has(a.id) ? false : (a.sold || soldSet.has(a.id)),
        shipping_cad: Number(ov?.shipping_cad ?? 0),
      };
    });
    return [...fromCustom, ...fromCatalog].filter(isArtworkPurchasable).slice(0, 6);
  }, [availability, customRows]);

  return (
    <div data-cf-page="home">
      {/* MOBILE HERO — image fills the section; text overlays the photo's dark wall above/below the canvas */}
      <section className="md:hidden relative min-h-[100svh] overflow-hidden hero-surface noise">
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_TALL_SRC}
            srcSet={HERO_TALL_SRCSET}
            sizes="100vw"
            alt="Bold painting by Kiyari — woman's face with vibrant purple florals on golden yellow"
            fetchPriority="high"
            decoding="async"
            loading="eager"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-x-0 top-0 h-[34%] bg-[linear-gradient(to_bottom,rgba(5,4,3,0.78),rgba(5,4,3,0.15))]" />
          <div className="absolute inset-x-0 bottom-0 h-[32%] bg-[linear-gradient(to_top,rgba(5,4,3,0.85),rgba(5,4,3,0))]" />
        </div>

        <div className="relative z-10 min-h-[100svh] flex flex-col justify-between container-page pt-20 pb-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            className="font-display text-[1.6rem] leading-[1.14] text-balance"
          >
            {t("hero.line1")}{" "}{t("hero.line2")}{" "}{t("hero.line3a")}
            <span className="italic text-gradient-gold pr-[0.12em]">{t("hero.line3b")}</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="flex flex-col items-start gap-4"
          >
            <p className="text-[0.8rem] text-muted-foreground leading-snug whitespace-pre-line">
              {t("hero.lede")}
            </p>
            <Link to="/artworks" className="group inline-flex items-center gap-2 bg-gradient-gold px-5 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground font-medium hover:shadow-glow transition">
              Shop Collection
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* DESKTOP HERO — unchanged */}
      <section ref={ref} className="relative hidden md:block min-h-screen overflow-hidden hero-surface noise">
        <div className="absolute inset-0 z-0">
          {/* The photograph itself fills the hero — its own spotlit wall IS the background, so no seam. */}
          <picture>
            <source media="(min-width: 768px)" srcSet={HERO_WIDE_SRCSET} sizes="100vw" />
            <source media="(max-width: 767px)" srcSet={HERO_TALL_SRCSET} sizes="100vw" />
            <img
              src={HERO_WIDE_SRC}
              alt="Bold painting by Kiyari — woman's face with vibrant purple florals on golden yellow"
              fetchPriority="high"
              decoding="async"
              loading="eager"
              className="h-full w-full object-cover object-center"
            />
          </picture>
          {/* Text-column contrast only — a soft left-side and bottom falloff, artwork untouched */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(5,4,3,0.72),rgba(5,4,3,0.25)_38%,rgba(5,4,3,0)_62%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,4,3,0.8),rgba(5,4,3,0)_45%)]" />
        </div>

        <motion.div style={{ opacity }} className="relative z-10 container-page min-h-screen flex flex-col justify-start pb-60 md:pb-52 hero-text-top">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
            className="max-w-3xl"
          >
            <h1 className="font-display text-[1.85rem] sm:text-[2.25rem] md:text-4xl lg:text-5xl leading-[1.1] text-balance">
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
          </motion.div>

        </motion.div>

        <motion.div
          style={{ opacity }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.7 }}
          className="absolute bottom-16 left-0 right-0 z-10 container-page flex flex-col items-start gap-5 md:gap-6"
        >
          <p className="max-w-[46ch] text-[0.9rem] sm:text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
            {t("hero.lede")}
          </p>
          <Link to="/artworks" className="group inline-flex items-center gap-2 bg-gradient-gold px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-primary-foreground font-medium hover:shadow-glow transition">
            Shop Collection
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
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
      <AboutArtistSection />

      {/* EVENTS */}
      <HomeEventsSection />

      {/* SUPPORTERS */}
      <section className="py-20 border-y border-border bg-card/30">
        <div className="container-page">
          <Reveal>
            <div className="text-center text-xs uppercase tracking-[0.3em] text-gold mb-8">Our Supporters</div>
          </Reveal>
          <PartnersStrip />
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
        medium={lightbox?.medium}
        sold={!!lightbox?.sold}
        canBuy={lightbox ? isArtworkPurchasable(lightbox) : false}
        inCart={lightbox ? has(lightbox.id) : false}
        onAdd={
          lightbox
            ? () => {
                const a = lightbox;
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
              }
            : undefined
        }
        onClose={() => setLightbox(null)}
      />
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

