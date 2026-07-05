import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mail,
  RefreshCw,
  Search,
  Truck,
  Send,
  ExternalLink,
} from "lucide-react";

import { sendTransactionalEmail } from "@/lib/email/send";
import { adminUpdateOrder } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Admin · art by KIYARI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOrdersPage,
});

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

type Order = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  notes: string | null;
  items: Array<{ id?: string; title: string; image?: string; collection?: string; price?: number; qty?: number; quantity?: number; unit_amount?: number }>;
  total_cad: number;
  amount_total_cad: number | null;
  status: Status;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

const CARRIERS = ["Canada Post", "UPS", "FedEx", "Purolator", "DHL", "USPS", "Other"];

function carrierTrackingUrl(carrier: string | null, num: string | null): string {
  if (!num) return "";
  switch (carrier) {
    case "Canada Post":
      return `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${encodeURIComponent(num)}`;
    case "UPS":
      return `https://www.ups.com/track?tracknum=${encodeURIComponent(num)}`;
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(num)}`;
    case "Purolator":
      return `https://www.purolator.com/en/shipping/tracker?pin=${encodeURIComponent(num)}`;
    case "DHL":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(num)}`;
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(num)}`;
    default:
      return "";
  }
}

function AdminOrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const ordersQ = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Order[];
    },
  });

  const filtered = useMemo(() => {
    const list = ordersQ.data ?? [];
    return list.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          (o.customer_name ?? "").toLowerCase().includes(s) ||
          (o.customer_email ?? "").toLowerCase().includes(s) ||
          o.id.toLowerCase().includes(s) ||
          (o.tracking_number ?? "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [ordersQ.data, filter, search]);

  // When search is active, aggregate matched orders by customer (email preferred, else name).
  const customerSummary = useMemo(() => {
    if (!search.trim()) return null;
    const groups = new Map<
      string,
      { key: string; name: string; email: string; count: number; lifetime: number; firstOrder: string; lastOrder: string }
    >();
    for (const o of filtered) {
      const key = (o.customer_email ?? o.customer_name ?? "unknown").toLowerCase();
      const existing = groups.get(key);
      const amt = Number(o.amount_total_cad ?? o.total_cad ?? 0);
      if (existing) {
        existing.count++;
        if (o.status !== "cancelled") existing.lifetime += amt;
        if (o.created_at < existing.firstOrder) existing.firstOrder = o.created_at;
        if (o.created_at > existing.lastOrder) existing.lastOrder = o.created_at;
      } else {
        groups.set(key, {
          key,
          name: o.customer_name ?? "—",
          email: o.customer_email ?? "—",
          count: 1,
          lifetime: o.status === "cancelled" ? 0 : amt,
          firstOrder: o.created_at,
          lastOrder: o.created_at,
        });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [filtered, search]);

  // Full lifetime order count per customer key (across ALL orders, not just filtered),
  // so each row can show "Nth order from this customer".
  const customerOrderCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of ordersQ.data ?? []) {
      const key = (o.customer_email ?? o.customer_name ?? "unknown").toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [ordersQ.data]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, pending: 0, paid: 0, shipped: 0, delivered: 0, cancelled: 0 };
    (ordersQ.data ?? []).forEach((o) => {
      c.all++;
      c[o.status]++;
    });
    return c;
  }, [ordersQ.data]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["orders"] });

  const setStatus = async (id: string, status: Status) => {
    try {
      await adminUpdateOrder({ data: { orderId: id, status } });
      toast.success(`Marked as ${status}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    }
  };

  const [sendingTest, setSendingTest] = useState(false);
  const sendTest = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const to = userData.user?.email;
    if (!to) {
      toast.error("No email on your account");
      return;
    }
    setSendingTest(true);
    try {
      await sendTransactionalEmail({
        templateName: "test-email",
        recipientEmail: to,
        idempotencyKey: `test-${Date.now()}`,
        templateData: { recipientName: userData.user?.user_metadata?.name || "" },
      });
      toast.success(`Test email queued to ${to}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setSendingTest(false);
    }
  };

  const revenue = (ordersQ.data ?? [])
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total_cad), 0);

  return (
    <div className="pt-10 pb-20">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
            <h1 className="font-display text-5xl md:text-6xl">Orders</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={sendTest}
              disabled={sendingTest}
              className="inline-flex items-center gap-2 border border-gold/40 text-gold px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-gold/10 transition disabled:opacity-60"
            >
              <Mail className="h-3.5 w-3.5" /> {sendingTest ? "Sending…" : "Send test email"}
            </button>
            <button
              onClick={() => ordersQ.refetch()}
              className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:border-gold transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${ordersQ.isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>


        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total orders" value={counts.all.toString()} />
          <Stat label="Awaiting shipment" value={counts.paid.toString()} />
          <Stat label="Shipped" value={counts.shipped.toString()} />
          <Stat label="Revenue (CAD)" value={`$${revenue.toLocaleString()}`} accent />
        </div>

        <div className="mt-8 flex flex-wrap gap-2 items-center border-b border-border pb-5">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] border transition ${
                filter === s
                  ? "border-gold text-gold bg-gold/5"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}{" "}
              {counts[s] != null && <span className="opacity-60 ml-1">({counts[s]})</span>}
            </button>
          ))}
          <div className="ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, id, tracking…"
              className="pl-9 pr-3 py-2 bg-card border border-border text-xs w-64 focus:border-gold outline-none"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {ordersQ.isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
          {ordersQ.isError && <p className="text-accent text-sm">Failed to load orders.</p>}
          {!ordersQ.isLoading && filtered.length === 0 && (
            <p className="text-muted-foreground text-sm py-10 text-center">No orders match.</p>
          )}

          {customerSummary && customerSummary.length > 0 && (
            <div className="border border-gold/30 bg-gold/5 p-4 mb-2">
              <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">
                Matching customers ({customerSummary.length})
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {customerSummary.map((c) => (
                  <div key={c.key} className="flex items-center justify-between gap-3 border border-border/60 bg-background/60 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-display text-base truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        First: {new Date(c.firstOrder).toLocaleDateString()} · Last:{" "}
                        {new Date(c.lastOrder).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-gold font-display text-lg leading-none">{c.count}</div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                        {c.count === 1 ? "order" : "orders"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ${c.lifetime.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filtered.map((o) => {
            const isOpen = expanded === o.id;
            const custKey = (o.customer_email ?? o.customer_name ?? "unknown").toLowerCase();
            const lifetime = customerOrderCount.get(custKey) ?? 1;
            return (
              <div key={o.id} className="border border-border bg-card/40">
                <button
                  onClick={() => setExpanded(isOpen ? null : o.id)}
                  className="w-full grid grid-cols-12 gap-3 p-4 text-left hover:bg-card/80 transition"
                >
                  <div className="col-span-12 md:col-span-4">
                    <div className="font-display text-lg flex items-center gap-2">
                      {o.customer_name ?? "—"}
                      {lifetime > 1 && (
                        <span
                          className="text-[9px] uppercase tracking-[0.2em] text-gold border border-gold/40 px-1.5 py-0.5"
                          title={`This customer has ${lifetime} orders total`}
                        >
                          ×{lifetime}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{o.customer_email ?? "—"}</div>
                  </div>
                  <div className="col-span-6 md:col-span-2 text-sm">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-[0.2em]">Items</div>
                    {o.items?.length ?? 0}
                  </div>
                  <div className="col-span-6 md:col-span-2 text-sm">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-[0.2em]">Total</div>
                    <span className="text-gold">
                      ${Number(o.amount_total_cad ?? o.total_cad).toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-6 md:col-span-2 text-xs text-muted-foreground self-center">
                    {new Date(o.created_at).toLocaleDateString()}
                  </div>
                  <div className="col-span-6 md:col-span-2 self-center flex items-center gap-2 flex-wrap">
                    <StatusPill status={o.status} />
                    {o.tracking_number && (
                      <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                        <Truck className="h-3 w-3" /> {o.tracking_number.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </button>

                <div className="px-4 pb-3 -mt-2 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em]">
                  <Link
                    to="/admin/orders/$orderId"
                    params={{ orderId: o.id }}
                    className="text-gold hover:underline inline-flex items-center gap-1"
                  >
                    Open detail <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <button
                    onClick={() => setExpanded(isOpen ? null : o.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isOpen ? "Hide quick actions" : "Quick actions"}
                  </button>
                </div>

                {isOpen && (
                  <OrderDetail order={o} onChanged={refresh} setStatus={setStatus} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrderDetail({
  order,
  onChanged,
  setStatus,
}: {
  order: Order;
  onChanged: () => void;
  setStatus: (id: string, s: Status) => void;
}) {
  const [carrier, setCarrier] = useState(order.tracking_carrier ?? "Canada Post");
  const [number, setNumber] = useState(order.tracking_number ?? "");
  const [url, setUrl] = useState(order.tracking_url ?? "");
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);

  const computedUrl = url || carrierTrackingUrl(carrier, number);

  const saveTracking = async (markShipped: boolean) => {
    if (markShipped) {
      if (!number.trim()) {
        toast.error("Enter a tracking number first");
        return;
      }
      const ok = window.confirm(
        `Send shipped email to ${order.customer_email ?? "customer"}?`,
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      await adminUpdateOrder({
        data: {
          orderId: order.id,
          tracking_carrier: carrier,
          tracking_number: number || null,
          tracking_url: url || carrierTrackingUrl(carrier, number) || null,
          ...(markShipped ? { status: "shipped" as Status } : {}),
        },
      });
      toast.success(
        markShipped ? "Marked shipped — tracking email sent" : "Tracking saved",
      );
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-border p-5 grid lg:grid-cols-2 gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3">Customer</div>
        <dl className="text-sm space-y-1.5">
          <Row k="Name" v={order.customer_name ?? "—"} />
          <Row k="Email" v={order.customer_email ?? "—"} />
          {order.customer_phone && <Row k="Phone" v={order.customer_phone} />}
          {order.shipping_address && <Row k="Address" v={order.shipping_address} />}
          {order.notes && <Row k="Notes" v={order.notes} />}
          <Row k="Order ID" v={<code className="text-xs">{order.id}</code>} />
          {order.shipped_at && (
            <Row k="Shipped" v={new Date(order.shipped_at).toLocaleString()} />
          )}
          {order.delivered_at && (
            <Row k="Delivered" v={new Date(order.delivered_at).toLocaleString()} />
          )}
        </dl>

        <div className="text-xs uppercase tracking-[0.2em] text-gold mt-6 mb-3">Update status</div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(order.id, s)}
              disabled={order.status === s}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] border transition ${
                order.status === s
                  ? "border-gold text-gold bg-gold/10 cursor-default"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="text-xs uppercase tracking-[0.2em] text-gold mt-6 mb-3">
          Shipping tracking
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Carrier
              </span>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="mt-1 w-full bg-card border border-border px-2 py-2 text-sm focus:border-gold outline-none"
              >
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Tracking #
              </span>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. 1Z999AA10123456784"
                className="mt-1 w-full bg-card border border-border px-2 py-2 text-sm font-mono focus:border-gold outline-none"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Tracking URL <span className="opacity-60">(optional — auto-generated if blank)</span>
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={computedUrl || "https://…"}
              className="mt-1 w-full bg-card border border-border px-2 py-2 text-xs focus:border-gold outline-none"
            />
          </label>
          {computedUrl && (
            <a
              href={computedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-gold inline-flex items-center gap-1 underline"
            >
              Preview tracking link <ExternalLink className="h-3 w-3" />
            </a>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => saveTracking(false)}
              disabled={saving}
              className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] border border-border hover:border-gold disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save tracking"}
            </button>
            <button
              onClick={() => saveTracking(true)}
              disabled={saving || !number}
              className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] bg-gradient-gold text-primary-foreground disabled:opacity-60 inline-flex items-center gap-2"
              title={!number ? "Add a tracking number first" : "Save & email customer"}
            >
              <Truck className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Mark shipped & notify"}
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3">Items</div>
        <ul className="space-y-3">
          {(order.items ?? []).map((it, i) => (
            <li key={i} className="flex gap-3 items-start">
              {it.image && (
                <img src={it.image} alt={it.title} className="h-16 w-16 object-cover" />
              )}
              <div className="flex-1">
                <div className="font-display">{it.title}</div>
                {it.collection && (
                  <div className="text-xs text-muted-foreground">{it.collection}</div>
                )}
                <div className="text-[10px] text-muted-foreground">
                  Qty {it.qty ?? it.quantity ?? 1}
                </div>
              </div>
              <div className="text-sm text-gold">
                {it.unit_amount !== undefined
                  ? `$${Number(it.unit_amount).toLocaleString()}`
                  : it.price !== undefined && it.price > 0
                    ? `$${it.price.toLocaleString()}`
                    : "—"}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-border p-4 bg-card/40">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl mt-1 ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground self-center">{k}</dt>
      <dd className="col-span-2 break-words">{v}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    pending: "bg-muted text-muted-foreground border-border",
    paid: "bg-gold/10 text-gold border-gold/40",
    shipped: "bg-blue-500/10 text-blue-400 border-blue-400/40",
    delivered: "bg-green-500/10 text-green-400 border-green-400/40",
    cancelled: "bg-accent/10 text-accent border-accent/40",
  };
  return (
    <span className={`inline-block px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] border ${map[status]}`}>
      {status}
    </span>
  );
}
