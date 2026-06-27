import { createServerFn } from "@tanstack/react-start";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { ARTWORKS } from "@/lib/artworks";

export type CartLine = {
  id: string;
  title: string;
  image: string;
  unit_amount_cad: number; // dollars
  quantity: number;
};

type CreateResult = { clientSecret: string } | { error: string };

export const MAX_CART_ITEMS = 20;
export const MAX_QTY_PER_LINE = 20;

// Pure validator — throws on tampered / malformed input. Exported for tests.
export function validateCartInput(data: {
  items: CartLine[];
  returnUrl: string;
  environment: StripeEnv;
}) {
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Cart is empty");
  }
  if (data.items.length > MAX_CART_ITEMS) {
    throw new Error("Too many items in cart");
  }
  for (const i of data.items) {
    if (!i || typeof i.id !== "string" || i.id.length === 0 || i.id.length > 128) {
      throw new Error("Invalid cart item");
    }
  }
  if (typeof data.returnUrl !== "string" || !data.returnUrl.startsWith("http")) {
    throw new Error("Invalid returnUrl");
  }
  if (data.environment !== "sandbox" && data.environment !== "live") {
    throw new Error("Invalid environment");
  }
  return data;
}

function sanitizeQty(q: unknown): number {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_QTY_PER_LINE);
}

// Resolve client-supplied cart ids against the server-authoritative catalog.
// Discards every other client field except quantity (clamped, summed per id).
export function resolveCartItems(items: CartLine[]) {
  const reqQty = new Map<string, number>();
  for (const i of items) {
    reqQty.set(i.id, (reqQty.get(i.id) ?? 0) + sanitizeQty(i.quantity));
  }
  return Array.from(reqQty.entries()).map(([id, qty]) => {
    const art = ARTWORKS.find((a) => a.id === id);
    if (!art) throw new Error(`Unknown artwork: ${id}`);
    if (art.sold) throw new Error(`"${art.title}" is not available`);
    if (!(art.price > 0)) throw new Error(`"${art.title}" is not for sale`);
    return {
      id: art.id,
      title: art.title,
      image: art.image,
      unit_amount_cad: art.price,
      quantity: Math.min(qty, MAX_QTY_PER_LINE),
    };
  });
}

// Returns map of artwork_id → available units (default 1 when no stock row).
async function fetchAvailability(ids: string[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: stock } = await supabaseAdmin
    .from("artwork_stock")
    .select("artwork_id,total_units,sold_units")
    .in("artwork_id", ids);
  const map = new Map<string, number>();
  for (const id of ids) map.set(id, 1);
  for (const row of stock ?? []) {
    map.set(row.artwork_id, Math.max(0, (row.total_units ?? 0) - (row.sold_units ?? 0)));
  }
  const { data: legacy } = await supabaseAdmin
    .from("sold_artworks").select("artwork_id").in("artwork_id", ids);
  for (const r of legacy ?? []) {
    // legacy rows mean a 1-of-1 was sold; only override when no stock row gave a count
    if (!(stock ?? []).find((s) => s.artwork_id === r.artwork_id)) map.set(r.artwork_id, 0);
  }
  return map;
}

export const createArtworkCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: {
    items: CartLine[];
    returnUrl: string;
    environment: StripeEnv;
  }) => validateCartInput(data))
  .handler(async ({ data }): Promise<CreateResult> => {
    try {
      const resolved = resolveCartItems(data.items);
      const ids = resolved.map((i) => i.id);

      const avail = await fetchAvailability(ids);
      const conflicts: string[] = [];
      for (const item of resolved) {
        const left = avail.get(item.id) ?? 0;
        if (left <= 0) conflicts.push(`"${item.title}" just sold out`);
        else if (item.quantity > left)
          conflicts.push(`Only ${left} of "${item.title}" left`);
      }
      if (conflicts.length) {
        return { error: conflicts.join(". ") + ". Please update your cart." };
      }

      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        line_items: resolved.map((i) => ({
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
        metadata: { artwork_ids: ids.join(",") },
        shipping_address_collection: {
          allowed_countries: ["CA", "US", "GB", "AU", "NZ", "DE", "FR", "NL", "IE", "ES", "IT", "BE", "DK", "SE", "NO", "FI", "CH", "AT", "PT"],
        },
        phone_number_collection: { enabled: true },
        payment_intent_data: {
          description: resolved.map((i) => i.title).join(", ").slice(0, 500),
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

      // Decrement stock atomically per line (idempotent per session via isReentry check).
      // Also keep sold_artworks for any line that ends up fully depleted.
      if (!isReentry) {
        for (const li of lineItems) {
          if (!li.artwork_id) continue;
          await supabaseAdmin.rpc("decrement_artwork_stock", {
            _artwork_id: li.artwork_id,
            _qty: li.quantity ?? 1,
          });
          // Check remaining; if 0, mark legacy sold_artworks too
          const { data: s } = await supabaseAdmin
            .from("artwork_stock")
            .select("total_units,sold_units")
            .eq("artwork_id", li.artwork_id)
            .maybeSingle();
          const left = s ? (s.total_units - s.sold_units) : 0;
          if (left <= 0) {
            await supabaseAdmin
              .from("sold_artworks")
              .upsert(
                { artwork_id: li.artwork_id, order_id: orderId },
                { onConflict: "artwork_id", ignoreDuplicates: true },
              );
          }
        }
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
