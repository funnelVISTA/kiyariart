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
      // Stock check — block already-sold artworks from being purchased again.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ids = data.items.map((i) => i.id);
      const { data: sold } = await supabaseAdmin
        .from("sold_artworks").select("artwork_id").in("artwork_id", ids);
      const soldSet = new Set((sold ?? []).map((r) => r.artwork_id));
      const conflicts = data.items.filter((i) => soldSet.has(i.id));
      if (conflicts.length) {
        return {
          error: `Sorry, ${conflicts.map((c) => `"${c.title}"`).join(", ")} just sold. Please remove from cart and try again.`,
        };
      }

      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
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
        // Mirror artwork_ids on the Session too for easy retrieval.
        metadata: {
          artwork_ids: ids.join(","),
        },
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
      items?: Array<{ title: string; quantity: number; unit_amount?: number }>;
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
        expand: ["line_items.data.price.product", "payment_intent", "shipping_details"],
      });

      const isPaid = session.payment_status === "paid";
      if (!isPaid) {
        return { status: session.payment_status === "unpaid" ? "pending" : "failed" };
      }

      // Extract line items including artwork_id from product metadata.
      const lineItems = (session.line_items?.data ?? []).map((li) => {
        const product = li.price?.product;
        const artworkId =
          product && typeof product !== "string" && !("deleted" in product && product.deleted)
            ? (product.metadata?.artwork_id ?? null)
            : null;
        return {
          artwork_id: artworkId as string | null,
          title: (product && typeof product !== "string" && "name" in product ? product.name : li.description) ?? "Artwork",
          quantity: li.quantity ?? 1,
          unit_amount: (li.price?.unit_amount ?? 0) / 100,
        };
      });

      const amountTotal = (session.amount_total ?? 0) / 100;
      const email = session.customer_details?.email ?? session.customer_email ?? null;
      const name = session.customer_details?.name ?? null;
      const phone = session.customer_details?.phone ?? null;
      const ship =
        (session as any).shipping_details?.address ??
        session.customer_details?.address ??
        null;
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

      // Detect re-entry (Stripe return page can be reloaded). Skip emails if
      // we've already recorded this session.
      const { data: existing } = await supabaseAdmin
        .from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle();
      const isReentry = !!existing;

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
      const orderId = row?.id as string;

      // Mark artworks as sold (idempotent — onConflict do nothing).
      const soldRows = lineItems
        .filter((i) => i.artwork_id)
        .map((i) => ({ artwork_id: i.artwork_id as string, order_id: orderId }));
      if (soldRows.length) {
        await supabaseAdmin
          .from("sold_artworks")
          .upsert(soldRows, { onConflict: "artwork_id", ignoreDuplicates: true });
      }

      // Send receipts only on first record of this session.
      if (!isReentry) {
        try {
          const { sendTransactionalEmailInternal } = await import(
            "@/lib/email/send-internal.server"
          );
          const origin =
            process.env.PUBLIC_SITE_ORIGIN ||
            "https://kiyari.art";
          const statusUrl = `${origin}/orders/${orderId}?email=${encodeURIComponent(email ?? "")}`;

          if (email) {
            await sendTransactionalEmailInternal({
              templateName: "order-receipt",
              recipientEmail: email,
              idempotencyKey: `receipt-${orderId}`,
              templateData: {
                customerName: name,
                orderId,
                items: lineItems.map(({ title, quantity, unit_amount }) => ({
                  title, quantity, unit_amount,
                })),
                amountTotal,
                shippingAddress: shippingStr,
                statusUrl,
              },
            });
          }
          await sendTransactionalEmailInternal({
            templateName: "order-admin-notification",
            idempotencyKey: `admin-${orderId}`,
            templateData: {
              orderId,
              customerName: name,
              customerEmail: email,
              customerPhone: phone,
              items: lineItems.map(({ title, quantity, unit_amount }) => ({
                title, quantity, unit_amount,
              })),
              amountTotal,
              shippingAddress: shippingStr,
              adminUrl: `${origin}/admin`,
            },
          });
        } catch (e) {
          // Don't fail the confirmation if email enqueue hiccups.
          console.error("Order email enqueue failed", e);
        }
      }

      return {
        status: "paid",
        orderId,
        customer_email: email,
        amount_total_cad: amountTotal,
        items: lineItems.map((i) => ({
          title: i.title, quantity: i.quantity, unit_amount: i.unit_amount,
        })),
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

// Public: list artwork IDs already sold via paid orders.
export const listSoldArtworkIds = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("sold_artworks").select("artwork_id");
    if (error) throw error;
    return (data ?? []).map((r) => r.artwork_id);
  },
);

// Public order lookup: caller must supply both order id and matching email.
type PublicOrderResult =
  | {
      found: true;
      order: {
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
    }
  | { found: false };

export const getOrderForCustomer = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; email: string }) => {
    if (!data.orderId || data.orderId.length < 8) throw new Error("Invalid order id");
    if (!data.email?.includes("@")) throw new Error("Invalid email");
    return data;
  })
  .handler(async ({ data }): Promise<PublicOrderResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("orders")
      .select(
        "id,status,customer_name,customer_email,shipping_address,items,amount_total_cad,total_cad,created_at,updated_at",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (!row) return { found: false };
    if ((row.customer_email ?? "").toLowerCase() !== data.email.toLowerCase().trim()) {
      return { found: false };
    }
    return {
      found: true,
      order: {
        ...row,
        items: Array.isArray(row.items) ? (row.items as any) : [],
      },
    };
  });
