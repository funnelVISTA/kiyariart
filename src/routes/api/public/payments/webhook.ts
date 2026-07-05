import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { ARTWORKS } from "@/lib/artworks";

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

// Refund flow: Stripe fires `charge.refunded` when a refund is created
// (either via our admin button or manually in the Stripe dashboard).
// Sync the order + free the artworks up for re-sale.
async function handleChargeRefunded(charge: any) {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id,items,status,customer_email,customer_name")
    .eq("payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!order) return;

  await supabaseAdmin
    .from("orders")
    .update({ status: "refunded" as any, updated_at: new Date().toISOString() })
    .eq("id", order.id);

  const items = Array.isArray(order.items) ? (order.items as any[]) : [];
  for (const li of items) {
    const artId = li.artwork_id ?? li.id;
    if (!artId) continue;
    const isCustom = !ARTWORKS.find((a) => a.id === artId);
    if (isCustom) {
      await supabaseAdmin.from("artworks_custom").update({ sold: false }).eq("id", artId);
    } else {
      await supabaseAdmin
        .from("sold_artworks").delete()
        .eq("artwork_id", artId).eq("order_id", order.id);
    }
  }

  try {
    const { sendTransactionalEmailInternal } = await import("@/lib/email/send-internal.server");
    await sendTransactionalEmailInternal({
      templateName: "order-refunded-alert",
      idempotencyKey: `refunded-${order.id}`,
      templateData: {
        orderId: order.id,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        amountRefunded: (charge.amount_refunded ?? 0) / 100,
      },
    });
  } catch (e) {
    console.error("Refund alert enqueue failed", e);
  }
}

// Payment failure alert: notify admin so they can follow up if desired.
async function handlePaymentFailed(pi: any) {
  try {
    const { sendTransactionalEmailInternal } = await import("@/lib/email/send-internal.server");
    await sendTransactionalEmailInternal({
      templateName: "payment-failed-alert",
      idempotencyKey: `pi-failed-${pi.id}`,
      templateData: {
        paymentIntentId: pi.id,
        customerEmail: pi.receipt_email ?? pi.charges?.data?.[0]?.billing_details?.email ?? null,
        amount: (pi.amount ?? 0) / 100,
        failureMessage: pi.last_payment_error?.message ?? "Unknown reason",
      },
    });
  } catch (e) {
    console.error("Payment failed alert enqueue failed", e);
  }
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
            case "charge.refunded":
              await handleChargeRefunded(event.data.object);
              break;
            case "payment_intent.payment_failed":
              await handlePaymentFailed(event.data.object);
              break;
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
