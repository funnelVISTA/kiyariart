import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, ImagePlus, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { EventCard } from "@/components/site/EventCard";
import {
  adminListExhibitions,
  adminUpsertExhibition,
  adminDeleteExhibition,
  adminUploadImage,
} from "@/lib/admin-content.functions";
import { formatCalendarDate, todayCalendarDate } from "@/lib/dates";
import {
  buildTimeText,
  isCompleteTime,
  parseTimeText,
  type TimeParts,
} from "@/lib/event-time";
import { compressImage, blobToBase64 } from "@/lib/image-upload";

const MAX_GALLERY_BATCH = 20;

const todayISO = todayCalendarDate;

export const Route = createFileRoute("/_authenticated/admin/events")({
  head: () => ({ meta: [{ title: "Events — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminExhibitionsPage,
});

type Row = {
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

function AdminExhibitionsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ row: Partial<Row>; mode: "event" | "media" } | null>(null);

  const q = useQuery({
    queryKey: ["admin", "exhibitions"],
    queryFn: () => adminListExhibitions(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "exhibitions"] });

  const onDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await adminDeleteExhibition({ data: { id } });
      toast.success("Deleted");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  const rows = ((q.data?.exhibitions ?? []) as Row[]).map((r) => ({
    ...r,
    gallery_images: Array.isArray(r.gallery_images) ? r.gallery_images : [],
    gallery_captions: Array.isArray(r.gallery_captions) ? r.gallery_captions : [],
  }));
  const today = todayISO();
  // "Event" rows = status upcoming. Split by end date (fall back to event_date).
  const eventRows = rows.filter((r) => r.status === "upcoming");
  const isPastByDate = (r: Row) => {
    const cmp = r.end_date || r.event_date;
    return !!cmp && cmp < today;
  };
  const upcoming = eventRows
    .filter((r) => !isPastByDate(r))
    .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const past = eventRows
    .filter(isPastByDate)
    .sort((a, b) => (b.end_date ?? b.event_date ?? "").localeCompare(a.end_date ?? a.event_date ?? ""))
    .slice(0, 4);
  const media = rows
    .filter((r) => r.status === "past")
    .sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""));

  const startNew = (mode: "event" | "media") => {
    setEditing({
      row: { status: mode === "event" ? "upcoming" : "past", gallery_images: [], gallery_captions: [] },
      mode,
    });
  };
  const openEdit = (r: Row, mode: "event" | "media") => setEditing({ row: r, mode });

  return (
    <div className="pt-10 pb-20">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
            <h1 className="font-display text-5xl md:text-6xl">Events</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Add upcoming shows with <em>Add Event</em>. Archive photos from past events with <em>Add Media</em>. Everything published goes live on the public Events page instantly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => startNew("event")}
              className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:shadow-glow transition"
            >
              <Plus className="h-4 w-4" /> Add event
            </button>
            <button
              onClick={() => startNew("media")}
              className="inline-flex items-center gap-2 border border-gold/60 text-gold px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-gold/5 transition"
            >
              <ImagePlus className="h-4 w-4" /> Add media
            </button>
          </div>
        </div>

        <Section
          title="Upcoming events"
          emptyLabel="No upcoming events yet. Click Add event to publish your next show."
          rows={upcoming}
          onEdit={(r) => openEdit(r, "event")}
          onDelete={onDelete}
          kind="event"
        />
        <Section
          title="Past events (most recent 4)"
          emptyLabel="No past events yet — events auto-move here after their end date."
          rows={past}
          onEdit={(r) => openEdit(r, "event")}
          onDelete={onDelete}
          kind="event"
        />
        <Section
          title="Media galleries"
          emptyLabel="No media galleries yet. Click Add media to archive photos from a past show."
          rows={media}
          onEdit={(r) => openEdit(r, "media")}
          onDelete={onDelete}
          kind="media"
        />

        {q.isLoading && <p className="mt-6 text-muted-foreground text-sm">Loading…</p>}
      </div>

      {editing && (
        <ExhibitionEditor
          key={(editing.row.id ?? "new") + ":" + editing.mode}
          initial={editing.row}
          mode={editing.mode}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function Section({
  title,
  emptyLabel,
  rows,
  onEdit,
  onDelete,
  kind,
}: {
  title: string;
  emptyLabel: string;
  rows: Row[];
  onEdit: (r: Row) => void;
  onDelete: (id: string, title: string) => void;
  kind: "event" | "media";
}) {
  return (
    <div className="mt-8">
      <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed border-border p-6">{emptyLabel}</p>
      ) : (
        kind === "event" ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, i) => (
              <EventCard
                key={r.id}
                index={i}
                event={{
                  id: r.id,
                  title: r.title,
                  venue: r.venue,
                  city: r.city,
                  blurb: r.blurb,
                  event_date: r.event_date,
                  end_date: r.end_date,
                  time_text: r.time_text,
                  image_url: r.image_url,
                  link_url: r.link_url,
                }}
                admin={{ onEdit: () => onEdit(r), onDelete: () => onDelete(r.id, r.title) }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((r) => (
              <div key={r.id} className="border border-border bg-card/40 overflow-hidden flex">
                <div className="w-32 sm:w-40 shrink-0 bg-background relative">
                  {(r.gallery_images?.length ?? 0) > 0 ? (
                    <img src={r.gallery_images![0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                      <Calendar className="h-6 w-6" />
                    </div>
                  )}
                  {(r.gallery_images?.length ?? 0) > 1 && (
                    <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] bg-background/80 border border-border">
                      {r.gallery_images!.length} photos
                    </div>
                  )}
                </div>
                <div className="flex-1 p-4">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-gold">
                    {formatDate(r.event_date)}{r.end_date ? ` — ${formatDate(r.end_date)}` : ""}
                  </div>
                  <div className="font-display text-xl mt-1">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {[r.venue, r.city].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {r.blurb && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{r.blurb}</p>}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => onEdit(r)}
                      className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold transition"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => onDelete(r.id, r.title)}
                      className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-accent hover:text-accent transition"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function formatDate(d?: string | null) {
  return formatCalendarDate(d);
}

function ExhibitionEditor({
  initial,
  mode,
  onClose,
  onSaved,
}: {
  initial: Partial<Row>;
  mode: "event" | "media";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Row>>({
    ...initial,
    gallery_images: Array.isArray(initial.gallery_images) ? initial.gallery_images : [],
    gallery_captions: Array.isArray(initial.gallery_captions) ? initial.gallery_captions : [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  const uploadOne = async (file: File): Promise<string> => {
    // Compress client-side (max ~1600px longest edge, WebP/JPEG) so we never
    // ship multi-MB camera originals to the server, then encode with
    // FileReader — safe for arbitrarily large blobs, unlike
    // btoa(String.fromCharCode(...bytes)) which overflows the stack.
    const { blob, filename, contentType } = await compressImage(file);
    const b64 = await blobToBase64(blob);
    const res = await adminUploadImage({
      data: {
        bucket: "exhibition-images",
        filename,
        contentType,
        dataBase64: b64,
      },
    });
    return res.url;
  };

  const handlePoster = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadOne(file);
      setForm((f) => ({ ...f, image_url: url }));
      toast.success("Poster uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleGallery = async (files: FileList) => {
    const list = Array.from(files).slice(0, MAX_GALLERY_BATCH);
    if (files.length > MAX_GALLERY_BATCH) {
      toast.message(`Uploading first ${MAX_GALLERY_BATCH} of ${files.length} — please add the rest in another batch.`);
    }
    setUploading(true);
    setUploadProgress({ done: 0, total: list.length });
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        try {
          uploaded.push(await uploadOne(file));
        } catch (e: any) {
          toast.error(`${file.name}: ${e?.message ?? "upload failed"}`);
        }
        setUploadProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
      if (uploaded.length) {
        setForm((f) => ({
          ...f,
          gallery_images: [...(f.gallery_images ?? []), ...uploaded],
          gallery_captions: [...(f.gallery_captions ?? []), ...uploaded.map(() => "")],
        }));
        toast.success(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} added`);
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const removeGalleryImage = (idx: number) => {
    setForm((f) => ({
      ...f,
      gallery_images: (f.gallery_images ?? []).filter((_, i) => i !== idx),
      gallery_captions: (f.gallery_captions ?? []).filter((_, i) => i !== idx),
    }));
  };

  const setCaption = (idx: number, value: string) => {
    setForm((f) => {
      const imgs = f.gallery_images ?? [];
      const caps = [...(f.gallery_captions ?? [])];
      while (caps.length < imgs.length) caps.push("");
      caps[idx] = value;
      return { ...f, gallery_captions: caps };
    });
  };

  const save = async () => {
    if (!form.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    if (mode === "event" && !form.event_date) {
      toast.error("Date is required");
      return;
    }
    // Event times must always be a complete 12-hour time with AM/PM so
    // visitors never see an ambiguous bare "7".
    if (mode === "event") {
      const { start, end } = parseTimeText(form.time_text);
      if (!isCompleteTime(start)) {
        toast.error("Please select a time, including AM or PM");
        return;
      }
      const endTouched = end.hour !== "" || end.minute !== "" || end.meridiem !== "";
      if (endTouched && !isCompleteTime(end)) {
        toast.error("Please complete the end time, including AM or PM");
        return;
      }
    }
    if (mode === "media" && form.event_date && form.event_date > todayISO()) {
      toast.error("Past events can't have a future date.");
      return;
    }
    if (mode === "media" && (!form.venue || !form.venue.trim())) {
      toast.error("Venue is required");
      return;
    }
    setSaving(true);
    try {
      await adminUpsertExhibition({
        data: {
          id: form.id,
          title: form.title.trim(),
          venue: form.venue ?? null,
          city: form.city ?? null,
          blurb: form.blurb ?? null,
          event_date: form.event_date || null,
          end_date: form.end_date || null,
          time_text: form.time_text ?? null,
          image_url: mode === "event" ? (form.image_url ?? null) : null,
          link_url: form.link_url ?? null,
          status: mode === "event" ? "upcoming" : "past",
          sort_order: Number(form.sort_order ?? 0),
          gallery_images: mode === "media" ? (form.gallery_images ?? []) : [],
          gallery_captions: mode === "media" ? (form.gallery_captions ?? []) : [],
        },
      });
      toast.success(form.id ? "Updated" : "Added");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-xl overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-start md:items-center justify-center p-4 md:p-10">
        <div onClick={(e) => e.stopPropagation()} className={`relative w-full ${mode === "media" ? "max-w-5xl" : "max-w-3xl"} bg-card border border-border`}>
          <button onClick={onClose} className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-border hover:border-gold">
            <X className="h-4 w-4" />
          </button>
          <div className="p-6 md:p-8">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">
              {form.id ? (mode === "event" ? "Edit event" : "Edit media") : (mode === "event" ? "New event" : "New media gallery")}
            </div>
            <h2 className="font-display text-3xl">
              {form.id ? form.title : (mode === "event" ? "Add event" : "Add media")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "event"
                ? "Publishes to the Upcoming section on the public Events page."
                : "Publishes to the Past shows gallery on the public Events page."}
            </p>

            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Field label="Title (required)">
                  <input
                    value={form.title ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={mode === "event" ? "Date (required)" : "Date of event (required)"}>
                    <DateInput
                      value={form.event_date ?? ""}
                      min={mode === "event" && !form.id ? todayISO() : undefined}
                      max={mode === "media" ? todayISO() : undefined}
                      onChange={(v) => setForm((f) => ({ ...f, event_date: v }))}
                    />
                    <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
                      {mode === "event" ? "Start date" : "Date the event happened"} · click for calendar or type YYYY-MM-DD
                    </p>
                  </Field>
                  {mode === "event" && (
                    <Field label="End date (optional)">
                      <DateInput
                        value={form.end_date ?? ""}
                        min={form.event_date || undefined}
                        onChange={(v) => setForm((f) => ({ ...f, end_date: v }))}
                      />
                      <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
                        Auto-moves to Past after this date
                      </p>
                    </Field>
                  )}
                </div>

                {mode === "media" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Venue (required)">
                      <input
                        value={form.venue ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                        className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                      />
                    </Field>
                    <Field label="City (optional)">
                      <input
                        value={form.city ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                        className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                      />
                    </Field>
                  </div>
                )}

                {mode === "event" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Venue (optional)">
                        <input
                          value={form.venue ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                          className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                        />
                      </Field>
                      <Field label="City (optional)">
                        <input
                          value={form.city ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                          className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                        />
                      </Field>
                    </div>
                    <TimeRangeField
                      value={form.time_text ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, time_text: v }))}
                    />
                    <Field label="Link (optional)">
                      <input
                        value={form.link_url ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                        placeholder="https://…"
                        className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                      />
                    </Field>
                  </>
                )}

                <Field label={mode === "event" ? "Description / details (optional)" : "Notes (optional)"}>
                  <textarea
                    value={form.blurb ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, blurb: e.target.value }))}
                    rows={3}
                    className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                  />
                </Field>

                <Field label="Sort order">
                  <input
                    type="number"
                    value={form.sort_order ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                  />
                </Field>
              </div>

              <div>
                {mode === "event" ? (
                  <>
                    <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Event poster / thumbnail (optional)</label>
                    <div className="mt-2 aspect-[4/3] border border-dashed border-border bg-background/50 relative overflow-hidden">
                      {form.image_url ? (
                        <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
                          No poster
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePoster(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 border border-gold/60 text-gold px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-gold/5 disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : form.image_url ? "Replace poster" : "Upload poster"}
                    </button>
                    {form.image_url && (
                      <button
                        onClick={() => setForm((f) => ({ ...f, image_url: null }))}
                        className="mt-2 w-full text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-accent"
                      >
                        Remove poster
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Photos from the event</label>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      Upload photos and add a caption for each — e.g. "L–R: Prime Minister Mark Carney, Mayor James Goddad."
                    </p>
                    <div className="mt-2 space-y-3 max-h-[520px] overflow-y-auto pr-1">
                      {(form.gallery_images ?? []).map((url, idx) => (
                        <div key={url + idx} className="flex gap-3 items-start border border-border bg-background/40 p-2">
                          <div className="relative w-28 h-28 shrink-0 bg-background overflow-hidden">
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <label className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Caption for photo {idx + 1}</label>
                            <textarea
                              value={(form.gallery_captions ?? [])[idx] ?? ""}
                              onChange={(e) => setCaption(idx, e.target.value)}
                              rows={3}
                              placeholder='e.g. "L–R: Prime Minister Mark Carney, Mayor James Goddad."'
                              className="mt-1 w-full bg-background border border-border px-2 py-1.5 text-xs focus:border-gold outline-none resize-y"
                            />
                          </div>
                          <button
                            onClick={() => removeGalleryImage(idx)}
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border hover:border-accent hover:text-accent"
                            aria-label="Remove photo"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {(form.gallery_images?.length ?? 0) === 0 && (
                        <div className="aspect-[4/3] border border-dashed border-border bg-background/50 grid place-items-center text-xs text-muted-foreground">
                          No photos yet
                        </div>
                      )}
                    </div>
                    <input
                      ref={multiFileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length) handleGallery(files);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => multiFileRef.current?.click()}
                      disabled={uploading}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 border border-gold/60 text-gold px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-gold/5 disabled:opacity-50"
                    >
                      <ImagePlus className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Add photos"}
                    </button>
                    {uploadProgress && (
                      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
                        Uploading {uploadProgress.done} / {uploadProgress.total}…
                      </p>
                    )}
                    <p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 text-center">
                      Up to {MAX_GALLERY_BATCH} images per batch · auto-resized to 1600px
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-5 py-2.5 text-xs uppercase tracking-[0.2em] border border-border hover:border-gold">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={
                  saving ||
                  !form.title ||
                  (mode === "event" &&
                    (!form.event_date || !isCompleteTime(parseTimeText(form.time_text).start))) ||
                  (mode === "media" && (!form.event_date || !form.venue?.trim()))
                }
                className="bg-gradient-gold text-primary-foreground px-6 py-2.5 text-xs uppercase tracking-[0.2em] hover:shadow-glow transition disabled:opacity-50"
              >
                {saving ? "Saving…" : form.id ? "Save changes" : mode === "event" ? "Publish event" : "Publish gallery"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/**
 * 12-hour time picker for events. Hour + minutes + a required AM/PM select,
 * with an optional end time. Stores a display-ready string such as
 * "7:00 PM" or "6:00 PM — 9:00 PM" — never a bare hour.
 */
function TimeRangeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseTimeText(value);
  const set = (which: "start" | "end", patch: Partial<TimeParts>) => {
    const next = { ...parsed, [which]: { ...parsed[which], ...patch } };
    onChange(buildTimeText(next.start, next.end));
  };
  const startIncomplete =
    !isCompleteTime(parsed.start) &&
    (parsed.start.hour !== "" || parsed.start.minute !== "" || parsed.start.meridiem !== "");
  return (
    <div>
      <Field label="Start time (required — include AM/PM)">
        <TimeParked parts={parsed.start} onChange={(p) => set("start", p)} />
      </Field>
      <div className="mt-3">
        <Field label="End time (optional — include AM/PM)">
          <TimeParked parts={parsed.end} onChange={(p) => set("end", p)} />
        </Field>
      </div>
      {(startIncomplete || !isCompleteTime(parsed.start)) && (
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-accent">
          Please select a time, including AM or PM
        </p>
      )}
    </div>
  );
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ["00", "15", "30", "45"];

function TimeParked({
  parts,
  onChange,
}: {
  parts: TimeParts;
  onChange: (p: Partial<TimeParts>) => void;
}) {
  const cls =
    "bg-background border border-border px-3 py-2.5 text-sm focus:border-gold outline-none [color-scheme:dark]";
  return (
    <div className="flex items-center gap-2">
      <select value={parts.hour} onChange={(e) => onChange({ hour: e.target.value })} className={cls} aria-label="Hour">
        <option value="">Hour</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>
      <select value={parts.minute} onChange={(e) => onChange({ minute: e.target.value })} className={cls} aria-label="Minutes">
        <option value="">Min</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select
        value={parts.meridiem}
        onChange={(e) => onChange({ meridiem: e.target.value as TimeParts["meridiem"] })}
        className={cls}
        aria-label="AM or PM"
      >
        <option value="">AM/PM</option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

/**
 * Calendar date input: native date field (typable) plus an always-visible
 * calendar button that opens the browser's picker. The value is the raw
 * "YYYY-MM-DD" string, so no timezone conversion ever happens.
 */
function DateInput({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const el = ref.current;
    if (!el) return;
    if (typeof (el as any).showPicker === "function") {
      try { (el as any).showPicker(); return; } catch { /* fall through */ }
    }
    el.focus();
  };
  return (
    <div className="relative">
      <input
        ref={ref}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border pl-3 pr-11 py-2.5 text-sm focus:border-gold outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0"
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Open calendar"
        className="absolute right-1 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center text-gold hover:bg-gold/10 transition"
      >
        <Calendar className="h-4 w-4" />
      </button>
    </div>
  );
}