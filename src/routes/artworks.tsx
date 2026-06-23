import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, X } from "lucide-react";
import { ARTWORKS, type Artwork } from "@/lib/artworks";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

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
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<Artwork | null>(null);
  const { add } = useCart();

  const items = useMemo(() => {
    return ARTWORKS.filter((a) => {
      if (filter === "available") return !a.sold;
      if (filter === "sold") return a.sold;
      if (filter === "essence") return a.collection === "Our Essence";
      if (filter === "legends") return a.collection === "The Legends";
      return true;
    });
  }, [filter]);

  const handleAdd = (a: Artwork) => {
    if (a.sold) {
      toast.error("This piece is sold", { description: "Reach out to commission something similar." });
      return;
    }
    add(a);
    toast.success(`${a.title} added`, { description: "Open cart to request an invoice." });
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "available", label: "Available" },
    { id: "essence", label: "Our Essence" },
    { id: "legends", label: "Legends" },
    { id: "sold", label: "Archive" },
  ];

  return (
    <div className="pt-32 pb-20">
      <div className="container-page">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-4">The collection</div>
          <h1 className="font-display text-6xl md:text-8xl leading-[0.95]">
            Originals,<br />
            <span className="italic text-gradient-gold">one of one.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            Each piece is hand-made with acrylic, oil, and a wandering palette of textures.
            Add a painting to your cart to request an invoice — Kiyari personally confirms each sale.
          </p>
        </div>

        {/* Filters */}
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

        {/* Grid */}
        <motion.div layout className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          <AnimatePresence mode="popLayout">
            {items.map((a, i) => (
              <motion.article
                layout
                key={a.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, delay: (i % 8) * 0.04 }}
                className="group"
              >
                <div
                  onClick={() => setActive(a)}
                  className="relative aspect-[4/5] overflow-hidden cursor-zoom-in bg-card"
                >
                  <img
                    src={a.image}
                    alt={a.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent opacity-70 group-hover:opacity-90 transition" />
                  {a.sold && (
                    <div className="absolute top-3 left-3 px-3 py-1 text-[10px] uppercase tracking-[0.2em] bg-background/80 backdrop-blur border border-border">
                      Sold
                    </div>
                  )}
                  {!a.sold && (
                    <div className="absolute top-3 left-3 px-3 py-1 text-[10px] uppercase tracking-[0.2em] bg-gold/90 text-primary-foreground">
                      Available
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-xl leading-tight">{a.title}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {a.collection}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm ${a.sold ? "text-muted-foreground line-through" : "text-gold"}`}>
                      {a.price > 0 ? `$${a.price.toLocaleString()}` : "Inquire"}
                    </div>
                    <button
                      onClick={() => handleAdd(a)}
                      disabled={a.sold}
                      className={`mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] border transition ${
                        a.sold
                          ? "border-border text-muted-foreground cursor-not-allowed"
                          : "border-gold text-gold hover:bg-gold hover:text-primary-foreground"
                      }`}
                    >
                      {a.sold ? <><Check className="h-3 w-3" /> Sold</> : <><Plus className="h-3 w-3" /> Add</>}
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Lightbox */}
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
                  {active.price > 0 ? `$${active.price.toLocaleString()} CAD` : "Price on request"}
                </div>
                {active.description && (
                  <p className="mt-6 text-muted-foreground">{active.description}</p>
                )}
                <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
                  Acrylic, oil & mixed media on canvas. Signed by the artist.
                  Each piece is unique and ships fully insured from Vancouver, BC.
                </p>
                <button
                  onClick={() => { handleAdd(active); setActive(null); }}
                  disabled={active.sold}
                  className={`mt-8 inline-flex items-center justify-center gap-3 px-8 py-4 text-sm uppercase tracking-[0.2em] transition ${
                    active.sold
                      ? "border border-border text-muted-foreground cursor-not-allowed"
                      : "bg-gradient-gold text-primary-foreground hover:shadow-glow"
                  }`}
                >
                  {active.sold ? "Sold" : "Add to cart"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
