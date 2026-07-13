import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createArtworkCheckout, listArtworkAvailability } from "@/lib/payments.functions";
import { useCart } from "@/lib/cart";
import { isArtworkPurchasable } from "@/lib/artworks";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  head: () => ({ meta: [{ title: "Checkout — art by KIYARI" }] }),
  component: CheckoutRouteShell,
});

function CheckoutRouteShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname.startsWith("/checkout/")) return <Outlet />;
  return <CheckoutPage />;
}

function CheckoutPage() {
  const { items, remove } = useCart();
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const optInRef = useRef(false);
  optInRef.current = marketingOptIn;
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const checkoutItems = useMemo(
    () => items.filter((i) => isArtworkPurchasable(i.artwork)),
    [items],
  );
  const checkoutTotal = useMemo(
    () => checkoutItems.reduce((sum, i) => sum + i.artwork.price, 0),
    [checkoutItems],
  );

  useEffect(() => {
    for (const item of items) {
      if (!isArtworkPurchasable(item.artwork)) {
        remove(item.artwork.id);
        toast.warning(`"${item.artwork.title}" is inquiry-only — removed from cart`);
      }
    }
  }, [items, remove]);

  // Auto-prune: if any cart item was sold elsewhere while it sat in the
  // buyer's localStorage, drop it before Stripe rejects the whole session.
  useEffect(() => {
    let cancelled = false;
    listArtworkAvailability()
      .then((res) => {
        if (cancelled) return;
        const soldSet = new Set(res.soldIds);
        const overrideSet = new Set(res.availableOverrideIds);
        const stale = checkoutItems.filter(
          (i) => soldSet.has(i.artwork.id) && !overrideSet.has(i.artwork.id),
        );
        for (const s of stale) {
          remove(s.artwork.id);
          toast.warning(`"${s.artwork.title}" just sold — removed from cart`);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stripePromise = useMemo(() => getStripe(), []);

  const options = useMemo(
    () => ({
      fetchClientSecret: async () => {
          if (checkoutItems.length === 0) throw new Error("Cart is empty");
        try {
          const result = await createArtworkCheckout({
            data: {
              environment: getStripeEnvironment(),
              returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
              marketingOptIn: optInRef.current,
              items: checkoutItems.map((i) => ({
                id: i.artwork.id,
                title: i.artwork.title,
                image: i.artwork.image,
                unit_amount_cad: i.artwork.price,
                quantity: i.qty,
              })),
            },
          });
          if ("error" in result) throw new Error(result.error);
          if (!result.clientSecret) throw new Error("No client secret returned");
          setCheckoutError(null);
          return result.clientSecret;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Could not start checkout";
          setCheckoutError(msg);
          throw e;
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkoutItems, retryKey],
  );

  if (checkoutItems.length === 0) {
    return (
      <div className="pt-32 pb-20 container-page text-center">
        <div className="font-display text-5xl mb-4">Your cart is empty</div>
        <Link to="/artworks" className="text-gold underline underline-offset-4">
          Browse artworks
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="container-page pt-28 pb-16">
        <Link to="/artworks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to artworks
        </Link>
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Order summary</div>
            <h1 className="font-display text-4xl md:text-5xl mb-8">Secure checkout</h1>
            <div className="space-y-4 border-t border-border pt-6">
              {checkoutItems.map((i) => (
                <div key={i.artwork.id} className="flex gap-4">
                  <img src={i.artwork.image} alt={i.artwork.title} className="h-20 w-20 object-cover" />
                  <div className="flex-1">
                    <div className="font-display text-lg">{i.artwork.title}</div>
                    <div className="text-xs text-muted-foreground">{i.artwork.collection}</div>
                  </div>
                  <div className="text-gold text-sm">${i.artwork.price.toLocaleString()} CAD</div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-border flex justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-gold font-medium">${checkoutTotal.toLocaleString()} CAD</span>
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              Shipping calculated by destination. Each piece is one of a kind.
            </p>
            <label className="mt-6 flex items-start gap-3 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-gold cursor-pointer"
              />
              <span>Yes, keep me updated on new Kiyari creations and exhibitions.</span>
            </label>
          </div>
          <div className="bg-card border border-border p-1">
            {checkoutError ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-10 w-10 text-accent mx-auto" />
                <div className="mt-4 font-display text-2xl">Checkout unavailable</div>
                <p className="mt-3 text-sm text-muted-foreground">{checkoutError}</p>
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={() => {
                      setCheckoutError(null);
                      setRetryKey((k) => k + 1);
                    }}
                    className="border border-gold text-gold px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-gold/10 transition"
                  >
                    Try again
                  </button>
                  <Link
                    to="/artworks"
                    className="border border-border px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:border-gold transition"
                  >
                    Back to artworks
                  </Link>
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground">
                  If this keeps happening, email{" "}
                  <a href="mailto:hello@kiyari.art" className="text-gold hover:underline">hello@kiyari.art</a>.
                </p>
              </div>
            ) : (
              <EmbeddedCheckoutProvider key={retryKey} stripe={stripePromise} options={options}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
