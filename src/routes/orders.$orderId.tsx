import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Package, Truck, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { getOrderForCustomer } from "@/lib/payments.functions";

export const Route = createFileRoute("/orders/$orderId")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { email?: string } => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  head: () => ({ meta: [{ title: "Order status — art by KIYARI" }] }),
  component: OrderStatusPage,
});

type Order = {
  id: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  shipping_address: string | null;
  items: Array<{ title: string; quantity: number; unit_amount?: number }>;
  amount_total_cad: number | null;
  total_cad: number;
  created_at: string;
  updated_at: string;
};

const STEPS = [
  { key: "paid", label: "Payment received", Icon: CheckCircle2 },
  { key: "processing", label: "Being prepared", Icon: Package },
  { key: "shipped", label: "Shipped", Icon: Truck },
  { key: "delivered", label: "Delivered", Icon: CheckCircle2 },
];

function statusIndex(status: string) {
  const i = STEPS.findIndex((s) => s.key === status.toLowerCase());
  return i === -1 ? 0 : i;
}

function OrderStatusPage() {
  const { orderId } = Route.useParams();
  const { email: prefill } = Route.useSearch();
  const [email, setEmail] = useState(prefill ?? "");
  const [submitted, setSubmitted] = useState(!!prefill);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submitted || !email) return;
    setLoading(true);
    setError(null);
    getOrderForCustomer({ data: { orderId, email } })
      .then((res) => {
        if (res.found) setOrder(res.order as Order);
        else setError("We couldn't find an order matching that email. Double-check the address used at checkout.");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Lookup failed"))
      .finally(() => setLoading(false));
  }, [submitted, email, orderId]);

  return (
    <div className="min-h-screen px-4 py-32">
      <div className="max-w-3xl mx-auto">
        <div className="text-xs uppercase tracking-[0.3em] text-gold">Order status</div>
        <h1 className="font-display text-4xl md:text-5xl mt-2">Your order</h1>
        <div className="mt-1 text-xs text-muted-foreground font-mono">
          Reference {orderId.slice(0, 8).toUpperCase()}
        </div>

        {!submitted && (
          <form
            className="mt-10 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.includes("@")) setSubmitted(true);
            }}
          >
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Confirm the email used at checkout
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-3 w-full bg-transparent border border-border px-4 py-3 text-sm focus:border-gold outline-none"
            />
            <button
              type="submit"
              className="mt-4 bg-gradient-gold text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em]"
            >
              View order
            </button>
          </form>
        )}

        {submitted && loading && (
          <div className="mt-16 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading your order…
          </div>
        )}

        {submitted && error && (
          <div className="mt-12 border border-accent/40 bg-accent/5 p-6 text-sm">
            <div className="flex items-center gap-2 text-accent">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
            <button
              onClick={() => { setSubmitted(false); setError(null); }}
              className="mt-4 underline text-gold text-xs uppercase tracking-[0.2em]"
            >
              Try a different email
            </button>
          </div>
        )}

        {order && (
          <div className="mt-12 space-y-12">
            {/* Status tracker */}
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">
                Progress
              </div>
              <div className="grid grid-cols-4 gap-2">
                {STEPS.map((s, i) => {
                  const reached = i <= statusIndex(order.status);
                  return (
                    <div key={s.key} className="text-center">
                      <div
                        className={`mx-auto h-10 w-10 rounded-full grid place-items-center border ${
                          reached
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {reached ? <s.Icon className="h-5 w-5" /> : <Clock className="h-4 w-4" />}
                      </div>
                      <div className={`mt-2 text-[10px] uppercase tracking-[0.15em] ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 text-xs text-muted-foreground">
                Last updated {new Date(order.updated_at).toLocaleString()}
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
                Items
              </div>
              <div className="border-t border-border">
                {order.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between py-3 border-b border-border text-sm">
                    <span>
                      {i.title} <span className="text-muted-foreground">× {i.quantity}</span>
                    </span>
                    {i.unit_amount !== undefined && (
                      <span className="text-gold">${(i.unit_amount * i.quantity).toLocaleString()}</span>
                    )}
                  </div>
                ))}
                <div className="flex justify-between pt-4 text-sm">
                  <span className="text-muted-foreground">Total paid</span>
                  <span className="text-gold font-medium">
                    ${Number(order.amount_total_cad ?? order.total_cad).toLocaleString()} CAD
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping */}
            {order.shipping_address && (
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
                  Shipping to
                </div>
                <div className="text-sm">
                  {order.customer_name && <div>{order.customer_name}</div>}
                  <div className="text-muted-foreground">{order.shipping_address}</div>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground border-t border-border pt-6">
              Questions? Reply to your receipt email or reach Kiyari at{" "}
              <a href="mailto:kiyarisart@gmail.com" className="text-gold underline">
                kiyarisart@gmail.com
              </a>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
