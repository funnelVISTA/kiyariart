import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertCircle, Share2, Copy, Facebook } from "lucide-react";
import { Mail, Package, Truck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { confirmCheckout } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/checkout/return")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Order Confirmation — art by KIYARI" }] }),
  component: ReturnPage,
});

type State =
  | { kind: "loading" }
  | { kind: "paid"; orderId?: string; email?: string | null; amount?: number; items?: Array<{ title: string; quantity: number; unit_amount?: number }> }
  | { kind: "pending" }
  | { kind: "error"; message: string };

function ReturnPage() {
  const { session_id } = Route.useSearch();
  const { clear } = useCart();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!session_id) {
      setState({ kind: "error", message: "Missing session id" });
      return;
    }
    (async () => {
      try {
        const res = await confirmCheckout({
          data: { sessionId: session_id, environment: getStripeEnvironment() },
        });
        console.log("[checkout.return] confirmCheckout response", res);
        if ("error" in res) {
          setState({ kind: "error", message: res.error });
          return;
        }
        if (res.status === "paid") {
          clear();
          setState({
            kind: "paid",
            orderId: res.orderId,
            email: res.customer_email,
            amount: res.amount_total_cad,
            items: res.items,
          });
        } else {
          setState({
            kind: res.status === "pending" ? "pending" : "error",
            message: `Payment not completed (status: ${res.status}). If you were charged, please contact hello@kiyari.art with session ${session_id}.`,
          } as State);
        }
      } catch (e) {
        console.error("[checkout.return] confirmCheckout threw", e);
        setState({ kind: "error", message: e instanceof Error ? e.message : "Unknown error" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session_id]);

  return (
    <div className="min-h-screen grid place-items-center px-4 py-32">
      <div className="max-w-xl w-full text-center">
        {state.kind === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-gold mx-auto" />
            <div className="mt-6 font-display text-3xl">Confirming your order…</div>
          </>
        )}

        {state.kind === "paid" && (
          <>
            <CheckCircle2 className="h-14 w-14 text-gold mx-auto" />
            <div className="text-xs uppercase tracking-[0.3em] text-gold mt-6">Order confirmed</div>
            <h1 className="font-display text-5xl md:text-6xl mt-3">Thank you</h1>
            <p className="mt-4 text-muted-foreground">
              Your payment was received{state.email ? `. A receipt has been sent to ${state.email}` : ""}. Kiyari will reach out shortly with shipping details.
            </p>
            {state.items && state.items.length > 0 && (
              <div className="mt-8 border border-border p-5 text-left bg-card/40">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Order</div>
                    <div className="font-mono text-sm text-gold mt-1">
                      {state.orderId ? `#${state.orderId.slice(0, 8).toUpperCase()}` : "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Date</div>
                    <div className="text-sm mt-1">{new Date().toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="border-t border-border pt-4 space-y-3">
                  {state.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-sm gap-4">
                      <span className="flex-1">
                        {i.title}
                        {i.quantity > 1 && <span className="text-muted-foreground"> × {i.quantity}</span>}
                      </span>
                      {i.unit_amount !== undefined && (
                        <span className="text-muted-foreground tabular-nums">
                          ${(i.unit_amount * i.quantity).toLocaleString()} CAD
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {state.amount !== undefined && (
                  <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="tabular-nums">${state.amount.toLocaleString()} CAD</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Shipping</span>
                      <span>Kiyari will personally ship your creation</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border mt-2">
                      <span className="text-sm">Total paid</span>
                      <span className="text-gold font-medium tabular-nums">${state.amount.toLocaleString()} CAD</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <NextSteps email={state.email} orderId={state.orderId} />

            <div className="mt-10 flex flex-wrap gap-3 justify-center">
              {state.orderId && (
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: state.orderId }}
                  search={{ email: state.email ?? undefined }}
                  className="border border-gold text-gold px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-gold/10 transition"
                >
                  View order status
                </Link>
              )}
              <Link to="/artworks" className="border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-gold transition">
                Keep browsing
              </Link>
              <Link to="/" className="bg-gradient-gold text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em]">
                Back home
              </Link>
            </div>

            <ShareCard items={state.items} />
          </>
        )}

        {state.kind === "pending" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto" />
            <div className="mt-6 font-display text-3xl">Payment processing</div>
            <p className="mt-3 text-muted-foreground">
              Your payment is still being processed. Refresh this page in a moment.
            </p>
          </>
        )}

        {state.kind === "error" && (
          <>
            <AlertCircle className="h-12 w-12 text-accent mx-auto" />
            <div className="mt-6 font-display text-3xl">Something went wrong</div>
            <p className="mt-3 text-sm text-muted-foreground">{state.message}</p>
            <Link to="/artworks" className="mt-8 inline-block underline text-gold">
              Return to artworks
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function ShareCard({ items }: { items?: Array<{ title: string; quantity: number }> }) {
  return ShareCardImpl({ items });
}

function NextSteps({ email, orderId }: { email?: string | null; orderId?: string }) {
  const steps = [
    {
      icon: Mail,
      title: "Confirmation email",
      body: email
        ? `A receipt is on its way to ${email}. Check your spam folder if you don't see it within a few minutes.`
        : "A receipt has been sent to your email. Check your spam folder if you don't see it within a few minutes.",
    },
    {
      icon: Sparkles,
      title: "Kiyari prepares your piece",
      body: "Each work is inspected, signed, and packaged by hand within 2–3 business days.",
    },
    {
      icon: Truck,
      title: "Shipping details",
      body: "You'll receive a personal message from Kiyari with tracking information as soon as your piece ships.",
    },
    {
      icon: Package,
      title: "Delivery & unboxing",
      body: "Your artwork arrives insured and ready to display. We'd love to see it in its new home — tag @kiyari.art.",
    },
  ];
  return (
    <div className="mt-12 border border-border bg-card/40 p-6 text-left">
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold">What happens next</div>
      <ol className="mt-5 space-y-5">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i} className="flex gap-4">
              <div className="shrink-0 h-9 w-9 rounded-full border border-gold/40 grid place-items-center text-gold">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium flex items-baseline gap-2">
                  <span className="text-[10px] tabular-nums text-muted-foreground">0{i + 1}</span>
                  <span>{s.title}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {orderId && (
        <p className="mt-6 pt-5 border-t border-border text-xs text-muted-foreground">
          Questions about your order? Reply to your confirmation email or reach us at{" "}
          <a href="mailto:hello@kiyari.art" className="text-gold hover:underline">hello@kiyari.art</a>{" "}
          with order <span className="font-mono text-gold">#{orderId.slice(0, 8).toUpperCase()}</span>.
        </p>
      )}
    </div>
  );
}

function ShareCardImpl({ items }: { items?: Array<{ title: string; quantity: number }> }) {
  const shareUrl = "https://kiyari.art/artworks";
  const title = items?.[0]?.title
    ? `Just collected "${items[0].title}" by KIYARI`
    : "Just collected an original by KIYARI";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${title} — ${shareUrl}`);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const native = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, text: title, url: shareUrl }); } catch {}
    } else {
      copy();
    }
  };

  return (
    <div className="mt-14 border-t border-border pt-8">
      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Share the joy</div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button onClick={native} className="inline-flex items-center gap-2 border border-gold text-gold px-4 py-2 text-[11px] uppercase tracking-[0.2em] hover:bg-gold/10">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
        <button onClick={copy} className="inline-flex items-center gap-2 border border-border px-4 py-2 text-[11px] uppercase tracking-[0.2em] hover:border-gold">
          <Copy className="h-3.5 w-3.5" /> Copy link
        </button>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-border px-4 py-2 text-[11px] uppercase tracking-[0.2em] hover:border-gold"
        >
          <Facebook className="h-3.5 w-3.5" /> Facebook
        </a>
      </div>
    </div>
  );
}
