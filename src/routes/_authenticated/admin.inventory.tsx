import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Plus, Trash2, Upload, X, Image as ImageIcon, GripVertical, CheckSquare, Square, Crop } from "lucide-react";
import {
  adminListCustomArtworks,
  adminUpsertCustomArtwork,
  adminDeleteCustomArtwork,
  adminUploadImage,
  adminReorderCustomArtworks,
  adminBulkSetArtworkSold,
  adminBulkDeleteArtworks,
  adminUpsertCatalogOverride,
} from "@/lib/admin-content.functions";
import { adminSetCatalogAvailability } from "@/lib/admin-extra.functions";
import { listArtworkAvailability } from "@/lib/payments.functions";
import { ARTWORKS } from "@/lib/artworks";
import { ImageCropper } from "@/components/admin/ImageCropper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Admin · art by KIYARI" }, { name: "robots", content: "noindex" }] }),
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
  display_order: number;
  seo_title: string | null;
  seo_description: string | null;
  alt_text: string | null;
};

function AdminArtworksPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [editingCatalog, setEditingCatalog] = useState<null | {
    id: string;
    title: string;
    image: string;
    originalPrice: number;
    priceOverride: number | null;
    onSale: boolean;
    salePrice: number | null;
  }>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<Row[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: "single"; id: string; title: string }
    | { kind: "bulk"; ids: string[] }
    | null
  >(null);

  const q = useQuery({
    queryKey: ["admin", "custom-artworks"],
    queryFn: () => adminListCustomArtworks(),
  });

  const availQ = useQuery({
    queryKey: ["artwork-availability"],
    queryFn: () => listArtworkAvailability(),
  });
  const soldSet = useMemo(() => new Set(availQ.data?.soldIds ?? []), [availQ.data]);
  const overrideSet = useMemo(
    () => new Set(availQ.data?.availableOverrideIds ?? []),
    [availQ.data],
  );
  const catalogOverrideMap = useMemo(() => {
    const m = new Map<string, { price_override: number | null; on_sale: boolean; sale_price: number | null }>();
    for (const r of availQ.data?.catalogOverrides ?? []) {
      m.set(r.artwork_id, { price_override: r.price_override, on_sale: r.on_sale, sale_price: r.sale_price });
    }
    return m;
  }, [availQ.data]);

  const refresh = () => {
    setOrder(null);
    qc.invalidateQueries({ queryKey: ["admin", "custom-artworks"] });
    qc.invalidateQueries({ queryKey: ["artworks-custom"] });
    qc.invalidateQueries({ queryKey: ["artwork-availability"] });
  };

  const rows: Row[] = order ?? (q.data?.artworks as Row[] | undefined) ?? [];
  const catalogIds = useMemo(() => new Set(ARTWORKS.map((a) => a.id)), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = rows.map((r) => r.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(rows, oldIdx, newIdx);
    setOrder(reordered);
    try {
      await adminReorderCustomArtworks({ data: { orderedIds: reordered.map((r) => r.id) } });
      toast.success("Order saved");
    } catch (err: any) {
      toast.error(err?.message ?? "Reorder failed");
      setOrder(null);
    }
  };

  const toggleSel = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const allIds = useMemo(
    () => [...rows.map((r) => r.id), ...ARTWORKS.map((a) => a.id)],
    [rows],
  );
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allIds));
  };
  const clearSel = () => setSelected(new Set());

  const bulkMark = async (sold: boolean) => {
    if (selected.size === 0) return;
    const ids = [...selected];
    const catalogSel = ids.filter((id) => catalogIds.has(id));
    const customSel = ids.filter((id) => !catalogIds.has(id));
    try {
      if (customSel.length > 0) {
        await adminBulkSetArtworkSold({ data: { ids: customSel, sold } });
      }
      for (const id of catalogSel) {
        await adminSetCatalogAvailability({ data: { artworkId: id, available: !sold } });
      }
      toast.success(`${ids.length} marked ${sold ? "sold" : "available"}`);
      clearSel(); refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const runBulkDelete = async (ids: string[]) => {
    const deletableIds = ids.filter((id) => !catalogIds.has(id));
    const skippedCatalog = ids.length - deletableIds.length;
    if (deletableIds.length === 0) {
      toast.warning("Catalog originals can't be deleted", {
        description: "Mark them as sold instead.",
      });
      clearSel();
      return;
    }
    try {
      const res = await adminBulkDeleteArtworks({ data: { ids: deletableIds } });
      const deleted = res?.deleted ?? 0;
      const blocked = res?.blocked?.length ?? 0;
      if (deleted > 0) toast.success(`${deleted} deleted`);
      if (blocked > 0) {
        toast.warning(`${blocked} skipped — order history`, {
          description: "Mark them as sold instead to keep the record.",
        });
      }
      if (skippedCatalog > 0) {
        toast.warning(`${skippedCatalog} catalog original(s) skipped`, {
          description: "Catalog pieces can only be marked sold.",
        });
      }
      clearSel(); refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const runSingleDelete = async (id: string) => {
    try {
      await adminDeleteCustomArtwork({ data: { id } });
      toast.success("Deleted");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  const toggleCatalog = async (id: string, available: boolean) => {
    try {
      await adminSetCatalogAvailability({ data: { artworkId: id, available } });
      toast.success(available ? "Marked available" : "Marked sold");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const toggleCustom = async (id: string, sold: boolean) => {
    try {
      await adminBulkSetArtworkSold({ data: { ids: [id], sold } });
      toast.success(sold ? "Marked sold" : "Marked available");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const catalogRows = useMemo(() => {
    return ARTWORKS.map((a) => {
      const ov = catalogOverrideMap.get(a.id);
      const listPrice = ov?.price_override ?? a.price;
      const onSale = !!ov?.on_sale && ov?.sale_price != null;
      const salePrice = onSale ? Number(ov!.sale_price) : null;
      const effective = onSale && salePrice != null ? salePrice : listPrice;
      return {
        ...a,
        sold: overrideSet.has(a.id) ? false : (a.sold || soldSet.has(a.id)),
        priceListing: listPrice,
        priceEffective: effective,
        onSale,
        salePrice,
        originalPrice: a.price,
        priceOverride: ov?.price_override ?? null,
      };
    });
  }, [soldSet, overrideSet, catalogOverrideMap]);

  return (
    <div className="pt-10 pb-20">
      <div className="container-page">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl truncate">Inventory</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Drag tiles to reorder. Bulk select to mark sold / delete. Each piece is one-of-one — Stripe purchases mark sold automatically.
            </p>
          </div>
          <button
            onClick={() => setEditing({ collection: "Our Essence", price: 0, sold: false })}
            className="inline-flex shrink-0 items-center gap-2 bg-gradient-gold text-primary-foreground px-4 sm:px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:shadow-glow transition"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add artwork</span><span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Selection toolbar */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border border-border bg-card/40 px-3 py-2">
          <button
            onClick={toggleAll}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            {allSelected ? <CheckSquare className="h-4 w-4 text-gold" /> : <Square className="h-4 w-4" />}
            {allSelected ? "Clear" : "Select all"}
          </button>
          <span className="text-[11px] text-muted-foreground">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              disabled={selected.size === 0}
              onClick={() => bulkMark(true)}
              className="px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] border border-border hover:border-gold disabled:opacity-40"
            >Mark sold</button>
            <button
              disabled={selected.size === 0}
              onClick={() => bulkMark(false)}
              className="px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] border border-border hover:border-gold disabled:opacity-40"
            >Mark available</button>
            <button
              disabled={selected.size === 0}
              onClick={() => setConfirmDelete({ kind: "bulk", ids: [...selected] })}
              className="px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] border border-border hover:border-accent hover:text-accent disabled:opacity-40"
            >Delete</button>
          </div>
        </div>

        {q.isLoading && <p className="mt-8 text-muted-foreground text-sm">Loading…</p>}
        {rows.length === 0 && !q.isLoading && (
          <div className="mt-8 border border-dashed border-border p-10 text-center">
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No custom artworks yet. Click <span className="text-gold">Add artwork</span> to upload your first piece.
            </p>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rows.map((r) => r.id)} strategy={rectSortingStrategy}>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((a) => (
                <SortableCard
                  key={a.id}
                  a={a}
                  selected={selected.has(a.id)}
                  onToggle={() => toggleSel(a.id)}
                  onEdit={() => setEditing(a)}
                  onDelete={() => setConfirmDelete({ kind: "single", id: a.id, title: a.title })}
                  onToggleSold={() => toggleCustom(a.id, !a.sold)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Catalog originals — hardcoded pieces from the store catalog */}
        <section className="mt-16">
          <div className="flex items-end justify-between border-b border-border pb-3">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">Catalog</div>
              <h2 className="font-display text-2xl sm:text-3xl">Catalog originals</h2>
              <p className="mt-1 text-xs text-muted-foreground max-w-xl">
                Founding pieces from the store catalog. Toggle availability to control
                whether they appear as purchasable on the public store.
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground">{catalogRows.length} pieces</div>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogRows.map((a) => (
              <CatalogCard
                key={a.id}
                a={a}
                selected={selected.has(a.id)}
                onToggle={() => toggleSel(a.id)}
                onToggleSold={() => toggleCatalog(a.id, a.sold /* was sold → make available */)}
                onEdit={() =>
                  setEditingCatalog({
                    id: a.id,
                    title: a.title,
                    image: a.image,
                    originalPrice: a.originalPrice,
                    priceOverride: a.priceOverride,
                    onSale: a.onSale,
                    salePrice: a.salePrice,
                  })
                }
              />
            ))}
          </div>
        </section>
      </div>

      {editing && (
        <ArtworkEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}

      {editingCatalog && (
        <CatalogOverrideEditor
          initial={editingCatalog}
          onClose={() => setEditingCatalog(null)}
          onSaved={() => { setEditingCatalog(null); refresh(); }}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.kind === "bulk"
                ? `Delete ${confirmDelete.ids.length} selected artwork${confirmDelete.ids.length === 1 ? "" : "s"}?`
                : `Delete "${confirmDelete?.kind === "single" ? confirmDelete.title : ""}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This can't be undone. Artworks with order history are protected and will be skipped — mark them as sold instead to keep the record.</p>
              {confirmDelete?.kind === "bulk" && (
                <>
                  {(() => {
                    const names = confirmDelete.ids
                      .map((id) => rows.find((r) => r.id === id)?.title || ARTWORKS.find((a) => a.id === id)?.title)
                      .filter(Boolean) as string[];
                    const catalogCount = confirmDelete.ids.filter((id) => catalogIds.has(id)).length;
                    const deletableCount = confirmDelete.ids.length - catalogCount;
                    return (
                      <div className="rounded border border-border bg-muted/30 p-3 text-xs">
                        <div className="font-medium uppercase tracking-wider text-foreground mb-1.5">
                          Selected ({confirmDelete.ids.length})
                        </div>
                        <ul className="space-y-1 max-h-32 overflow-y-auto list-disc pl-4 text-muted-foreground">
                          {names.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                        {catalogCount > 0 && (
                          <p className="mt-2 text-accent">
                            {catalogCount} catalog piece{catalogCount === 1 ? "" : "s"} can’t be deleted — mark {catalogCount === 1 ? "it" : "them"} sold instead.
                          </p>
                        )}
                        {deletableCount > 0 && (
                          <p className="mt-2 text-gold">
                            {deletableCount} custom piece{deletableCount === 1 ? "" : "s"} will be deleted.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const c = confirmDelete;
                setConfirmDelete(null);
                if (!c) return;
                if (c.kind === "single") await runSingleDelete(c.id);
                else await runBulkDelete(c.ids);
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableCard({
  a, selected, onToggle, onEdit, onDelete, onToggleSold,
}: {
  a: Row; selected: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void; onToggleSold: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: a.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`border bg-card/40 overflow-hidden ${selected ? "border-gold ring-1 ring-gold/40" : "border-border"}`}>
      <div
        onClick={onToggle}
        className="aspect-[4/5] bg-background relative overflow-hidden cursor-pointer"
      >
        <img src={a.image_url} alt={a.alt_text || a.title} className="h-full w-full object-cover" />
        <div
          aria-hidden
          className="absolute top-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-background/80 backdrop-blur border border-border"
        >
          {selected ? <CheckSquare className="h-4 w-4 text-gold" /> : <Square className="h-4 w-4" />}
        </div>
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag to reorder"
          className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-background/80 backdrop-blur border border-border cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className={`absolute bottom-2 right-2 text-[10px] uppercase tracking-[0.2em] px-2 py-1 ${a.sold ? "bg-background/80 border border-border text-muted-foreground" : "bg-gold/90 text-primary-foreground"}`}>
          {a.sold ? "Sold" : "Available"}
        </div>
      </div>
      <div className="p-4">
        <div className="font-display text-xl truncate">{a.title}</div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">Our Essence</div>
        <div className="mt-1 text-sm text-gold">
          {a.price > 0 ? `$${Number(a.price).toLocaleString()} CAD` : "—"}
        </div>
        {a.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{a.description}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onToggleSold}
            className="flex-1 inline-flex items-center justify-center gap-2 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold transition"
          >
            {a.sold ? "Mark available" : "Mark sold"}
          </button>
          <button
            onClick={onEdit}
            aria-label="Edit"
            className="inline-flex items-center justify-center gap-2 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold transition"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete"
            className="inline-flex items-center justify-center gap-2 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-accent hover:text-accent transition"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CatalogCard({
  a,
  selected,
  onToggle,
  onToggleSold,
  onEdit,
}: {
  a: {
    id: string;
    title: string;
    image: string;
    price: number;
    sold: boolean;
    collection: string;
    priceListing?: number;
    priceEffective?: number;
    onSale?: boolean;
    salePrice?: number | null;
    originalPrice?: number;
    priceOverride?: number | null;
  };
  selected: boolean;
  onToggle: () => void;
  onToggleSold: () => void;
  onEdit: () => void;
}) {
  const listPrice = a.priceListing ?? a.price;
  const effective = a.priceEffective ?? a.price;
  return (
    <div
      onClick={onToggle}
      className={`border bg-card/40 overflow-hidden cursor-pointer transition ${selected ? "border-gold ring-1 ring-gold/40" : "border-border hover:border-muted-foreground/40"}`}
    >
      <div className="aspect-[4/5] bg-background relative overflow-hidden">
        <img src={a.image} alt={a.title} className="h-full w-full object-cover" />
        <div
          aria-hidden
          className="absolute top-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-background/80 backdrop-blur border border-border"
        >
          {selected ? <CheckSquare className="h-4 w-4 text-gold" /> : <Square className="h-4 w-4" />}
        </div>
        <div
          className={`absolute bottom-2 right-2 text-[10px] uppercase tracking-[0.2em] px-2 py-1 ${
            a.sold
              ? "bg-background/80 border border-border text-muted-foreground"
              : "bg-gold/90 text-primary-foreground"
          }`}
        >
          {a.sold ? "Sold" : "Available"}
        </div>
        {a.onSale && !a.sold && (
          <div className="absolute bottom-2 left-2 text-[10px] uppercase tracking-[0.2em] px-2 py-1 bg-accent text-accent-foreground">
            Sale
          </div>
        )}
        <div className="absolute top-2 right-2 text-[10px] uppercase tracking-[0.2em] px-2 py-1 bg-background/80 border border-border text-muted-foreground">
          Catalog
        </div>
      </div>
      <div className="p-4">
        <div className="font-display text-xl truncate">{a.title}</div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">Our Essence</div>
        <div className="mt-1 text-sm text-gold">
          {effective > 0 ? (
            a.onSale && listPrice > effective ? (
              <>
                <span className="line-through text-muted-foreground mr-1.5 opacity-70">${listPrice.toLocaleString()}</span>
                <span className="text-accent">${effective.toLocaleString()}</span> CAD
              </>
            ) : (
              <>${listPrice.toLocaleString()} CAD</>
            )
          ) : (
            "—"
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSold(); }}
            className="flex-1 inline-flex items-center justify-center gap-2 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold transition"
          >
            {a.sold ? "Mark available" : "Mark sold"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label="Edit price / sale"
            className="inline-flex items-center justify-center gap-2 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold transition"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ArtworkEditor({
  initial, onClose, onSaved,
}: {
  initial: Partial<Row>; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Row>>(initial);
  // Local editable string for the price so users can clear the field without
  // it snapping back to 0. Empty string = no value yet; validated on save.
  const [priceInput, setPriceInput] = useState<string>(
    initial.price === undefined || initial.price === null ? "" : String(initial.price),
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || "");
        res(s.includes(",") ? s.split(",")[1] : s);
      };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });

  const uploadBlob = async (blob: Blob, filename: string) => {
    setUploading(true);
    try {
      const b64 = await blobToBase64(blob);
      const res = await adminUploadImage({
        data: {
          bucket: "artwork-images",
          filename,
          contentType: blob.type || "image/jpeg",
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

  const onFile = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Unsupported file type", {
        description: "Use JPEG, PNG, WebP, or AVIF.",
      });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image too large", {
        description: `Max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB — yours is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
      });
      return;
    }
    // Open cropper with local preview URL
    const url = URL.createObjectURL(file);
    setCropSrc(url);
  };

  const onCropped = async (blob: Blob) => {
    const src = cropSrc;
    setCropSrc(null);
    if (src) URL.revokeObjectURL(src);
    await uploadBlob(blob, `cropped-${Date.now()}.jpg`);
  };

  const save = async () => {
    const trimmed = priceInput.trim();
    if (trimmed === "") {
      toast.error("Enter a price", {
        description: "Use 0 for inquiry-only pieces.",
      });
      return;
    }
    const parsedPrice = Number(trimmed);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      toast.error("Price must be a non-negative number");
      return;
    }
    setSaving(true);
    try {
      await adminUpsertCustomArtwork({
        data: {
          id: form.id,
          title: form.title ?? "",
          description: form.description ?? null,
          price: parsedPrice,
          image_url: form.image_url ?? "",
          collection: "Our Essence",
          medium: form.medium ?? null,
          sold: !!form.sold,
          sort_order: Number(form.sort_order ?? 0),
          display_order: Number(form.display_order ?? 0),
          seo_title: form.seo_title ?? null,
          seo_description: form.seo_description ?? null,
          alt_text: form.alt_text ?? null,
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
    <>
      <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-xl overflow-y-auto" onClick={onClose}>
        <div className="min-h-full flex items-start md:items-center justify-center p-4 md:p-10">
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl bg-card border border-border"
          >
            <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-border hover:border-gold">
              <X className="h-4 w-4" />
            </button>
            <div className="p-6 md:p-8">
              <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{form.id ? "Edit" : "New"}</div>
              <h2 className="font-display text-3xl truncate">{form.id ? form.title : "Add artwork"}</h2>

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
                      if (f) onFile(f);
                      e.target.value = "";
                    }}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center justify-center gap-2 border border-gold/60 text-gold px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-gold/5 disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : form.image_url ? "Replace" : "Upload"}
                    </button>
                    <button
                      onClick={() => form.image_url && setCropSrc(form.image_url)}
                      disabled={!form.image_url || uploading}
                      className="inline-flex items-center justify-center gap-2 border border-border px-3 py-2 text-xs uppercase tracking-[0.2em] hover:border-gold disabled:opacity-40"
                    >
                      <Crop className="h-3.5 w-3.5" /> Re-crop
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Upload opens the cropper. Vertical 4:5 looks best in the grid.
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
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">Set 0 to hide the buy button (inquiry only).</p>
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
                      rows={3}
                      className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                    />
                  </Field>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.sold}
                      onChange={(e) => setForm((f) => ({ ...f, sold: e.target.checked }))}
                    />
                    <span className="text-sm">Mark as sold</span>
                  </label>
                </div>
              </div>

              {/* SEO + accessibility */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">Search & accessibility</div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Alt text">
                    <input
                      value={form.alt_text ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, alt_text: e.target.value }))}
                      placeholder="Describe the image for screen readers"
                      className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                    />
                  </Field>
                  <Field label="SEO title">
                    <input
                      value={form.seo_title ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value }))}
                      placeholder="Browser tab + Google title"
                      className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                    />
                  </Field>
                  <Field label="SEO description">
                    <textarea
                      value={form.seo_description ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))}
                      rows={2}
                      placeholder="One-sentence pitch — appears under the Google result"
                      className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-gold outline-none md:col-span-2"
                    />
                  </Field>
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

      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          aspect={4 / 5}
          onCancel={() => { setCropSrc(null); }}
          onCropped={onCropped}
        />
      )}
    </>
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
