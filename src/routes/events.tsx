import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Calendar, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TiltCard } from "@/components/ui/TiltCard";
import { Lightbox } from "@/components/site/Lightbox";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — art by KIYARI" },
      { name: "description", content: "Upcoming events, past shows, and a gallery of moments from art by KIYARI." },
      { property: "og:title", content: "Events — art by KIYARI" },
      { property: "og:description", content: "Where to see Kiyari's work live." },
    ],
  }),
  component: ExhibitionsPage,
});

type DbEx = {
  id: string;
  title: string;
  venue: string | null;
  city: string | null;
  blurb: string | null;
  event_date: string | null;
  end_date: string | null;
  time_text: string | null;
  image_url: string | null;
  link_url: string | null;
  status: "upcoming" | "past";
  sort_order: number;
  gallery_images: string[] | null;
  gallery_captions?: string[] | null;
};

function ExhibitionsPage() {
  const { t, lang } = useI18n();
  const [active, setActive] = useState<{ albumId: string; index: number } | null>(null);

  const { data: dbRows } = useQuery({
    queryKey: ["public", "exhibitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitions")
        .select("*")
        .order("status", { ascending: true })
        .order("event_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as DbEx[];
    },
  });

  // Auto-move upcoming events to past once their END date (fallback: start
  // date) is before today.
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPastByDate = (r: DbEx) => {
    const cmp = r.end_date || r.event_date;
    return !!cmp && cmp < todayStr;
  };
  const dbUpcoming = useMemo(
    () =>
      (dbRows ?? [])
        .filter((r) => r.status === "upcoming" && !isPastByDate(r))
        .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? "")),
    [dbRows, todayStr],
  );
  const dbPastEvents = useMemo(
    () =>
      (dbRows ?? [])
        .filter((r) => r.status === "upcoming" && isPastByDate(r))
        .sort((a, b) =>
          (b.end_date ?? b.event_date ?? "").localeCompare(a.end_date ?? a.event_date ?? ""),
        )
        .slice(0, 2),
    [dbRows, todayStr],
  );
  const dbPastGalleries = useMemo(() => {
    return (dbRows ?? [])
      .filter(
        (r) => r.status === "past" && Array.isArray(r.gallery_images) && r.gallery_images.length > 0,
      )
      .sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""));
  }, [dbRows, todayStr]);
  // Flat list of every past-show image, in gallery order, for the lightbox.
  const pastLightboxImages = useMemo(
    () => dbPastGalleries.flatMap((g) => g.gallery_images ?? []),
    [dbPastGalleries],
  );
  const pastLightboxCaptions = useMemo(
    () =>
      dbPastGalleries.flatMap((g) => {
        const caps = Array.isArray(g.gallery_captions) ? g.gallery_captions : [];
        return (g.gallery_images ?? []).map((_, i) => caps[i] ?? "");
      }),
    [dbPastGalleries],
  );
  const hasCuratedPast = dbPastGalleries.length > 0;

  const activeAlbum = active ? dbPastGalleries.find((g) => g.id === active.albumId) : null;
  const activeImages = activeAlbum?.gallery_images ?? [];
  const activeCaptions = Array.isArray(activeAlbum?.gallery_captions) ? activeAlbum!.gallery_captions! : [];
  const activeIdx = active?.index ?? 0;
  const hasPrev = active !== null && activeIdx > 0;
  const hasNext = active !== null && activeIdx < activeImages.length - 1;

  const renderEventCard = (e: DbEx, i: number) => {
    const d = e.event_date ? new Date(e.event_date) : null;
    const monthShort = d
      ? d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short" }).toUpperCase()
      : "TBA";
    const day = d ? String(d.getDate()).padStart(2, "0") : "—";
    const year = d ? String(d.getFullYear()) : "";
    return (
      <motion.div
        key={e.id}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: i * 0.05 }}
        className="group relative border border-border hover:border-gold transition-colors overflow-hidden flex flex-col"
      >
        {e.image_url && (
          <div className="relative aspect-[4/3] bg-background overflow-hidden">
            <img
              src={e.image_url}
              alt={`${e.title} poster`}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        )}
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-baseline gap-2">
            <div className="font-display text-2xl text-gold leading-none">{monthShort} {day}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{year}</div>
          </div>
          <h3 className="mt-2 font-display text-xl leading-tight">{e.title}</h3>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {e.time_text && <div className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3 text-gold" /> {e.time_text}</div>}
            {(e.venue || e.city) && (
              <div className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3 text-gold" /> {[e.venue, e.city].filter(Boolean).join(", ")}</div>
            )}
          </div>
          {e.blurb && <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-3">{e.blurb}</p>}
          {e.link_url && (
            <a href={e.link_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs link-underline text-gold self-start">
              {t("ex.details")}
            </a>
          )}
        </div>
      </motion.div>
    );
  };


  return (
    <div className="pt-32 pb-20">
      <div className="container-page">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-4">{t("ex.kicker")}</div>
          <h1 className="font-display text-6xl md:text-8xl leading-[0.95]">
            {t("ex.title1")}<br />
            <span className="italic text-gradient-gold">{t("ex.title2")}</span>
          </h1>
        </div>

        {dbUpcoming.length > 0 && (
          <section className="mt-20">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-6">{t("ex.upcoming")}</div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {dbUpcoming.map((e, i) => renderEventCard(e, i))}
            </div>
          </section>
        )}

        {dbPastEvents.length > 0 && (
          <section className="mt-20">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-6">Past events</div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {dbPastEvents.map((e, i) => renderEventCard(e, i))}
            </div>
          </section>
        )}


        {hasCuratedPast && (
          <div className="mt-24 space-y-20">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">{t("ex.gallery")}</div>
              <h2 className="font-display text-4xl md:text-5xl">Albums</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">Each show has its own album below. Click any photo to view it full-size.</p>
            </div>
            {dbPastGalleries.map((show, showIdx) => {
            return (
              <section key={show.id} className="relative">
                <div className="mb-6 border-l-2 border-gold/60 pl-4">
                  <h3 className="font-display text-2xl md:text-3xl leading-tight">{show.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {show.event_date && (
                      <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3 text-gold" />{new Date(show.event_date).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                    )}
                    {show.time_text && <span className="normal-case tracking-normal text-muted-foreground">· {show.time_text}</span>}
                    {(show.venue || show.city) && (
                      <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3 text-gold" />{[show.venue, show.city].filter(Boolean).join(", ")}</span>
                    )}
                  </div>
                  {show.blurb && (
                    <p className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed normal-case">{show.blurb}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 [perspective:1400px]">
                  {(show.gallery_images ?? []).map((src, i) => {
                    const caption = (show.gallery_captions ?? [])[i] ?? "";
                    return (
                      <motion.figure
                        key={src + i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: (i % 8) * 0.05 }}
                        className="block w-full"
                      >
                        <button
                          type="button"
                          onClick={() => setActive({ albumId: show.id, index: i })}
                          className="block w-full group relative cursor-zoom-in overflow-hidden"
                        >
                          <TiltCard max={12} scale={1.04} glare className="overflow-hidden shadow-elegant aspect-square">
                            <img
                              src={src}
                              alt={caption || `${show.title} — photo ${i + 1}`}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              style={{ transform: "translateZ(0)" }}
                            />
                            {caption && (
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/70 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition" style={{ transform: "translateZ(30px)" }}>
                                <p className="text-[11px] md:text-xs text-foreground leading-snug line-clamp-3">{caption}</p>
                              </div>
                            )}
                          </TiltCard>
                        </button>
                        {caption && (
                          <figcaption className="mt-2 text-[11px] md:text-xs text-muted-foreground italic leading-snug px-0.5">
                            {caption}
                          </figcaption>
                        )}
                      </motion.figure>
                    );
                  })}
                </div>
              </section>
            );
            })}
          </div>
        )}
      </div>

      {(() => {
        if (!active || !activeAlbum || activeImages.length === 0) return null;
        return (
          <Lightbox
            open={true}
            src={activeImages[activeIdx] ?? null}
            alt={activeCaptions[activeIdx] || ""}
            caption={activeCaptions[activeIdx] || undefined}
            prevSrc={hasPrev ? activeImages[activeIdx - 1] : null}
            nextSrc={hasNext ? activeImages[activeIdx + 1] : null}
            onClose={() => setActive(null)}
            onPrev={hasPrev ? () => setActive({ albumId: active.albumId, index: activeIdx - 1 }) : undefined}
            onNext={hasNext ? () => setActive({ albumId: active.albumId, index: activeIdx + 1 }) : undefined}
          />
        );
      })()}
    </div>
  );
}
