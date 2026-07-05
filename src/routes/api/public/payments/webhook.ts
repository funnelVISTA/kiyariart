import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

// Handles Stripe checkout completion as a safety net — if a buyer closes the
// tab before /checkout/return loads, this still records the order, marks
// artworks sold, and sends the receipt. Idempotent: confirmCheckout uses
// upsert on stripe_session_id and email idempotency keys.
async function handleCheckoutSessionCompleted(session: any, env: StripeEnv) {
  if (session.payment_status !== "paid") return;
  // Reuse the same confirmation path the return page calls.
  const { confirmCheckout } = await import("@/lib/payments.functions");
  // Call the handler directly without going through the HTTP RPC layer.
  await confirmCheckout({ data: { sessionId: session.id, environment: env } });
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook: invalid env query param:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
              await handleCheckoutSessionCompleted(event.data.object, env);
              break;
            case "payment_intent.payment_failed":
            case "charge.refunded":
            case "checkout.session.async_payment_failed":
              console.log("Stripe event (no-op):", event.type);
              break;
            default:
              console.log("Unhandled Stripe event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
