import { Calendar, MapPin, Pencil, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { parseCalendarDate } from "@/lib/dates";

export type EventCardData = {
  id: string;
  title: string;
  venue: string | null;
  city: string | null;
  blurb: string | null;
  event_date: string | null;
  end_date?: string | null;
  time_text: string | null;
  image_url: string | null;
  link_url?: string | null;
};

/**
 * Shared compact event card used by both the public Events page and the
 * admin Events dashboard so the two views can never drift apart. Admin
 * variants get Edit/Delete controls; the size, shape, and internal layout
 * stay identical.
 */
export function EventCard({
  event,
  index = 0,
  lang = "en",
  detailsLabel,
  admin,
}: {
  event: EventCardData;
  index?: number;
  lang?: string;
  detailsLabel?: string;
  admin?: { onEdit: () => void; onDelete: () => void };
}) {
  // Parse as a local calendar date (never UTC midnight) so the day never shifts.
  const d = parseCalendarDate(event.event_date);
  const monthShort = d
    ? d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { month: "short" }).toUpperCase()
    : "TBA";
  const day = d ? String(d.getDate()).padStart(2, "0") : "—";
  const year = d ? String(d.getFullYear()) : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.05 }}
      className="group relative border border-border hover:border-gold transition-colors overflow-hidden flex flex-col"
    >
      {event.image_url && (
        <div className="relative aspect-[4/3] bg-background overflow-hidden">
          <img
            src={event.image_url}
            alt={`${event.title} poster`}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-baseline gap-2">
          <div className="font-display text-2xl text-gold leading-none">
            {monthShort} {day}
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{year}</div>
        </div>
        <h3 className="mt-2 font-display text-xl leading-tight">{event.title}</h3>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {event.time_text && (
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-gold" /> {event.time_text}
            </div>
          )}
          {(event.venue || event.city) && (
            <div className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-gold" />{" "}
              {[event.venue, event.city].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
        {event.blurb && (
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {event.blurb}
          </p>
        )}
        {!admin && event.link_url && (
          <a
            href={event.link_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-xs link-underline text-gold self-start"
          >
            {detailsLabel ?? "Details"}
          </a>
        )}
        {admin && (
          <div className="mt-4 flex gap-2 pt-3 border-t border-border">
            <button
              onClick={admin.onEdit}
              className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold transition"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={admin.onDelete}
              className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-accent hover:text-accent transition"
              aria-label="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}