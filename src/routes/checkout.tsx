import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createArtworkCheckout } from "@/lib/payments.functions";
import { useCart } from "@/lib/cart";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  head: () => ({ meta: [{ title: "Checkout — art by KIYARI" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, total } = useCart();
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const optInRef = useRef(false);
  optInRef.current = marketingOptIn;

  const stripePromise = useMemo(() => getStripe(), []);

  const options = useMemo(
    () => ({
      fetchClientSecret: async () => {
        if (items.length === 0) throw new Error("Cart is empty");
        const result = await createArtworkCheckout({
          data: {
            environment: getStripeEnvironment(),
            returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
            marketingOptIn: optInRef.current,
            items: items.map((i) => ({
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
        return result.clientSecret;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (items.length === 0) {
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
              {items.map((i) => (
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
              <span className="text-gold font-medium">${total.toLocaleString()} CAD</span>
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
            <EmbeddedCheckoutProvider key={marketingOptIn ? "opt-in" : "opt-out"} stripe={stripePromise} options={options}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
