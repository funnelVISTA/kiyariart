import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, MapPin, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/exhibitions")({
  head: () => ({
    meta: [
      { title: "Exhibitions — art by KIYARI" },
      { name: "description", content: "Upcoming exhibitions, past shows, and a gallery of moments from art by KIYARI." },
      { property: "og:title", content: "Exhibitions — art by KIYARI" },
      { property: "og:description", content: "Where to see Kiyari's work live." },
    ],
  }),
  component: ExhibitionsPage,
});

const GALLERY = [
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE7.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE20.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE10.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE8.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE2.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE13.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE14.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE12.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE16.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE6.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE4.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE11.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE19.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE17.jpg/:/rs=w:1200",
  "https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/AWE15.jpg/:/rs=w:1200",
];

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

  const dbUpcoming = useMemo(() => (dbRows ?? []).filter((r) => r.status === "upcoming"), [dbRows]);
  const dbPast = useMemo(() => (dbRows ?? []).filter((r) => r.status === "past"), [dbRows]);


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

        <section className="mt-20">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-6">{t("ex.upcoming")}</div>
          <div className="space-y-6">
            {UPCOMING.map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="group relative border border-border p-8 md:p-12 hover:border-gold transition-colors"
              >
                <div className="grid md:grid-cols-12 gap-8 items-start">
                  <div className="md:col-span-3">
                    <div className="font-display text-5xl text-gold leading-none">{e.monthShort}<br />{e.day}</div>
                    <div className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{e.year}</div>
                  </div>
                  <div className="md:col-span-9">
                    <h3 className="font-display text-4xl">{e.title}</h3>
                    <div className="mt-3 flex flex-wrap gap-5 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-gold" /> {e.time}</span>
                      <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /> {e.venue}</span>
                    </div>
                    <p className="mt-5 text-muted-foreground max-w-2xl leading-relaxed">{e.blurb}</p>
                    <button className="mt-6 inline-flex items-center gap-2 text-sm link-underline text-gold">{t("ex.details")}</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-24">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-6">{t("ex.past")}</div>
          <div className="grid md:grid-cols-3 gap-6">
            {PAST.map((p) => (
              <div key={p.en} className="border border-border p-8 hover:border-gold transition group">
                <div className="font-display text-2xl group-hover:text-gold transition">{p[lang]}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Vancouver, BC</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">{t("ex.gallery")}</div>
              <h2 className="font-display text-5xl">Afro World Expo · 2024</h2>
            </div>
          </div>

          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4 space-y-3 md:space-y-4">
            {GALLERY.map((src, i) => (
              <motion.button
                key={src + i}
                onClick={() => setActive(i)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: (i % 8) * 0.05 }}
                className="block w-full break-inside-avoid overflow-hidden group relative cursor-zoom-in"
              >
                <img
                  src={src}
                  alt={`Exhibition moment ${i + 1}`}
                  loading="lazy"
                  className="w-full h-auto transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-background/0 group-hover:bg-background/30 transition" />
              </motion.button>
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {active !== null && (
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
            <motion.img
              key={active}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              src={GALLERY[active]}
              alt=""
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-[90vw] object-contain shadow-elegant"
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); setActive((active - 1 + GALLERY.length) % GALLERY.length); }} className="px-4 py-2 border border-border hover:border-gold text-xs uppercase tracking-[0.2em]">{t("ex.prev")}</button>
              <button onClick={(e) => { e.stopPropagation(); setActive((active + 1) % GALLERY.length); }} className="px-4 py-2 border border-border hover:border-gold text-xs uppercase tracking-[0.2em]">{t("ex.next")}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
