import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Search, Trash2 } from "lucide-react";
import { adminListSubscribers, adminDeleteSubscriber } from "@/lib/admin-extra.functions";

export const Route = createFileRoute("/_authenticated/admin/subscribers")({
  head: () => ({ meta: [{ title: "Subscribers — Admin · art by KIYARI" }, { name: "robots", content: "noindex" }] }),
  component: SubscribersPage,
});

function SubscribersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const q = useQuery({ queryKey: ["admin", "subscribers"], queryFn: () => adminListSubscribers() });
  const subs = q.data?.subscribers ?? [];

  const filtered = useMemo(() => {
    if (!search) return subs;
    const s = search.toLowerCase();
    return subs.filter(
      (x) => x.email.toLowerCase().includes(s) || (x.name ?? "").toLowerCase().includes(s),
    );
  }, [subs, search]);

  const remove = async (id: string, email: string) => {
    if (!confirm(`Remove ${email}?`)) return;
    try {
      await adminDeleteSubscriber({ data: { id } });
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin", "subscribers"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const exportCsv = () => {
    const header = "email,name,source,confirmed,created_at\n";
    const rows = filtered
      .map((s) =>
        [s.email, s.name ?? "", s.source ?? "", s.confirmed, s.created_at]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pt-10 pb-20">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
            <h1 className="font-display text-5xl md:text-6xl">Subscribers</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subs.length} on the list.</p>
          </div>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 border border-gold/40 text-gold px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-gold/10 transition disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>

        <div className="mt-8 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="pl-9 pr-3 py-2 bg-card border border-border text-xs w-full focus:border-gold outline-none"
          />
        </div>

        <div className="mt-6 border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/50 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Source</th>
                <th className="text-left p-3">Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {q.isLoading && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!q.isLoading && filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No subscribers.</td></tr>
              )}
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-card/40">
                  <td className="p-3">{s.email}</td>
                  <td className="p-3 text-muted-foreground">{s.name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{s.source ?? "—"}</td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => remove(s.id, s.email)}
                      className="inline-flex items-center gap-1 text-accent text-xs hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
