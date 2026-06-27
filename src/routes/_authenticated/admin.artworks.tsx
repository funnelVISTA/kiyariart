import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload, X, Image as ImageIcon } from "lucide-react";
import {
  adminListCustomArtworks,
  adminUpsertCustomArtwork,
  adminDeleteCustomArtwork,
  adminUploadImage,
} from "@/lib/admin-content.functions";

export const Route = createFileRoute("/_authenticated/admin/artworks")({
  head: () => ({ meta: [{ title: "Artworks — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminArtworksPage,
});

type Row = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string;
  collection: string;
  medium: string | null;
  sold: boolean;
  sort_order: number;
};

function AdminArtworksPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const q = useQuery({
    queryKey: ["admin", "custom-artworks"],
    queryFn: () => adminListCustomArtworks(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "custom-artworks"] });

  const onDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    try {
      await adminDeleteCustomArtwork({ data: { id } });
      toast.success("Deleted");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  return (
    <div className="pt-10 pb-20">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
            <h1 className="font-display text-5xl md:text-6xl">Artworks</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Upload new pieces, set the price, edit details, or mark sold. Each piece is one-of-one — once it sells through Stripe it's marked sold automatically.
            </p>
          </div>
          <button
            onClick={() => setEditing({ collection: "Our Essence", price: 0, sold: false })}
            className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:shadow-glow transition"
          >
            <Plus className="h-4 w-4" /> Add artwork
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {q.isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
          {q.data?.artworks.length === 0 && (
            <div className="col-span-full border border-dashed border-border p-10 text-center">
              <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No custom artworks yet. Click <span className="text-gold">Add artwork</span> to upload your first piece.
              </p>
            </div>
          )}
          {(q.data?.artworks ?? []).map((a: Row) => (
            <div key={a.id} className="border border-border bg-card/40 overflow-hidden">
              <div className="aspect-[4/5] bg-background relative overflow-hidden">
                <img src={a.image_url} alt={a.title} className="h-full w-full object-cover" />
                <div className={`absolute top-2 right-2 text-[10px] uppercase tracking-[0.2em] px-2 py-1 ${a.sold ? "bg-background/80 border border-border text-muted-foreground" : "bg-gold/90 text-primary-foreground"}`}>
                  {a.sold ? "Sold" : "Available"}
                </div>
              </div>
              <div className="p-4">
                <div className="font-display text-xl">{a.title}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">{a.collection}</div>
                <div className="mt-1 text-sm text-gold">
                  {a.price > 0 ? `$${Number(a.price).toLocaleString()} CAD` : "—"}
                </div>
                {a.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{a.description}</p>}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setEditing(a)}
                    className="flex-1 inline-flex items-center justify-center gap-2 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold transition"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(a.id, a.title)}
                    className="inline-flex items-center justify-center gap-2 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-accent hover:text-accent transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <ArtworkEditor
          initial={editing}
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

function ArtworkEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Partial<Row>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Row>>(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const res = await adminUploadImage({
        data: {
          bucket: "artwork-images",
          filename: file.name,
          contentType: file.type,
          dataBase64: b64,
        },
      });
      setForm((f) => ({ ...f, image_url: res.url }));
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminUpsertCustomArtwork({
        data: {
          id: form.id,
          title: form.title ?? "",
          description: form.description ?? null,
          price: Number(form.price ?? 0),
          image_url: form.image_url ?? "",
          collection: form.collection ?? "Our Essence",
          medium: form.medium ?? null,
          sold: !!form.sold,
          sort_order: Number(form.sort_order ?? 0),
        },
      });
      toast.success(form.id ? "Artwork updated" : "Artwork added");
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
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl bg-card border border-border"
        >
          <button onClick={onClose} className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-border hover:border-gold">
            <X className="h-4 w-4" />
          </button>
          <div className="p-6 md:p-8">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{form.id ? "Edit" : "New"}</div>
            <h2 className="font-display text-3xl">{form.id ? form.title : "Add artwork"}</h2>

            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Image</label>
                <div className="mt-2 aspect-[4/5] border border-dashed border-border bg-background/50 relative overflow-hidden">
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
                      No image yet
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
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 border border-gold/60 text-gold px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-gold/5 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : form.image_url ? "Replace image" : "Upload image"}
                </button>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  JPG / PNG / WebP, up to ~12MB. Vertical 4:5 looks best.
                </p>
              </div>

              <div className="space-y-4">
                <Field label="Title">
                  <input
                    value={form.title ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                  />
                </Field>
                <Field label="Price (CAD)">
                  <input
                    type="number" min={0} step={1}
                    value={form.price ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">Set 0 to hide the buy button (inquiry only).</p>
                </Field>
                <Field label="Collection">
                  <select
                    value={form.collection ?? "Our Essence"}
                    onChange={(e) => setForm((f) => ({ ...f, collection: e.target.value }))}
                    className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                  >
                    <option>Our Essence</option>
                    <option>The Legends</option>
                  </select>
                </Field>
                <Field label="Medium (optional)">
                  <input
                    value={form.medium ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, medium: e.target.value }))}
                    placeholder="e.g. Acrylic & mixed media on canvas"
                    className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                  />
                </Field>
                <Field label="Description (optional)">
                  <textarea
                    value={form.description ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Sort order">
                    <input
                      type="number"
                      value={form.sort_order ?? 0}
                      onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                      className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                    />
                  </Field>
                  <label className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Status</span>
                    <label className="mt-2 inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.sold}
                        onChange={(e) => setForm((f) => ({ ...f, sold: e.target.checked }))}
                      />
                      <span className="text-sm">Mark as sold</span>
                    </label>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-5 py-2.5 text-xs uppercase tracking-[0.2em] border border-border hover:border-gold">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.title || !form.image_url}
                className="bg-gradient-gold text-primary-foreground px-6 py-2.5 text-xs uppercase tracking-[0.2em] hover:shadow-glow transition disabled:opacity-50"
              >
                {saving ? "Saving…" : form.id ? "Save changes" : "Add artwork"}
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
