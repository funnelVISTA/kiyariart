import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminGetAnalytics } from "@/lib/admin-extra.functions";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin · art by KIYARI" }, { name: "robots", content: "noindex" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const q = useQuery({ queryKey: ["admin", "analytics"], queryFn: () => adminGetAnalytics() });
  const data = q.data;

  return (
    <div className="pt-10 pb-20">
      <div className="container-page">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
        <h1 className="font-display text-5xl md:text-6xl">Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">Revenue, orders, and best-selling works.</p>

        {q.isLoading && <p className="mt-8 text-muted-foreground text-sm">Loading…</p>}
        {q.isError && <p className="mt-8 text-accent text-sm">Failed to load analytics.</p>}

        {data && (
          <>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Total revenue" value={`$${Math.round(data.totals.revenue).toLocaleString()}`} accent />
              <Stat label="Orders" value={String(data.totals.orders)} />
              <Stat label="Avg order" value={`$${Math.round(data.totals.avgOrder).toLocaleString()}`} />
              <Stat label="Customers" value={String(data.totals.customers)} />
            </div>

            <section className="mt-10">
              <h2 className="font-display text-2xl mb-4">Last 30 days</h2>
              <RevenueChart series={data.days} />
            </section>

            <section className="mt-10 grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="font-display text-2xl mb-4">Status breakdown</h2>
                <StatusBars byStatus={data.byStatus} />
              </div>
              <div>
                <h2 className="font-display text-2xl mb-4">Top works</h2>
                <ol className="border border-border bg-card/40 divide-y divide-border">
                  {data.topItems.length === 0 && (
                    <li className="p-4 text-sm text-muted-foreground">No sales yet.</li>
                  )}
                  {data.topItems.map((it, i) => (
                    <li key={it.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <span className="font-display text-lg">{it.title}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-gold text-sm">${Math.round(it.revenue).toLocaleString()}</div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {it.count} sold
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`border border-border p-4 ${accent ? "bg-gold/5 border-gold/40" : "bg-card/40"}`}>
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl mt-1 ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

function RevenueChart({ series }: { series: { date: string; revenue: number; orders: number }[] }) {
  const max = useMemo(() => Math.max(1, ...series.map((d) => d.revenue)), [series]);
  const W = 800, H = 220, P = 30;
  const stepX = (W - P * 2) / Math.max(1, series.length - 1);
  const points = series.map((d, i) => {
    const x = P + i * stepX;
    const y = H - P - (d.revenue / max) * (H - P * 2);
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${points[points.length - 1][0].toFixed(1)},${H - P} L${points[0][0].toFixed(1)},${H - P} Z`;
  return (
    <div className="border border-border bg-card/40 p-4 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]">
        <defs>
          <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="text-gold">
          <path d={area} fill="url(#grad)" />
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
          {points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="currentColor">
              <title>{`${series[i].date}: $${Math.round(series[i].revenue).toLocaleString()} · ${series[i].orders} orders`}</title>
            </circle>
          ))}
        </g>
        <text x={P} y={H - 6} fontSize="10" fill="currentColor" className="text-muted-foreground">
          {series[0]?.date}
        </text>
        <text x={W - P} y={H - 6} fontSize="10" textAnchor="end" fill="currentColor" className="text-muted-foreground">
          {series[series.length - 1]?.date}
        </text>
      </svg>
    </div>
  );
}

function StatusBars({ byStatus }: { byStatus: Record<string, number> }) {
  const order = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
  const max = Math.max(1, ...order.map((k) => byStatus[k] ?? 0));
  return (
    <div className="border border-border bg-card/40 p-5 space-y-3">
      {order.map((k) => {
        const v = byStatus[k] ?? 0;
        const pct = (v / max) * 100;
        return (
          <div key={k}>
            <div className="flex justify-between text-[11px] uppercase tracking-[0.2em] mb-1">
              <span className="text-muted-foreground">{k}</span>
              <span>{v}</span>
            </div>
            <div className="h-2 bg-background border border-border overflow-hidden">
              <div className="h-full bg-gradient-gold" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
