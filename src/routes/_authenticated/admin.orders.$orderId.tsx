import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Mail, Send, Truck, RotateCcw } from "lucide-react";
import { adminUpdateOrder, adminResendReceipt, adminResendShipped } from "@/lib/admin.functions";
import { adminGetOrder } from "@/lib/admin-extra.functions";
import { adminRefundOrder } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

// Statuses admins can set manually. Refunded is set by the Refund button
// (which triggers Stripe + webhook), not by clicking a status pill.
const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
type ManualStatus = (typeof STATUSES)[number];
type Status = ManualStatus | "refunded";

const CARRIERS = ["Canada Post", "UPS", "FedEx", "Purolator", "DHL", "USPS", "Other"];

export const Route = createFileRoute("/_authenticated/admin/orders/$orderId")({
  head: () => ({ meta: [{ title: "Order detail — Admin · art by KIYARI" }, { name: "robots", content: "noindex" }] }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const q = useQuery({
    queryKey: ["admin", "order", orderId],
    queryFn: () => adminGetOrder({ data: { orderId } }),
  });

  if (q.isLoading) return <div className="pt-20 text-center text-muted-foreground">Loading order…</div>;
  if (q.isError) {
    return (
      <div className="pt-20 container-page max-w-xl text-center">
        <p className="text-accent text-sm">Failed to load order.</p>
        <Link to="/admin/orders" className="mt-4 inline-block underline text-xs uppercase tracking-[0.2em]">
          Back to orders
        </Link>
      </div>
    );
  }

  const order = q.data!.order as any;
  const emails = q.data!.emails;
  const items = Array.isArray(order.items) ? order.items : [];

  const setStatus = async (status: ManualStatus) => {
    try {
      await adminUpdateOrder({ data: { orderId, status } });
      toast.success(`Marked ${status}`);
      qc.invalidateQueries({ queryKey: ["admin", "order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const subtotal = items.reduce((s: number, i: any) => s + Number(i.price ?? i.unit_amount ?? i.unit_amount_cad ?? 0) * Number(i.qty ?? i.quantity ?? 1), 0);
  const total = Number(order.amount_total_cad ?? order.total_cad ?? 0);

  return (
    <div className="pt-10 pb-20">
      <div className="container-page">
        <button
          onClick={() => navigate({ to: "/admin/orders" })}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
        </button>

        <div className="mt-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Order</div>
            <h1 className="font-display text-4xl md:text-5xl break-all">{order.customer_name ?? "—"}</h1>
            <div className="mt-1 text-xs text-muted-foreground">
              <code>{order.id}</code> · {new Date(order.created_at).toLocaleString()}
            </div>
          </div>
          <StatusPill status={order.status} />
        </div>

        <div className="mt-10 grid lg:grid-cols-3 gap-6">
          {/* Items */}
          <section className="lg:col-span-2 border border-border bg-card/40">
            <header className="p-4 border-b border-border text-xs uppercase tracking-[0.2em] text-gold">
              Items ({items.length})
            </header>
            <ul className="divide-y divide-border">
              {items.map((it: any, idx: number) => {
                const price = Number(it.price ?? it.unit_amount ?? it.unit_amount_cad ?? 0);
                const qty = Number(it.qty ?? it.quantity ?? 1);
                return (
                  <li key={idx} className="p-4 flex gap-4 items-center">
                    {it.image && (
                      <img src={it.image} alt={it.title} className="h-16 w-16 object-cover border border-border" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-lg truncate">{it.title}</div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                        {it.collection ?? it.id ?? ""}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gold">${price.toLocaleString()}</div>
                      <div className="text-[11px] text-muted-foreground">× {qty}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="p-4 border-t border-border text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-display text-xl">
                <span>Total</span>
                <span className="text-gold">${total.toLocaleString()} CAD</span>
              </div>
            </div>
          </section>

          {/* Customer */}
          <section className="border border-border bg-card/40 p-4 space-y-3 text-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-gold">Customer</div>
            <Row k="Email" v={order.customer_email ?? "—"} />
            <Row k="Phone" v={order.customer_phone ?? "—"} />
            <Row k="Address" v={<span className="whitespace-pre-wrap">{order.shipping_address ?? "—"}</span>} />
            {order.notes && <Row k="Notes" v={order.notes} />}
            {order.stripe_session_id && (
              <Row
                k="Stripe"
                v={
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://dashboard.stripe.com/test/payments/${order.payment_intent_id ?? order.stripe_session_id}`}
                    className="text-gold inline-flex items-center gap-1 text-xs underline"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                }
              />
            )}
            <ResendButton orderId={orderId} />
            <RefundButton
              orderId={orderId}
              status={order.status}
              onRefunded={() => qc.invalidateQueries({ queryKey: ["admin", "order", orderId] })}
            />
          </section>
        </div>

        {/* Status + tracking */}
        <section className="mt-6 grid lg:grid-cols-2 gap-6">
          <div className="border border-border bg-card/40 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3">Status</div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  disabled={order.status === s}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] border transition ${
                    order.status === s
                      ? "border-gold text-gold bg-gold/10 cursor-default"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <Timeline order={order} />
          </div>

          <TrackingEditor order={order} onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "order", orderId] })} />
        </section>

        {/* Email log */}
        <section className="mt-6 border border-border bg-card/40">
          <header className="p-4 border-b border-border text-xs uppercase tracking-[0.2em] text-gold flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" /> Email activity
          </header>
          {emails.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No emails sent yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Template</th>
                  <th className="text-left p-3">To</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">When</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((e: any, i: number) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-3">{e.template_name}</td>
                    <td className="p-3 text-muted-foreground">{e.recipient_email}</td>
                    <td className="p-3">
                      <span className={e.status === "sent" ? "text-gold" : e.status === "failed" ? "text-accent" : "text-muted-foreground"}>
                        {e.status}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 text-[10px] uppercase tracking-[0.2em] text-muted-foreground pt-0.5">{k}</span>
      <span className="flex-1">{v}</span>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const tone: Record<Status, string> = {
    pending: "border-border text-muted-foreground",
    paid: "border-gold text-gold bg-gold/5",
    shipped: "border-foreground text-foreground",
    delivered: "border-emerald-500/50 text-emerald-400",
    cancelled: "border-accent/50 text-accent",
    refunded: "border-accent/60 text-accent bg-accent/5",
  };
  return (
    <span className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] border ${tone[status]}`}>{status}</span>
  );
}

function Timeline({ order }: { order: any }) {
  const events = [
    { label: "Created", at: order.created_at },
    { label: "Paid", at: order.status !== "pending" ? order.updated_at : null },
    { label: "Shipped", at: order.shipped_at },
    { label: "Delivered", at: order.delivered_at },
  ].filter((e) => e.at);
  return (
    <ol className="mt-5 space-y-2 text-xs">
      {events.map((e) => (
        <li key={e.label} className="flex gap-3">
          <span className="text-muted-foreground w-20">{e.label}</span>
          <span>{new Date(e.at).toLocaleString()}</span>
        </li>
      ))}
    </ol>
  );
}

function TrackingEditor({ order, onSaved }: { order: any; onSaved: () => void }) {
  const [carrier, setCarrier] = useState(order.tracking_carrier ?? "Canada Post");
  const [number, setNumber] = useState(order.tracking_number ?? "");
  const [url, setUrl] = useState(order.tracking_url ?? "");
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const shippedAt = order.shipped_at as string | null;

  const save = async (markShipped: boolean) => {
    if (markShipped) {
      if (!number.trim()) {
        toast.error("Enter a tracking number before sending the shipped email");
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
          tracking_url: url || null,
          ...(markShipped ? { status: "shipped" as const } : {}),
        },
      });
      toast.success(markShipped ? "Marked shipped — tracking email sent" : "Tracking saved");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const resendShipped = async () => {
    if (!number.trim()) {
      toast.error("Enter a tracking number first");
      return;
    }
    const ok = window.confirm(
      `Resend shipped email to ${order.customer_email ?? "customer"}?`,
    );
    if (!ok) return;
    setResending(true);
    try {
      const r = await adminResendShipped({ data: { orderId: order.id } });
      toast.success(`Shipped email resent to ${r.sentTo}`);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="border border-border bg-card/40 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3 flex items-center gap-2">
        <Truck className="h-3.5 w-3.5" /> Shipping & tracking
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Carrier</span>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="mt-1 w-full bg-card border border-border px-2 py-2 text-sm focus:border-gold outline-none"
            >
              {CARRIERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tracking #</span>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="mt-1 w-full bg-card border border-border px-2 py-2 text-sm font-mono focus:border-gold outline-none"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tracking URL (optional)</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full bg-card border border-border px-2 py-2 text-sm focus:border-gold outline-none"
          />
        </label>
        <div className="flex gap-2 pt-2">
          <button
            disabled={saving}
            onClick={() => save(false)}
            className="border border-border px-4 py-2 text-[11px] uppercase tracking-[0.2em] hover:border-gold transition disabled:opacity-50"
          >
            Save tracking
          </button>
          {shippedAt ? (
            <button
              disabled={resending || !number.trim()}
              onClick={resendShipped}
              title={!number.trim() ? "Enter a tracking number first" : "Resend shipped email"}
              className="border border-gold/40 text-gold px-4 py-2 text-[11px] uppercase tracking-[0.2em] hover:bg-gold/10 transition disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Send className="h-3 w-3" /> {resending ? "Sending…" : "Resend shipped email"}
            </button>
          ) : (
            <button
              disabled={saving || !number.trim()}
              onClick={() => save(true)}
              title={!number.trim() ? "Enter a tracking number first" : "Send shipped email & mark shipped"}
              className="bg-gradient-gold text-primary-foreground px-4 py-2 text-[11px] uppercase tracking-[0.2em] hover:opacity-90 transition disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Send className="h-3 w-3" /> Send shipped email
            </button>
          )}
        </div>
        {shippedAt && (
          <p className="pt-2 text-[11px] text-muted-foreground">
            Shipped email sent on{" "}
            <span className="text-foreground">{new Date(shippedAt).toLocaleString()}</span>.
            Use Resend only if you need to correct tracking.
          </p>
        )}
      </div>
    </div>
  );
}

function ResendButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const r = await adminResendReceipt({ data: { orderId } });
      toast.success(`Receipt resent to ${r.sentTo}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={send}
      disabled={busy}
      className="mt-3 w-full inline-flex items-center justify-center gap-2 border border-gold/40 text-gold px-3 py-2 text-[11px] uppercase tracking-[0.2em] hover:bg-gold/10 transition disabled:opacity-50"
    >
      <Send className="h-3.5 w-3.5" /> {busy ? "Sending…" : "Resend receipt"}
    </button>
  );
}

function RefundButton({ orderId, status, onRefunded }: { orderId: string; status: Status; onRefunded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (status === "refunded" || status === "cancelled" || status === "pending") return null;

  const run = async () => {
    setBusy(true);
    try {
      const res = await adminRefundOrder({
        data: { orderId, environment: getStripeEnvironment() },
      });
      if ("error" in res) throw new Error(res.error);
      toast.success("Refund issued. Stripe will confirm via webhook.");
      onRefunded();
    } catch (e: any) {
      toast.error(e?.message ?? "Refund failed");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="mt-3 border border-accent/40 bg-accent/5 p-3 text-xs space-y-2">
        <div className="text-accent">Refund the full order in Stripe?</div>
        <div className="text-muted-foreground">
          Artworks will be marked available again. This can't be undone from the app.
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={run}
            disabled={busy}
            className="px-3 py-1.5 border border-accent text-accent hover:bg-accent/10 uppercase tracking-[0.2em] text-[10px] disabled:opacity-50"
          >
            {busy ? "Refunding…" : "Yes, refund"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="px-3 py-1.5 border border-border uppercase tracking-[0.2em] text-[10px]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="mt-3 inline-flex items-center gap-2 px-3 py-2 border border-accent/50 text-accent hover:bg-accent/10 uppercase tracking-[0.2em] text-[10px] transition"
    >
      <RotateCcw className="h-3.5 w-3.5" /> Refund order
    </button>
  );
}
