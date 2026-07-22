import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Calendar, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TiltCard } from "@/components/ui/TiltCard";
import { Lightbox } from "@/components/site/Lightbox";

export const Route = createFileRoute("/exhibitions")({
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
  const [active, setActive] = useState<number | null>(null);

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
            <div className="space-y-6">
              {dbUpcoming.map((e, i) => {
                const d = e.event_date ? new Date(e.event_date) : null;
                const monthShort = d ? d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short" }).toUpperCase() : "TBA";
                const day = d ? String(d.getDate()).padStart(2, "0") : "—";
                const year = d ? String(d.getFullYear()) : "";
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className="group relative border border-border hover:border-gold transition-colors overflow-hidden"
                  >
                    <div className="relative grid md:grid-cols-12 gap-0 items-stretch">
                      {e.image_url && (
                        <div className="md:col-span-5 bg-background relative aspect-[4/3] md:aspect-auto md:min-h-[280px] overflow-hidden">
                          <img
                            src={e.image_url}
                            alt={`${e.title} poster`}
                            className="absolute inset-0 h-full w-full object-contain"
                          />
                        </div>
                      )}
                      <div className={`${e.image_url ? "md:col-span-7" : "md:col-span-12"} p-8 md:p-10`}>
                        <div className="flex items-baseline gap-4">
                          <div className="font-display text-4xl md:text-5xl text-gold leading-none">{monthShort} {day}</div>
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{year}</div>
                        </div>
                        <h3 className="mt-4 font-display text-3xl md:text-4xl">{e.title}</h3>
                        <div className="mt-3 flex flex-wrap gap-5 text-sm text-muted-foreground">
                          {e.time_text && <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-gold" /> {e.time_text}</span>}
                          {(e.venue || e.city) && (
                            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /> {[e.venue, e.city].filter(Boolean).join(", ")}</span>
                          )}
                        </div>
                        {e.blurb && <p className="mt-5 text-muted-foreground max-w-2xl leading-relaxed">{e.blurb}</p>}
                        {e.link_url && (
                          <a href={e.link_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm link-underline text-gold">
                            {t("ex.details")}
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {dbPastEvents.length > 0 && (
          <section className="mt-20">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-6">Past events</div>
            <div className="grid md:grid-cols-2 gap-6">
              {dbPastEvents.map((e, i) => {
                const d = e.event_date ? new Date(e.event_date) : null;
                const dateLabel = d
                  ? d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "";
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="border border-border overflow-hidden flex flex-col"
                  >
                    {e.image_url && (
                      <div className="relative aspect-[4/3] bg-background overflow-hidden">
                        <img src={e.image_url} alt={`${e.title} poster`} className="absolute inset-0 h-full w-full object-contain" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-gold">{dateLabel}</div>
                      <h3 className="mt-2 font-display text-2xl">{e.title}</h3>
                      {(e.venue || e.city) && (
                        <div className="mt-1 text-xs text-muted-foreground">{[e.venue, e.city].filter(Boolean).join(", ")}</div>
                      )}
                      {e.blurb && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{e.blurb}</p>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}


        {hasCuratedPast ? (
          dbPastGalleries.map((show, showIdx) => {
            const yearLabel = show.event_date ? new Date(show.event_date).getFullYear() : null;
            const priorCount = dbPastGalleries
              .slice(0, showIdx)
              .reduce((sum, s) => sum + (s.gallery_images?.length ?? 0), 0);
            return (
              <section key={show.id} className="mt-24">
                <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">{t("ex.gallery")}</div>
                    <h2 className="font-display text-4xl md:text-5xl">
                      {show.title}
                      {show.event_date ? (
                        <>
                          <span className="text-muted-foreground"> · </span>
                          {new Date(show.event_date).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </>
                      ) : null}
                      {(show.venue || show.city) ? (
                        <>
                          <span className="text-muted-foreground"> · </span>
                          {[show.venue, show.city].filter(Boolean).join(", ")}
                        </>
                      ) : null}
                    </h2>
                    {show.blurb && (
                      <p className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed">{show.blurb}</p>
                    )}
                  </div>
                </div>
                <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4 space-y-3 md:space-y-4 [perspective:1400px]">
                  {(show.gallery_images ?? []).map((src, i) => {
                    const flatIdx = priorCount + i;
                    const caption = (show.gallery_captions ?? [])[i] ?? "";
                    return (
                      <motion.figure
                        key={src + i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: (i % 8) * 0.05 }}
                        className="block w-full break-inside-avoid mb-3 md:mb-4"
                      >
                        <button
                          type="button"
                          onClick={() => setActive(flatIdx)}
                          className="block w-full group relative cursor-zoom-in"
                        >
                          <TiltCard max={18} scale={1.06} glare className="overflow-hidden shadow-elegant">
                            <img
                              src={src}
                              alt={caption || `${show.title} — photo ${i + 1}`}
                              loading="lazy"
                              className="w-full h-auto"
                              style={{ transform: "translateZ(0)" }}
                            />
                            <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition" style={{ transform: "translateZ(30px)" }} />
                          </TiltCard>
                        </button>
                        {caption && (
                          <figcaption className="mt-2 text-xs md:text-sm text-muted-foreground italic leading-snug px-0.5">
                            {caption}
                          </figcaption>
                        )}
                      </motion.figure>
                    );
                  })}
                </div>
              </section>
            );
          })
        ) : (
          <section className="mt-24">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">{t("ex.gallery")}</div>
                <h2 className="font-display text-5xl">Afro World Expo · 2024</h2>
              </div>
            </div>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4 space-y-3 md:space-y-4 [perspective:1400px]">
              {GALLERY.map((src, i) => (
                <motion.button
                  key={src + i}
                  onClick={() => setActive(i)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: (i % 8) * 0.05 }}
                  className="block w-full break-inside-avoid group relative cursor-zoom-in"
                >
                  <TiltCard max={18} scale={1.06} glare className="overflow-hidden shadow-elegant">
                    <img
                      src={src}
                      alt={`Exhibition moment ${i + 1}`}
                      loading="lazy"
                      className="w-full h-auto"
                      style={{ transform: "translateZ(0)" }}
                    />
                    <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition" style={{ transform: "translateZ(30px)" }} />
                  </TiltCard>
                </motion.button>
              ))}
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {active !== null && (() => {
          const list = hasCuratedPast ? pastLightboxImages : GALLERY;
          const caps = hasCuratedPast ? pastLightboxCaptions : [];
          const clamped = ((active % list.length) + list.length) % list.length;
          const caption = caps[clamped] ?? "";
          return (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <button
              onClick={() => setActive(null)}
              className="absolute top-6 right-6 grid h-12 w-12 place-items-center rounded-full border border-border hover:border-gold"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
              <motion.img
                key={clamped}
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                src={list[clamped]}
                alt={caption}
                className={`${caption ? "max-h-[78vh]" : "max-h-[86vh]"} max-w-full object-contain shadow-elegant`}
              />
              {caption && (
                <p className="mt-3 max-w-3xl text-center text-sm text-muted-foreground italic px-4">
                  {caption}
                </p>
              )}
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); setActive((clamped - 1 + list.length) % list.length); }} className="px-4 py-2 border border-border hover:border-gold text-xs uppercase tracking-[0.2em]">{t("ex.prev")}</button>
              <button onClick={(e) => { e.stopPropagation(); setActive((clamped + 1) % list.length); }} className="px-4 py-2 border border-border hover:border-gold text-xs uppercase tracking-[0.2em]">{t("ex.next")}</button>
            </div>
          </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
