import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ARTWORKS, type Artwork } from "@/lib/artworks";
import { useCart } from "@/lib/cart";
import { TiltCard } from "@/components/ui/TiltCard";
import { Lightbox } from "@/components/site/Lightbox";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { listArtworkAvailability } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import { useIsTouch } from "@/hooks/useIsTouch";
import { useTapSwipe } from "@/hooks/useTapSwipe";

const thumb = (url: string, w = 700) => url.replace(/rs=w:\d+/, `rs=w:${w}`);

export const Route = createFileRoute("/artworks")({
  head: () => ({
    meta: [
      { title: "Artworks — art by KIYARI" },
      { name: "description", content: "Shop original mixed-media paintings by Kiyari. One-of-a-kind, culturally guided, textured fine art." },
      { property: "og:title", content: "Artworks — art by KIYARI" },
      { property: "og:description", content: "Original mixed-media paintings, one of a kind." },
    ],
  }),
  component: ArtworksPage,
});

type Filter = "all" | "available" | "sold";

function ArtworksPage() {
  const { t } = useI18n();
  const isTouch = useIsTouch();
  const [filter, setFilter] = useState<Filter>("all");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const { add, has } = useCart();

  const { data: availability } = useQuery({
    queryKey: ["artwork-availability"],
    queryFn: () => listArtworkAvailability(),
    staleTime: 60_000,
  });
  const soldSet = useMemo(() => new Set(availability?.soldIds ?? []), [availability]);
  const availableOverrideSet = useMemo(
    () => new Set(availability?.availableOverrideIds ?? []),
    [availability],
  );

  const { data: customRows } = useQuery({
    queryKey: ["artworks-custom"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks_custom")
        .select("id,title,description,price,image_url,collection,medium,sold,display_order,sort_order,alt_text,created_at")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: orderRows } = useQuery({
    queryKey: ["artwork-display-order"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artwork_display_order")
        .select("artwork_id,position");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const catalog = useMemo<Artwork[]>(() => {
    const orderMap = new Map<string, number>((orderRows ?? []).map((r) => [r.artwork_id, r.position]));
    const fromCustom: Artwork[] = (customRows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      image: r.image_url,
      price: Number(r.price ?? 0),
      sold: !!r.sold,
      collection: "Our Essence",
      medium: r.medium ?? undefined,
      description: r.description ?? undefined,
    }));
    const fromCatalog: Artwork[] = ARTWORKS.map((a) => ({
      ...a,
      collection: "Our Essence",
      sold: availableOverrideSet.has(a.id) ? false : (a.sold || soldSet.has(a.id)),
    }));
    const merged = [...fromCustom, ...fromCatalog];
    return merged.sort((a, b) => {
      const pa = orderMap.get(a.id) ?? 9999;
      const pb = orderMap.get(b.id) ?? 9999;
      return pa - pb;
    });
  }, [soldSet, customRows, orderRows]);

  const blurb = (a: Artwork) => {
    if (a.description) return a.description;
    return `${a.title} — ${t("artworks.blurb.essence")}`;
  };

  const items = useMemo(() => {
    return catalog.filter((a) => {
      if (filter === "available") return !a.sold;
      if (filter === "sold") return a.sold;
      return true;
    });
  }, [filter, catalog]);

  const handleAdd = (a: Artwork) => {
    if (a.sold) {
      toast.error(t("art.soldToast"), { description: t("art.soldDesc") });
      return;
    }
    if (has(a.id)) {
      toast.info(`${a.title} — already in your cart`);
      return;
    }
    add(a);
    toast.success(`${a.title} ${t("art.addedToast")}`, { description: t("art.addedDesc") });
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("artworks.filter.all") },
    { id: "available", label: t("artworks.filter.available") },
    { id: "sold", label: t("artworks.filter.sold") },
  ];

  const active = activeIdx !== null ? items[activeIdx] : null;

  return (
    <div className="pt-32 pb-20">
      <div className="container-page">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-4">{t("artworks.kicker")}</div>
          <h1 className="font-display text-6xl md:text-8xl leading-[0.95]">
            {t("artworks.title1")}<br />
            <span className="italic text-gradient-gold">{t("artworks.title2")}</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">{t("artworks.lede")}</p>
        </div>

        <div className="mt-12 flex flex-wrap gap-2 border-b border-border pb-6">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`relative px-5 py-2 text-xs uppercase tracking-[0.2em] transition ${
                filter === f.id ? "text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter === f.id && (
                <motion.span
                  layoutId="filter-pill"
                  className="absolute inset-0 border border-gold bg-gold/5"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          ))}
        </div>

        <motion.div layout className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 [perspective:1500px]">
          <AnimatePresence mode="popLayout">
            {items.map((a, i) => (
              <ArtCard
                key={a.id}
                a={a}
                index={i}
                isTouch={isTouch}
                revealed={revealedId === a.id}
                inCart={has(a.id)}
                onToggleReveal={() => setRevealedId(revealedId === a.id ? null : a.id)}
                onOpen={() => setActiveIdx(i)}
                onAdd={() => handleAdd(a)}
                blurb={blurb(a)}
                t={t}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <Lightbox
        open={active !== null}
        src={active?.image ?? null}
        alt={active?.title}
        title={active?.title}
        description={active ? blurb(active) : undefined}
        caption={active ? `${active.title} · ${active.collection}${active.price > 0 ? ` · $${active.price.toLocaleString()} CAD` : ""}` : undefined}
        onClose={() => setActiveIdx(null)}
        onPrev={activeIdx !== null && items.length > 1 ? () => setActiveIdx((activeIdx - 1 + items.length) % items.length) : undefined}
        onNext={activeIdx !== null && items.length > 1 ? () => setActiveIdx((activeIdx + 1) % items.length) : undefined}
      />
    </div>
  );
}

type ArtCardProps = {
  a: Artwork;
  index: number;
  isTouch: boolean;
  revealed: boolean;
  inCart: boolean;
  onToggleReveal: () => void;
  onOpen: () => void;
  onAdd: () => void;
  blurb: string;
  t: (k: string) => string;
};

function ArtCard({ a, index, isTouch, revealed, inCart, onToggleReveal, onOpen, onAdd, blurb, t }: ArtCardProps) {
  const swipe = useTapSwipe({ onTap: onOpen, onSwipe: onToggleReveal });
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, delay: (index % 8) * 0.04 }}
      className="group cursor-pointer"
      data-reveal={revealed}
      {...(isTouch ? swipe : { onClick: onOpen })}
    >
      <TiltCard max={10} scale={1.03} className="relative">
        <div className="relative aspect-[3/4] overflow-hidden bg-card border border-white/5 group-hover:border-gold/40 transition-colors duration-500">
          {/* Image with slow ken-burns zoom */}
          <img
            src={thumb(a.image, 800)}
            alt={a.title}
            loading="lazy"
            decoding="async"
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="h-full w-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-110 group-data-[reveal=true]:scale-105"
            style={{ transform: "translateZ(0)" }}
          />

          {/* Corner accent — top-right */}
          <div className="pointer-events-none absolute top-0 right-0 w-8 h-8 md:w-10 md:h-10 border-t border-r border-gold/40 opacity-70 group-hover:opacity-100 group-hover:w-12 group-hover:h-12 transition-all duration-500" style={{ transform: "translateZ(40px)" }} />
          <div className="pointer-events-none absolute bottom-0 left-0 w-8 h-8 md:w-10 md:h-10 border-b border-l border-gold/40 opacity-70 group-hover:opacity-100 group-hover:w-12 group-hover:h-12 transition-all duration-500" style={{ transform: "translateZ(40px)" }} />

          {/* Status badge */}
          <div className="absolute top-3 left-3 z-10" style={{ transform: "translateZ(40px)" }}>
            {a.sold ? (
              <span className="px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.25em] bg-background/85 backdrop-blur border border-border">
                {t("art.sold")}
              </span>
            ) : (
              <span className="px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.25em] bg-gold/95 text-primary-foreground font-medium shadow-glow">
                {t("art.available")}
              </span>
            )}
          </div>

          {/* Immersive info overlay — always dark gradient, content slides up on hover/reveal */}
          <div
            className="absolute inset-0 flex flex-col justify-end p-3 md:p-5 z-[5] bg-gradient-to-t from-background via-background/50 to-transparent md:from-background/95 md:via-background/20 md:to-transparent transition-opacity duration-500"
            style={{ transform: "translateZ(30px)" }}
          >
            {/* Title — always visible, strong contrast against any image */}
            <div className="mt-1 font-display text-base md:text-2xl leading-tight text-foreground font-semibold drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {a.title}
            </div>

            {/* Blurb — hidden on mobile, revealed on hover/reveal */}
            <p className="hidden md:block mt-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-2 max-h-0 opacity-0 group-hover:max-h-16 group-hover:opacity-100 group-data-[reveal=true]:max-h-16 group-data-[reveal=true]:opacity-100 overflow-hidden transition-all duration-500">
              {blurb}
            </p>

            {/* Price + CTA row */}
            <div className="mt-2 md:mt-4 flex items-center justify-between gap-2 translate-y-1 md:translate-y-2 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0 group-data-[reveal=true]:opacity-100 group-data-[reveal=true]:translate-y-0 transition-all duration-500 pointer-events-auto">
              {a.sold ? (
                <div className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-[0.2em]">
                  {t("art.sold")}
                </div>
              ) : (
                <div className="text-xs md:text-sm font-medium text-gold">
                  {a.price > 0 ? `$${a.price.toLocaleString()} ` : t("art.inquire")}
                  {a.price > 0 && <span className="text-[9px] opacity-60">CAD</span>}
                </div>
              )}
              {a.sold ? (
                <Link
                  to="/community"
                  search={{ inquiry: a.title }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Inquire about ${a.title}`}
                  className="inline-flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-semibold border border-gold text-gold hover:bg-gold hover:text-primary-foreground transition-all duration-300"
                >
                  <Mail className="h-3 w-3" /> {t("art.inquire")}
                </Link>
              ) : (
              <button
                onPointerDown={(e) => { e.stopPropagation(); }}
                onMouseDown={(e) => { e.stopPropagation(); }}
                onTouchStart={(e) => { e.stopPropagation(); }}
                onTouchEnd={(e) => { e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAdd(); }}
                disabled={inCart}
                aria-label={inCart ? "In cart" : t("feat.add")}
                className={`inline-flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-semibold transition-all duration-300 ${
                  inCart
                    ? "border border-gold text-gold cursor-default"
                    : "bg-gradient-gold text-primary-foreground hover:shadow-glow active:scale-95"
                }`}
              >
                {inCart ? (
                  <><Check className="h-3 w-3" /> In cart</>
                ) : (
                  <><Plus className="h-3 w-3" /> {t("feat.add")}</>
                )}
              </button>
              )}
            </div>

            {/* Touch hint */}
            {isTouch && !revealed && (
              <div className="absolute top-3 right-14 px-2 py-1 text-[8px] uppercase tracking-[0.2em] bg-background/70 backdrop-blur border border-border/60 rounded-full opacity-70 transition z-10 pointer-events-none">
                ← {t("art.swipe") || "swipe"}
              </div>
            )}
          </div>
        </div>
      </TiltCard>
    </motion.article>
  );
}
