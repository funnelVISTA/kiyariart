import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, ImagePlus, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import {
  adminListExhibitions,
  adminUpsertExhibition,
  adminDeleteExhibition,
  adminUploadImage,
} from "@/lib/admin-content.functions";

export const Route = createFileRoute("/_authenticated/admin/exhibitions")({
  head: () => ({ meta: [{ title: "Exhibitions — Admin" }, { name: "robots", content: "noindex" }] }),
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
};

type Tab = "event" | "media";

function AdminExhibitionsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("event");
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

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
  }));
  const upcoming = rows.filter((r) => r.status === "upcoming");
  const past = rows.filter((r) => r.status === "past");

  const startNew = () => {
    setEditing({
      status: tab === "event" ? "upcoming" : "past",
      gallery_images: [],
    });
  };

  return (
    <div className="pt-10 pb-20">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
            <h1 className="font-display text-5xl md:text-6xl">Exhibitions</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Add upcoming shows under <em>Add Event</em>. Archive photos from past exhibitions under <em>Add Media</em>. Everything published goes live on the public Exhibitions page instantly.
            </p>
          </div>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:shadow-glow transition"
          >
            <Plus className="h-4 w-4" /> {tab === "event" ? "Add event" : "Add media"}
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-8 inline-flex border border-border bg-card/40">
          <TabButton active={tab === "event"} onClick={() => setTab("event")} label="Add event" hint="Upcoming shows" />
          <TabButton active={tab === "media"} onClick={() => setTab("media")} label="Add media" hint="Past shows gallery" />
        </div>

        {tab === "event" ? (
          <Section
            title="Upcoming events"
            emptyLabel="No upcoming events yet. Click Add event to publish your next show."
            rows={upcoming}
            onEdit={setEditing}
            onDelete={onDelete}
            kind="event"
          />
        ) : (
          <Section
            title="Past exhibitions — media galleries"
            emptyLabel="No past exhibition galleries yet. Click Add media to archive a past show."
            rows={past}
            onEdit={setEditing}
            onDelete={onDelete}
            kind="media"
          />
        )}

        {q.isLoading && <p className="mt-6 text-muted-foreground text-sm">Loading…</p>}
      </div>

      {editing && (
        <ExhibitionEditor
          key={editing.id ?? "new"}
          initial={editing}
          mode={editing.status === "past" ? "media" : "event"}
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

function TabButton({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-xs uppercase tracking-[0.25em] border-r border-border last:border-r-0 transition ${active ? "bg-gradient-gold text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      <span className="block">{label}</span>
      <span className={`block text-[9px] tracking-[0.2em] mt-0.5 ${active ? "opacity-80" : "opacity-60"}`}>{hint}</span>
    </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="border border-border bg-card/40 overflow-hidden flex">
              <div className="w-32 sm:w-40 shrink-0 bg-background relative">
                {kind === "media" && (r.gallery_images?.length ?? 0) > 0 ? (
                  <img src={r.gallery_images![0]} alt="" className="h-full w-full object-cover" />
                ) : r.image_url ? (
                  <img src={r.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                    <Calendar className="h-6 w-6" />
                  </div>
                )}
                {kind === "media" && (r.gallery_images?.length ?? 0) > 1 && (
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
      )}
    </div>
  );
}

function formatDate(d?: string | null) {
  if (!d) return "TBD";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);

  const uploadOne = async (file: File): Promise<string> => {
    const buf = await file.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const res = await adminUploadImage({
      data: {
        bucket: "exhibition-images",
        filename: file.name,
        contentType: file.type,
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
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        try {
          uploaded.push(await uploadOne(file));
        } catch (e: any) {
          toast.error(`${file.name}: ${e?.message ?? "upload failed"}`);
        }
      }
      if (uploaded.length) {
        setForm((f) => ({ ...f, gallery_images: [...(f.gallery_images ?? []), ...uploaded] }));
        toast.success(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} added`);
      }
    } finally {
      setUploading(false);
    }
  };

  const removeGalleryImage = (idx: number) => {
    setForm((f) => ({
      ...f,
      gallery_images: (f.gallery_images ?? []).filter((_, i) => i !== idx),
    }));
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
        <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-3xl bg-card border border-border">
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
                ? "Publishes to the Upcoming section on the public Exhibitions page."
                : "Publishes to the Past shows gallery on the public Exhibitions page."}
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
                  <Field label={mode === "event" ? "Date (required)" : "Date (optional)"}>
                    <input
                      type="date"
                      value={form.event_date ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                      className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                    />
                  </Field>
                  {mode === "event" && (
                    <Field label="End date (optional)">
                      <input
                        type="date"
                        value={form.end_date ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                        className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                      />
                    </Field>
                  )}
                </div>

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
                    <Field label="Time (free text, optional)">
                      <input
                        value={form.time_text ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, time_text: e.target.value }))}
                        placeholder="e.g. 6 — 9 PM"
                        className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                      />
                    </Field>
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
                    <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Photos from the exhibition</label>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">Upload multiple images. They appear as a gallery under this show on the public page.</p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(form.gallery_images ?? []).map((url, idx) => (
                        <div key={url + idx} className="relative aspect-square bg-background/50 border border-border overflow-hidden group">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                          <button
                            onClick={() => removeGalleryImage(idx)}
                            className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 border border-border opacity-0 group-hover:opacity-100 transition hover:border-accent hover:text-accent"
                            aria-label="Remove"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {(form.gallery_images?.length ?? 0) === 0 && (
                        <div className="col-span-3 aspect-[4/3] border border-dashed border-border bg-background/50 grid place-items-center text-xs text-muted-foreground">
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
                disabled={saving || !form.title || (mode === "event" && !form.event_date)}
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