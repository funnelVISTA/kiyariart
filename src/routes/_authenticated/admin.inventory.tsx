import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Search, X } from "lucide-react";
import { ARTWORKS } from "@/lib/artworks";
import { adminListInventory, adminSetArtworkSold } from "@/lib/admin-extra.functions";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Admin · art by KIYARI" }, { name: "robots", content: "noindex" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "sold">("all");

  const invQ = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: () => adminListInventory(),
  });

  const soldDynamic = useMemo(
    () => new Set((invQ.data?.sold ?? []).map((s) => s.artwork_id)),
    [invQ.data],
  );

  const rows = useMemo(() => {
    return ARTWORKS.map((a) => {
      const isSold = a.sold || soldDynamic.has(a.id);
      return { ...a, isSold, soldDynamic: soldDynamic.has(a.id) };
    }).filter((a) => {
      if (filter === "available" && a.isSold) return false;
      if (filter === "sold" && !a.isSold) return false;
      if (search) {
        const s = search.toLowerCase();
        return a.title.toLowerCase().includes(s) || a.id.toLowerCase().includes(s) || a.collection.toLowerCase().includes(s);
      }
      return true;
    });
  }, [soldDynamic, filter, search]);

  const toggle = async (id: string, sold: boolean) => {
    try {
      await adminSetArtworkSold({ data: { artworkId: id, sold } });
      toast.success(sold ? "Marked as sold" : "Restocked");
      qc.invalidateQueries({ queryKey: ["admin", "inventory"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    }
  };

  const counts = useMemo(() => {
    let avail = 0, sold = 0;
    for (const a of ARTWORKS) {
      const s = a.sold || soldDynamic.has(a.id);
      if (s) sold++; else avail++;
    }
    return { all: ARTWORKS.length, available: avail, sold };
  }, [soldDynamic]);

  return (
    <div className="pt-10 pb-20">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
            <h1 className="font-display text-5xl md:text-6xl">Inventory</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Toggle availability per artwork. Sold pieces won't appear in checkout.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <Stat label="All works" value={counts.all} />
          <Stat label="Available" value={counts.available} accent />
          <Stat label="Sold" value={counts.sold} />
        </div>

        <div className="mt-8 flex flex-wrap gap-2 items-center border-b border-border pb-5">
          {(["all", "available", "sold"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] border transition ${
                filter === s ? "border-gold text-gold bg-gold/5" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
          <div className="ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, id, collection…"
              className="pl-9 pr-3 py-2 bg-card border border-border text-xs w-64 focus:border-gold outline-none"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {invQ.isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
          {rows.map((a) => (
            <div key={a.id} className="border border-border bg-card/40 overflow-hidden group">
              <div className="aspect-[4/5] overflow-hidden bg-background relative">
                <img
                  src={a.image}
                  alt={a.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <div
                  className={`absolute top-2 right-2 text-[10px] uppercase tracking-[0.2em] px-2 py-1 ${
                    a.isSold ? "bg-background/80 text-muted-foreground" : "bg-gold/90 text-primary-foreground"
                  }`}
                >
                  {a.isSold ? "Sold" : "Available"}
                </div>
              </div>
              <div className="p-4">
                <div className="font-display text-xl">{a.title}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">{a.collection}</div>
                <div className="mt-2 text-sm">
                  {a.price > 0 ? (
                    <span className="text-gold">${a.price.toLocaleString()} CAD</span>
                  ) : (
                    <span className="text-muted-foreground">Not priced</span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  {a.isSold ? (
                    <button
                      onClick={() => toggle(a.id, false)}
                      disabled={a.sold && !a.soldDynamic}
                      title={a.sold && !a.soldDynamic ? "Marked sold in the catalog file; edit artworks.ts to restock." : ""}
                      className="flex-1 inline-flex items-center justify-center gap-2 border border-border px-3 py-2 text-[11px] uppercase tracking-[0.2em] hover:border-gold transition disabled:opacity-40"
                    >
                      <Check className="h-3.5 w-3.5" /> Mark available
                    </button>
                  ) : (
                    <button
                      onClick={() => toggle(a.id, true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 border border-accent/50 text-accent px-3 py-2 text-[11px] uppercase tracking-[0.2em] hover:bg-accent/10 transition"
                    >
                      <X className="h-3.5 w-3.5" /> Mark sold
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`border border-border p-4 ${accent ? "bg-gold/5 border-gold/40" : "bg-card/40"}`}>
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl mt-1 ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}
