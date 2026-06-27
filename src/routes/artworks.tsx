import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, X, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ARTWORKS, type Artwork } from "@/lib/artworks";
import { useCart } from "@/lib/cart";
import { TiltCard } from "@/components/ui/TiltCard";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { listArtworkAvailability } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import { useIsTouch } from "@/hooks/useIsTouch";
import { useTapSwipe } from "@/hooks/useTapSwipe";

// Swap wsimg width param to request smaller thumbnails (perf).
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

type Filter = "all" | "available" | "sold" | "essence" | "legends";

function ArtworksPage() {
  const { t } = useI18n();
  const isTouch = useIsTouch();
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<Artwork | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const { add } = useCart();

  // Overlay live "sold" state from the database on top of the static catalog
  // so artworks paid for via Stripe automatically appear as Sold.
  const { data: availability } = useQuery({
    queryKey: ["artwork-availability"],
    queryFn: () => listArtworkAvailability(),
    staleTime: 60_000,
  });
  const soldSet = useMemo(() => new Set(availability?.soldIds ?? []), [availability]);

  // Admin-uploaded artworks (live, additive to hardcoded catalog).
  const { data: customRows } = useQuery({
    queryKey: ["artworks-custom"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks_custom")
        .select("id,title,description,price,image_url,collection,medium,sold,sort_order,created_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const catalog = useMemo<Artwork[]>(() => {
    const fromCustom: Artwork[] = (customRows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      image: r.image_url,
      price: Number(r.price ?? 0),
      sold: !!r.sold,
      collection: (r.collection === "The Legends" ? "The Legends" : "Our Essence"),
      medium: r.medium ?? undefined,
      description: r.description ?? undefined,
    }));
    const fromCatalog: Artwork[] = ARTWORKS.map((a) => ({
      ...a,
      sold: a.sold || soldSet.has(a.id),
    }));
    return [...fromCustom, ...fromCatalog];
  }, [soldSet, customRows]);

  const blurb = (a: Artwork) => {
    if (a.description) return a.description;
    if (a.collection === "The Legends") return `${a.title} ${t("artworks.blurb.legend")}`;
    return `${a.title} — ${t("artworks.blurb.essence")}`;
  };

  const items = useMemo(() => {
    return catalog.filter((a) => {
      if (filter === "available") return !a.sold;
      if (filter === "sold") return a.sold;
      if (filter === "essence") return a.collection === "Our Essence";
      if (filter === "legends") return a.collection === "The Legends";
      return true;
    });
  }, [filter, catalog]);


  const handleAdd = (a: Artwork) => {
    if (a.sold) {
      toast.error(t("art.soldToast"), { description: t("art.soldDesc") });
      return;
    }
    add(a);
    toast.success(`${a.title} ${t("art.addedToast")}`, { description: t("art.addedDesc") });
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("artworks.filter.all") },
    { id: "available", label: t("artworks.filter.available") },
    { id: "essence", label: t("artworks.filter.essence") },
    { id: "legends", label: t("artworks.filter.legends") },
    { id: "sold", label: t("artworks.filter.sold") },
  ];

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
              className={`px-5 py-2 text-xs uppercase tracking-[0.2em] border transition ${
                filter === f.id
                  ? "border-gold text-gold bg-gold/5"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <motion.div layout className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 [perspective:1500px]">
          <AnimatePresence mode="popLayout">
            {items.map((a, i) => (
              <ArtCard
                key={a.id}
                a={a}
                index={i}
                isTouch={isTouch}
                revealed={revealedId === a.id}
                onToggleReveal={() => setRevealedId(revealedId === a.id ? null : a.id)}
                onOpen={() => setActive(a)}
                onAdd={() => handleAdd(a)}
                blurb={blurb(a)}
                t={t}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>


      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          >
            <button
              onClick={() => setActive(null)}
              className="absolute top-6 right-6 grid h-12 w-12 place-items-center rounded-full border border-border hover:border-gold"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="grid md:grid-cols-2 gap-8 max-w-6xl w-full max-h-full"
            >
              <img src={active.image} alt={active.title} className="w-full max-h-[80vh] object-contain" />
              <div className="flex flex-col justify-center">
                <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">{active.collection}</div>
                <h2 className="font-display text-5xl md:text-6xl">{active.title}</h2>
                <div className="mt-4 text-2xl text-gold">
                  {active.price > 0 ? `$${active.price.toLocaleString()} CAD` : t("art.priceOnRequest")}
                </div>
                <p className="mt-6 text-muted-foreground">{blurb(active)}</p>
                <p className="mt-6 text-sm text-muted-foreground leading-relaxed">{t("artworks.details")}</p>
                <button
                  onClick={() => { handleAdd(active); setActive(null); }}
                  disabled={active.sold}
                  className={`mt-8 inline-flex items-center justify-center gap-3 px-8 py-4 text-sm uppercase tracking-[0.2em] transition ${
                    active.sold
                      ? "border border-border text-muted-foreground cursor-not-allowed"
                      : "bg-gradient-gold text-primary-foreground hover:shadow-glow"
                  }`}
                >
                  {active.sold ? t("art.sold") : t("art.addToCart")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type ArtCardProps = {
  a: Artwork;
  index: number;
  isTouch: boolean;
  revealed: boolean;
  onToggleReveal: () => void;
  onOpen: () => void;
  onAdd: () => void;
  blurb: string;
  t: (k: string) => string;
};

function ArtCard({ a, index, isTouch, revealed, onToggleReveal, onOpen, onAdd, blurb, t }: ArtCardProps) {
  const swipe = useTapSwipe({ onTap: onOpen, onSwipe: onToggleReveal });
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, delay: (index % 8) * 0.04 }}
      className="group"
      data-reveal={revealed}
      {...(isTouch ? swipe : { onClick: onOpen })}
    >
      <TiltCard max={12} scale={1.04} glare className="relative">
        <div className="relative aspect-[4/5] overflow-hidden bg-card">
          <img
            src={thumb(a.image, 700)}
            alt={a.title}
            loading="lazy"
            decoding="async"
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
            style={{ transform: "translateZ(0)" }}
          />
          {a.sold ? (
            <div className="absolute top-3 left-3 px-3 py-1 text-[10px] uppercase tracking-[0.2em] bg-background/80 backdrop-blur border border-border z-10" style={{ transform: "translateZ(40px)" }}>
              {t("art.sold")}
            </div>
          ) : (
            <div className="absolute top-3 left-3 flex flex-col gap-1 z-10" style={{ transform: "translateZ(40px)" }}>
              <span className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] bg-gold/90 text-primary-foreground">
                {t("art.available")}
              </span>
              {typeof (a as any).unitsLeft === "number" && (a as any).unitsLeft > 1 && (
                <span className="px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] bg-background/80 backdrop-blur border border-border self-start">
                  {(a as any).unitsLeft} left
                </span>
              )}
              {typeof (a as any).unitsLeft === "number" && (a as any).unitsLeft === 1 && (
                <span className="px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] bg-accent/80 text-background self-start">
                  Last one
                </span>
              )}
            </div>
          )}

          <button
            aria-label="Zoom"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-border bg-background/60 backdrop-blur opacity-100 md:opacity-0 md:group-hover:opacity-100 transition z-10"
            style={{ transform: "translateZ(40px)" }}
          >
            <Search className="h-4 w-4" />
          </button>

          {isTouch && (
            <div
              className="absolute bottom-3 right-3 px-2 py-1 text-[9px] uppercase tracking-[0.2em] bg-background/70 backdrop-blur border border-border/60 rounded-full opacity-80 group-data-[reveal=true]:opacity-0 transition z-10 pointer-events-none"
              style={{ transform: "translateZ(40px)" }}
            >
              ← {t("art.swipe") || "swipe"}
            </div>
          )}

          <div
            className="absolute inset-x-0 bottom-0 p-4 md:p-5 bg-gradient-to-t from-background via-background/90 to-transparent translate-y-full group-hover:translate-y-0 group-data-[reveal=true]:translate-y-0 transition-transform duration-500 ease-out pointer-events-none group-data-[reveal=true]:pointer-events-auto md:group-hover:pointer-events-auto"
            style={{ transform: "translateZ(60px)" }}
          >
            <div className="font-display text-lg md:text-xl leading-tight">{a.title}</div>
            <p className="mt-1.5 text-[11px] md:text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {blurb}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className={`text-xs ${a.sold ? "text-muted-foreground line-through" : "text-gold"}`}>
                {a.price > 0 ? `$${a.price.toLocaleString()} CAD` : t("art.inquire")}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                disabled={a.sold}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.2em] border transition ${
                  a.sold
                    ? "border-border text-muted-foreground cursor-not-allowed"
                    : "border-gold text-gold hover:bg-gold hover:text-primary-foreground"
                }`}
              >
                {a.sold ? <><Check className="h-3 w-3" /> {t("art.sold")}</> : <><Plus className="h-3 w-3" /> {t("feat.add")}</>}
              </button>
            </div>
          </div>
        </div>
      </TiltCard>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg leading-tight">{a.title}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {a.collection}
          </div>
        </div>
        <div className={`text-sm shrink-0 ${a.sold ? "text-muted-foreground line-through" : "text-gold"}`}>
          {a.price > 0 ? `$${a.price.toLocaleString()}` : t("art.inquire")}
        </div>
      </div>
    </motion.article>
  );
}

