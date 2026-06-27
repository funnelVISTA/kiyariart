import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, RotateCcw, Save, Search } from "lucide-react";
import { ARTWORKS } from "@/lib/artworks";
import {
  adminAdjustArtworkSold,
  adminListInventory,
  adminSetArtworkSold,
  adminSetArtworkStock,
} from "@/lib/admin-extra.functions";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Admin · art by KIYARI" }, { name: "robots", content: "noindex" }] }),
  component: InventoryPage,
});

type StockRow = { total: number; sold: number };

function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "sold" | "low">("all");
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  const invQ = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: () => adminListInventory(),
  });

  const stockMap = useMemo(() => {
    const m = new Map<string, StockRow>();
    for (const s of invQ.data?.stock ?? []) {
      m.set(s.artwork_id, { total: s.total_units, sold: s.sold_units });
    }
    return m;
  }, [invQ.data]);

  const legacySold = useMemo(
    () => new Set((invQ.data?.sold ?? []).map((s) => s.artwork_id)),
    [invQ.data],
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "inventory"] });

  const rows = useMemo(() => {
    return ARTWORKS.map((a) => {
      const s = stockMap.get(a.id);
      const total = s?.total ?? (a.sold ? 0 : 1);
      const sold = s?.sold ?? (a.sold || legacySold.has(a.id) ? total : 0);
      const left = Math.max(0, total - sold);
      const isSold = left <= 0;
      return { ...a, total, soldUnits: sold, left, isSold };
    }).filter((a) => {
      if (filter === "available" && a.isSold) return false;
      if (filter === "sold" && !a.isSold) return false;
      if (filter === "low" && (a.isSold || a.left > 2)) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          a.title.toLowerCase().includes(s) ||
          a.id.toLowerCase().includes(s) ||
          a.collection.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [stockMap, legacySold, filter, search]);

  const counts = useMemo(() => {
    let avail = 0, sold = 0, units = 0;
    for (const a of ARTWORKS) {
      const s = stockMap.get(a.id);
      const total = s?.total ?? (a.sold ? 0 : 1);
      const soldU = s?.sold ?? (a.sold || legacySold.has(a.id) ? total : 0);
      const left = Math.max(0, total - soldU);
      units += left;
      if (left > 0) avail++; else sold++;
    }
    return { all: ARTWORKS.length, available: avail, sold, units };
  }, [stockMap, legacySold]);

  const adjust = async (id: string, delta: 1 | -1) => {
    try {
      await adminAdjustArtworkSold({ data: { artworkId: id, delta } });
      toast.success(delta === 1 ? "Marked one sold" : "Restocked one");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    }
  };

  const saveTotal = async (id: string, current: number, currentSold: number) => {
    const next = drafts[id];
    if (next == null || next === current) return;
    try {
      await adminSetArtworkStock({
        data: {
          artworkId: id,
          total: next,
          sold: Math.min(currentSold, next),
        },
      });
      setDrafts((d) => {
        const c = { ...d };
        delete c[id];
        return c;
      });
      toast.success(`Total set to ${next}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    }
  };

  const resetSold = async (id: string) => {
    try {
      await adminSetArtworkSold({ data: { artworkId: id, sold: false } });
      await adminSetArtworkStock({ data: { artworkId: id, total: 1, sold: 0 } });
      toast.success("Restocked to 1 unit");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    }
  };

  return (
    <div className="pt-10 pb-20">
      <div className="container-page">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
          <h1 className="font-display text-5xl md:text-6xl">Inventory</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set how many units of each piece you have. Stock auto-decrements when a Stripe payment succeeds.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="All works" value={counts.all} />
          <Stat label="Available works" value={counts.available} accent />
          <Stat label="Sold out works" value={counts.sold} />
          <Stat label="Units in stock" value={counts.units} accent />
        </div>

        <div className="mt-8 flex flex-wrap gap-2 items-center border-b border-border pb-5">
          {(["all", "available", "low", "sold"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] border transition ${
                filter === s ? "border-gold text-gold bg-gold/5" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "low" ? "Low stock" : s}
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
          {rows.map((a) => {
            const draft = drafts[a.id];
            const totalShown = draft ?? a.total;
            const dirty = draft != null && draft !== a.total;
            return (
              <div key={a.id} className="border border-border bg-card/40 overflow-hidden">
                <div className="aspect-[4/5] overflow-hidden bg-background relative">
                  <img src={a.image} alt={a.title} loading="lazy" className="h-full w-full object-cover" />
                  <div
                    className={`absolute top-2 right-2 text-[10px] uppercase tracking-[0.2em] px-2 py-1 ${
                      a.isSold
                        ? "bg-background/80 text-muted-foreground border border-border"
                        : a.left <= 2
                        ? "bg-accent/80 text-background"
                        : "bg-gold/90 text-primary-foreground"
                    }`}
                  >
                    {a.isSold ? "Sold out" : `${a.left} / ${a.total} left`}
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-display text-xl">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">{a.collection}</div>
                  <div className="mt-1 text-sm">
                    {a.price > 0 ? (
                      <span className="text-gold">${a.price.toLocaleString()} CAD</span>
                    ) : (
                      <span className="text-muted-foreground">Not priced</span>
                    )}
                  </div>

                  {/* Sold counter row */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Sold</div>
                      <div className="mt-1 flex items-center gap-1 border border-border">
                        <button
                          onClick={() => adjust(a.id, -1)}
                          disabled={a.soldUnits <= 0}
                          className="px-2 py-1.5 hover:bg-gold/10 disabled:opacity-30"
                          title="Restock one unit"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex-1 text-center font-display text-lg">{a.soldUnits}</div>
                        <button
                          onClick={() => adjust(a.id, +1)}
                          disabled={a.soldUnits >= a.total}
                          className="px-2 py-1.5 hover:bg-gold/10 disabled:opacity-30"
                          title="Mark one as sold"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Total units</div>
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={9999}
                          value={totalShown}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [a.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))
                          }
                          className="w-full bg-background border border-border px-2 py-1.5 text-center text-sm focus:border-gold outline-none"
                        />
                        <button
                          onClick={() => saveTotal(a.id, a.total, a.soldUnits)}
                          disabled={!dirty}
                          className="px-2 py-1.5 border border-gold/50 text-gold disabled:opacity-30 hover:bg-gold/10"
                          title="Save total"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => resetSold(a.id)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold transition"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset to 1 available
                  </button>
                </div>
              </div>
            );
          })}
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
