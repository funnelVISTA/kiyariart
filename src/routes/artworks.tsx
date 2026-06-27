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
import { listSoldArtworkIds } from "@/lib/payments.functions";
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
  const { data: soldIds } = useQuery({
    queryKey: ["sold-artworks"],
    queryFn: () => listSoldArtworkIds(),
    staleTime: 60_000,
  });
  const soldSet = useMemo(() => new Set(soldIds ?? []), [soldIds]);
  const catalog = useMemo<Artwork[]>(
    () => ARTWORKS.map((a) => (soldSet.has(a.id) ? { ...a, sold: true } : a)),
    [soldSet],
  );

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
