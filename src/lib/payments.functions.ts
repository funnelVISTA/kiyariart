import { createServerFn } from "@tanstack/react-start";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CartLine = {
  id: string;
  title: string;
  image: string;
  unit_amount_cad: number; // dollars
  quantity: number;
};

type CreateResult = { clientSecret: string } | { error: string };

export const createArtworkCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: {
    items: CartLine[];
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Cart is empty");
    }
    for (const i of data.items) {
      if (!i.id || !i.title || !(i.unit_amount_cad > 0) || !(i.quantity > 0)) {
        throw new Error("Invalid cart item");
      }
    }
    if (!data.returnUrl?.startsWith("http")) throw new Error("Invalid returnUrl");
    return data;
  })
  .handler(async ({ data }): Promise<CreateResult> => {
    try {
      const stripe = createStripeClient(data.environment);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded",
        return_url: data.returnUrl,
        line_items: data.items.map((i) => ({
          quantity: i.quantity,
          price_data: {
            currency: "cad",
            unit_amount: Math.round(i.unit_amount_cad * 100),
            product_data: {
              name: i.title,
              images: i.image ? [i.image] : undefined,
              metadata: { artwork_id: i.id },
            },
          },
        })),
        shipping_address_collection: {
          allowed_countries: ["CA", "US", "GB", "AU", "NZ", "DE", "FR", "NL", "IE", "ES", "IT", "BE", "DK", "SE", "NO", "FI", "CH", "AT", "PT"],
        },
        phone_number_collection: { enabled: true },
        payment_intent_data: {
          description: data.items.map((i) => i.title).join(", ").slice(0, 500),
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type ConfirmResult =
  | {
      status: "paid" | "pending" | "failed";
      orderId?: string;
      customer_email?: string | null;
      amount_total_cad?: number;
      items?: Array<{ title: string; quantity: number }>;
    }
  | { error: string };

export const confirmCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => {
    if (!data.sessionId?.startsWith("cs_")) throw new Error("Invalid session id");
    return data;
  })
  .handler(async ({ data }): Promise<ConfirmResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
        expand: ["line_items", "payment_intent", "shipping_details"],
      });

      const isPaid = session.payment_status === "paid";
      if (!isPaid) {
        return { status: session.payment_status === "unpaid" ? "pending" : "failed" };
      }

      const lineItems = (session.line_items?.data ?? []).map((li) => ({
        title: li.description ?? "Artwork",
        quantity: li.quantity ?? 1,
        unit_amount: (li.price?.unit_amount ?? 0) / 100,
      }));

      const amountTotal = (session.amount_total ?? 0) / 100;
      const email = session.customer_details?.email ?? session.customer_email ?? null;
      const name = session.customer_details?.name ?? null;
      const phone = session.customer_details?.phone ?? null;
      const ship = (session as any).shipping_details?.address ?? session.customer_details?.address ?? null;
      const shippingStr = ship
        ? [ship.line1, ship.line2, ship.city, ship.state, ship.postal_code, ship.country]
            .filter(Boolean)
            .join(", ")
        : null;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("orders")
        .upsert(
          {
            stripe_session_id: session.id,
            payment_intent_id: paymentIntentId,
            customer_email: email,
            customer_name: name,
            customer_phone: phone,
            shipping_address: shippingStr,
            items: lineItems,
            total_cad: amountTotal,
            amount_total_cad: amountTotal,
            status: "paid",
          },
          { onConflict: "stripe_session_id" },
        )
        .select("id")
        .single();

      if (error) throw error;

      return {
        status: "paid",
        orderId: row?.id as string,
        customer_email: email,
        amount_total_cad: amountTotal,
        items: lineItems.map((i) => ({ title: i.title, quantity: i.quantity })),
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
