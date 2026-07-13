import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ARTWORKS, isArtworkPurchasable, type Artwork } from "@/lib/artworks";
import { useCart } from "@/lib/cart";
import { TiltCard } from "@/components/ui/TiltCard";
import { Lightbox } from "@/components/site/Lightbox";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { listArtworkAvailability } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import { useIsTouch } from "@/hooks/useIsTouch";
import { useTapSwipe } from "@/hooks/useTapSwipe";

const thumb = (url: string, w = 700) => url.replace(/rs=w:\d+/, `rs=w:${w}`);

/**
 * Inquire button — same pointer-capture + pointerup trigger pattern as
 * AddToCartButton so it never loses the click inside a TiltCard on Chrome.
 */
function InquireButton({ title, label, onGo }: { title: string; label: string; onGo: () => void }) {
  const handledRef = { current: false } as { current: boolean };
  const go = () => {
    if (handledRef.current) return;
    handledRef.current = true;
    onGo();
  };
  return (
    <button
      type="button"
      aria-label={`Inquire about ${title}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.button !== undefined && e.button !== 0) return;
        try { (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId); } catch {}
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (e.button !== undefined && e.button !== 0) return;
        try { (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId); } catch {}
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && e.currentTarget.contains(target)) go();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); go(); }}
      className="relative z-20 inline-flex items-center gap-1 px-2.5 md:px-3.5 py-1.5 md:py-2 text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-semibold border border-gold text-gold hover:bg-gold hover:text-primary-foreground transition-all duration-300 cursor-pointer pointer-events-auto touch-manipulation select-none"
    >
      <Mail className="h-3 w-3" /> {label}
    </button>
  );
}

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
  const catalogOverrideMap = useMemo(() => {
    const m = new Map<string, { price_override: number | null; on_sale: boolean; sale_price: number | null }>();
    for (const r of availability?.catalogOverrides ?? []) {
      m.set(r.artwork_id, {
        price_override: r.price_override,
        on_sale: r.on_sale,
        sale_price: r.sale_price,
      });
    }
    return m;
  }, [availability]);

  const { data: customRows } = useQuery({
    queryKey: ["artworks-custom"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks_custom")
        .select("id,title,description,price,image_url,collection,medium,sold,display_order,sort_order,alt_text,created_at,on_sale,sale_price")
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
    const fromCustom: Artwork[] = (customRows ?? []).map((r) => {
      const list = Number(r.price ?? 0);
      const onSale = !!(r as any).on_sale && (r as any).sale_price != null;
      const sale = onSale ? Number((r as any).sale_price) : null;
      const effective = onSale && sale != null ? sale : list;
      return {
        id: r.id,
        title: r.title,
        image: r.image_url,
        price: effective,
        originalPrice: onSale ? list : undefined,
        onSale: onSale && sale != null && sale < list,
        sold: !!r.sold,
        collection: "Our Essence",
        medium: r.medium ?? undefined,
        description: r.description ?? undefined,
      };
    });
    const fromCatalog: Artwork[] = ARTWORKS.map((a) => {
      const ov = catalogOverrideMap.get(a.id);
      const list = ov?.price_override ?? a.price;
      const onSale = !!ov?.on_sale && ov?.sale_price != null;
      const sale = onSale ? Number(ov!.sale_price) : null;
      const effective = onSale && sale != null ? sale : list;
      return {
        ...a,
        collection: "Our Essence",
        price: effective,
        originalPrice: onSale ? list : undefined,
        onSale: onSale && sale != null && sale < list,
        sold: availableOverrideSet.has(a.id) ? false : (a.sold || soldSet.has(a.id)),
      };
    });
    const merged = [...fromCustom, ...fromCatalog];
    return merged.sort((a, b) => {
      const pa = orderMap.get(a.id) ?? 9999;
      const pb = orderMap.get(b.id) ?? 9999;
      return pa - pb;
    });
  }, [soldSet, availableOverrideSet, catalogOverrideMap, customRows, orderRows]);

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
    if (!isArtworkPurchasable(a)) {
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
        price={active?.price}
        caption={active ? active.title : undefined}
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
  const navigate = useNavigate();
  const imageInteractionProps = isTouch ? swipe : { onClick: onOpen };
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, delay: (index % 8) * 0.04 }}
      className="group"
      data-reveal={revealed}
    >
      {/* Zone 1 — Image only. Tilt effect + lightbox click stay scoped here. */}
      <TiltCard
        max={10}
        scale={1.03}
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
        <div className="relative aspect-[3/4] overflow-hidden bg-card border border-white/5 group-hover:border-gold/40 transition-colors duration-500">
          <img
            src={thumb(a.image, 800)}
            alt={a.title}
            loading="lazy"
            decoding="async"
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="h-full w-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-110"
            style={{ transform: "translateZ(0)" }}
          />

          {/* Corner accents */}
          <div className="pointer-events-none absolute top-0 right-0 w-8 h-8 md:w-10 md:h-10 border-t border-r border-gold/40 opacity-70 group-hover:opacity-100 transition-all duration-500" />
          <div className="pointer-events-none absolute bottom-0 left-0 w-8 h-8 md:w-10 md:h-10 border-b border-l border-gold/40 opacity-70 group-hover:opacity-100 transition-all duration-500" />

          {/* SALE badge (in addition to status) */}
          {!a.sold && a.onSale && (
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
              <span className="px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.25em] bg-accent text-accent-foreground font-medium">
                Sale
              </span>
            </div>
          )}
          {/* Status badge — top-right (SOLD) or top-left (Available). Sold artworks show ONLY this indicator. */}
          {a.sold ? (
            <div className="absolute top-3 right-3 z-10">
              <span className="px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.25em] bg-background/85 backdrop-blur border border-border">
                {t("art.sold")}
              </span>
            </div>
          ) : isArtworkPurchasable(a) && !a.onSale ? (
            <div className="absolute top-3 left-3 z-10">
              <span className="px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.25em] bg-gold/95 text-primary-foreground font-medium shadow-glow">
                {t("art.available")}
              </span>
            </div>
          ) : isArtworkPurchasable(a) ? null : (
            <div className="absolute top-3 right-3 z-10">
              <span className="px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-[0.25em] bg-background/85 backdrop-blur border border-gold text-gold">
                {t("art.inquire")}
              </span>
            </div>
          )}
        </div>
      </TiltCard>

      {/* Zone 2 — Info + action strip. Outside TiltCard, on card background.
          No tilt transform here, so button hit-testing is rock solid in Chrome. */}
      <div className="pt-3 pb-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-sm md:text-lg leading-tight truncate">{a.title}</div>
             {isArtworkPurchasable(a) && (
              <div className="mt-1 text-[10px] md:text-xs text-gold uppercase tracking-[0.15em]">
                {a.onSale && a.originalPrice ? (
                  <>
                    <span className="line-through text-muted-foreground mr-1.5 opacity-70">${a.originalPrice.toLocaleString()}</span>
                    <span className="text-accent">${a.price.toLocaleString()}</span> <span className="opacity-60">CAD</span>
                  </>
                ) : (
                  <>${a.price.toLocaleString()} <span className="opacity-60">CAD</span></>
                )}
              </div>
            )}
          </div>
          <div className="shrink-0">
            {!isArtworkPurchasable(a) ? (
              <InquireButton title={a.title} label={t("art.inquire")} onGo={() => navigate({ to: "/community", search: { inquiry: a.title } })} />
            ) : (
              <AddToCartButton onAdd={onAdd} inCart={inCart} label={t("feat.add")} size="sm" />
            )}
          </div>
      </div>

      {/* Blurb — reveal for touch users */}
      {revealed && (
        <p className="pb-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{blurb}</p>
      )}
    </motion.article>
  );
}
