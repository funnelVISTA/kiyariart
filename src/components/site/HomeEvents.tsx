import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "@/components/ui/Reveal";
import { EventCard, type EventCardData } from "@/components/site/EventCard";

type DbEx = EventCardData & {
  status: "upcoming" | "past";
  gallery_images: string[] | null;
};

/**
 * Homepage Events section. Reads from the SAME query/source as the public
 * Events page (`public/exhibitions`) so admin changes reflect automatically.
 * Shows up to 3 upcoming events, or falls back to the 3 most recent past
 * events when there are none upcoming — never a mix.
 */
export function HomeEventsSection() {
  const { t, lang } = useI18n();

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

  // Same date rule as the Events page: an event is past once its end date
  // (fallback: start date) is before today. Plain string compare on the
  // YYYY-MM-DD values avoids timezone off-by-one.
  const todayStr = new Date().toISOString().slice(0, 10);
  const { items, heading } = useMemo(() => {
    const rows = dbRows ?? [];
    const isPastByDate = (r: DbEx) => {
      const cmp = r.end_date || r.event_date;
      return !!cmp && cmp < todayStr;
    };
    const upcoming = rows
      .filter((r) => r.status === "upcoming" && !isPastByDate(r))
      .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""))
      .slice(0, 3);
    if (upcoming.length > 0) return { items: upcoming, heading: "Upcoming Events" };
    const past = rows
      .filter((r) => r.status === "past" || isPastByDate(r))
      .sort((a, b) =>
        (b.end_date ?? b.event_date ?? "").localeCompare(a.end_date ?? a.event_date ?? ""),
      )
      .slice(0, 3);
    return { items: past, heading: "Past Events" };
  }, [dbRows, todayStr]);

  if (items.length === 0) return null;

  return (
    <section className="py-24 container-page">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <Reveal>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Events</div>
          </Reveal>
          <Reveal>
            <h2 className="font-display text-4xl md:text-6xl">{heading}</h2>
          </Reveal>
        </div>
        <Link to="/events" className="inline-flex items-center gap-2 text-sm link-underline">
          View all events <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((e) => {
          const dateLabel = e.event_date
            ? new Date(`${e.event_date}T12:00:00`).toLocaleDateString(
                lang === "fr" ? "fr-FR" : "en-US",
                { month: "long", day: "numeric", year: "numeric" },
              )
            : "Date to be announced";
          const place = [e.venue, e.city].filter(Boolean).join(", ");
          return (
            <li key={e.id}>
              <Link
                to="/events"
                className="group flex items-center justify-between gap-6 py-6 transition-colors hover:bg-card/40"
              >
                <div className="min-w-0">
                  <div className="font-display text-2xl md:text-3xl leading-tight group-hover:text-gold transition-colors break-words">
                    {e.title}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {dateLabel}
                    {e.time_text ? ` · ${e.time_text}` : ""}
                  </div>
                  {place && (
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {place}
                    </div>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-gold transition-colors" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
