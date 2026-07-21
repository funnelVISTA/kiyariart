import { createServerFn } from "@tanstack/react-start";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { ARTWORKS } from "@/lib/artworks";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CartLine = {
  id: string;
  title: string;
  image: string;
  unit_amount_cad: number; // dollars (ignored server-side)
  quantity: number; // ignored — every piece is 1-of-1
};

type CreateResult = { clientSecret: string } | { error: string };

export const MAX_CART_ITEMS = 20;

export type DeliveryMethod = "ship" | "pickup";

// Pure validator — throws on tampered / malformed input. Exported for tests.
export function validateCartInput(data: {
  items: CartLine[];
  returnUrl: string;
  environment: StripeEnv;
  marketingOptIn?: boolean;
  deliveryMethod?: DeliveryMethod;
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
  data.marketingOptIn = data.marketingOptIn === true;
  data.deliveryMethod = data.deliveryMethod === "pickup" ? "pickup" : "ship";
  return data;
}

type ResolvedLine = {
  id: string;
  title: string;
  image: string;
  unit_amount_cad: number;
  shipping_cad: number;
  quantity: 1;
  source: "catalog" | "custom";
};

// Resolve client-supplied cart ids against the server-authoritative catalog
// (hardcoded ARTWORKS + admin-uploaded artworks_custom rows). Every piece is
// a one-of-one — quantity is always 1 regardless of what the client sends.
export async function resolveCartItems(
  items: CartLine[],
  opts?: { availableOverrideIds?: Iterable<string> },
): Promise<ResolvedLine[]> {
  const uniqueIds = Array.from(new Set(items.map((i) => i.id)));

  const catalogIds = uniqueIds.filter((id) => ARTWORKS.find((a) => a.id === id));
  const customIds = uniqueIds.filter((id) => !ARTWORKS.find((a) => a.id === id));
  const availableOverrides = new Set<string>(opts?.availableOverrideIds ?? []);
  const needsOverrideLookup =
    opts?.availableOverrideIds == null &&
    catalogIds.some((id) => ARTWORKS.find((a) => a.id === id)?.sold);
  if (needsOverrideLookup) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stockRows } = await supabaseAdmin
      .from("artwork_stock")
      .select("artwork_id,total_units,sold_units")
      .in("artwork_id", catalogIds);
    for (const row of stockRows ?? []) {
      if ((row.total_units ?? 0) - (row.sold_units ?? 0) > 0) {
        availableOverrides.add(row.artwork_id);
      }
    }
  }
  let customMap = new Map<string, { id: string; title: string; image: string; price: number; sold: boolean; on_sale: boolean; sale_price: number | null }>();
  const customExtras = new Map<string, { shipping_cad: number }>();
  if (customIds.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("artworks_custom")
      .select("id,title,image_url,price,sold,on_sale,sale_price,shipping_cad")
      .in("id", customIds);
    for (const r of data ?? []) {
      customMap.set(r.id, {
        id: r.id,
        title: r.title,
        image: r.image_url,
        price: Number(r.price ?? 0),
        sold: !!r.sold,
        on_sale: !!(r as any).on_sale,
        sale_price: (r as any).sale_price != null ? Number((r as any).sale_price) : null,
      });
      customExtras.set(r.id, { shipping_cad: Number((r as any).shipping_cad ?? 0) });
    }
  }
  // Catalog price/sale overrides (for hardcoded ARTWORKS ids).
  const catalogOverrideMap = new Map<
    string,
    { price_override: number | null; on_sale: boolean; sale_price: number | null; title: string | null; image_url: string | null; shipping_cad: number; deleted: boolean }
  >();
  if (catalogIds.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ovRows } = await supabaseAdmin
      .from("artwork_catalog_overrides")
      .select("artwork_id,price_override,on_sale,sale_price,title,image_url,shipping_cad,deleted")
      .in("artwork_id", catalogIds);
    for (const r of ovRows ?? []) {
      catalogOverrideMap.set(r.artwork_id, {
        price_override: r.price_override != null ? Number(r.price_override) : null,
        on_sale: !!r.on_sale,
        sale_price: r.sale_price != null ? Number(r.sale_price) : null,
        title: (r as any).title ?? null,
        image_url: (r as any).image_url ?? null,
        shipping_cad: Number((r as any).shipping_cad ?? 0),
        deleted: !!(r as any).deleted,
      });
    }
  }

  return uniqueIds.map((id) => {
    const art = ARTWORKS.find((a) => a.id === id);
    if (art) {
      const hasAvailableOverride = availableOverrides.has(art.id);
      if (art.sold && !hasAvailableOverride) throw new Error(`"${art.title}" is not available`);
      const ov = catalogOverrideMap.get(art.id);
      if (ov?.deleted) throw new Error(`"${art.title}" is no longer available`);
      const listPrice = ov?.price_override ?? art.price;
      const effective = ov?.on_sale && ov.sale_price != null ? ov.sale_price : listPrice;
      if (!(effective > 0)) throw new Error(`"${art.title}" is not for sale`);
      return {
        id: art.id,
        title: ov?.title ?? art.title,
        image: ov?.image_url ?? art.image,
        unit_amount_cad: effective, quantity: 1 as const, source: "catalog" as const,
        shipping_cad: ov?.shipping_cad ?? 0,
      };
    }
    const c = customMap.get(id);
    if (!c) throw new Error(`Unknown artwork: ${id}`);
    if (c.sold) throw new Error(`"${c.title}" is not available`);
    const effective = c.on_sale && c.sale_price != null ? c.sale_price : c.price;
    if (!(effective > 0)) throw new Error(`"${c.title}" is not for sale`);
    return {
      id: c.id, title: c.title, image: c.image,
      unit_amount_cad: effective, quantity: 1 as const, source: "custom" as const,
      shipping_cad: customExtras.get(id)?.shipping_cad ?? 0,
    };
  });
}

// Returns Set of artwork ids that are currently unavailable.
async function fetchSoldSet(ids: string[]): Promise<Set<string>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sold = new Set<string>();
  const [{ data: legacy }, { data: customSold }, { data: stockRows }] = await Promise.all([
    supabaseAdmin.from("sold_artworks").select("artwork_id").in("artwork_id", ids),
    supabaseAdmin.from("artworks_custom").select("id,sold").in("id", ids),
    supabaseAdmin.from("artwork_stock").select("artwork_id,total_units,sold_units").in("artwork_id", ids),
  ]);
  for (const r of legacy ?? []) sold.add(r.artwork_id);
  for (const r of customSold ?? []) if (r.sold) sold.add(r.id);
  for (const r of stockRows ?? []) {
    if ((r.total_units ?? 0) - (r.sold_units ?? 0) > 0) sold.delete(r.artwork_id);
  }
  return sold;
}

export const createArtworkCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: {
    items: CartLine[];
    returnUrl: string;
    environment: StripeEnv;
    marketingOptIn?: boolean;
    deliveryMethod?: DeliveryMethod;
  }) => validateCartInput(data))
  .handler(async ({ data }): Promise<CreateResult> => {
    try {
      const resolved = await resolveCartItems(data.items);
      const ids = resolved.map((i) => i.id);

      const sold = await fetchSoldSet(ids);
      const conflicts = resolved
        .filter((i) => sold.has(i.id))
        .map((i) => `"${i.title}" just sold`);
      if (conflicts.length) {
        return { error: conflicts.join(". ") + ". Please update your cart." };
      }

      const stripe = createStripeClient(data.environment);
      const isPickup = data.deliveryMethod === "pickup";
      const shippingLineItems = isPickup
        ? []
        : resolved
            .filter((i) => i.shipping_cad > 0)
            .map((i) => ({
              quantity: 1,
              price_data: {
                currency: "cad",
                unit_amount: Math.round(i.shipping_cad * 100),
                product_data: {
                  name: `Shipping — ${i.title}`,
                  metadata: { kind: "shipping", artwork_id: i.id },
                },
              },
            }));
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        line_items: [...resolved.map((i) => ({
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: Math.round(i.unit_amount_cad * 100),
            product_data: {
              name: i.title,
              images: i.image ? [i.image] : undefined,
              metadata: { artwork_id: i.id, source: i.source },
            },
          },
        })), ...shippingLineItems],
        metadata: {
          artwork_ids: ids.join(","),
          marketing_opt_in: data.marketingOptIn ? "1" : "0",
          delivery_method: isPickup ? "pickup" : "ship",
        },
        ...(isPickup ? {} : {
          shipping_address_collection: {
            allowed_countries: ["CA", "US", "GB", "AU", "NZ", "DE", "FR", "NL", "IE", "ES", "IT", "BE", "DK", "SE", "NO", "FI", "CH", "AT", "PT"],
          },
        }),
        phone_number_collection: { enabled: true },
        payment_intent_data: {
          description: resolved.map((i) => i.title).join(", ").slice(0, 500),
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      console.error("[createArtworkCheckout] handler threw", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        raw: error,
      });
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
        expand: ["line_items.data.price.product", "payment_intent"],
      });

      const isPaid = session.payment_status === "paid";
      if (!isPaid) {
        console.error("[confirmCheckout] session not paid", {
          sessionId: session.id,
          payment_status: session.payment_status,
          status: session.status,
          last_payment_error:
            typeof session.payment_intent === "object"
              ? (session.payment_intent as any)?.last_payment_error
              : undefined,
        });
        return { status: session.payment_status === "unpaid" ? "pending" : "failed" };
      }

      const lineItems = (session.line_items?.data ?? []).map((li) => {
        const product = li.price?.product;
        const meta =
          product && typeof product !== "string" && !("deleted" in product && product.deleted)
            ? (product.metadata ?? {})
            : {};
        return {
          artwork_id: (meta.artwork_id ?? null) as string | null,
          source: (meta.source ?? "catalog") as "catalog" | "custom",
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
      const marketingOptIn = session.metadata?.marketing_opt_in === "1";

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
            marketing_opt_in: marketingOptIn,
          },
          { onConflict: "stripe_session_id" },
        )
        .select("id")
        .single();

      if (error) throw error;
      const orderId = row?.id as string;

      // 1-of-1 model: mark each artwork sold.
      if (!isReentry) {
        // Detect double-sale: any artwork already claimed by a different order
        // (or already flagged sold on a custom row from a different session).
        // Payment already succeeded — flag it and email admin so they can refund.
        const conflicts: string[] = [];
        for (const li of lineItems) {
          if (!li.artwork_id) continue;
          if (li.source === "custom") {
            const { data: cur } = await supabaseAdmin
              .from("artworks_custom")
              .select("sold")
              .eq("id", li.artwork_id)
              .maybeSingle();
            if (cur?.sold) conflicts.push(li.title);
            await supabaseAdmin
              .from("artworks_custom")
              .update({ sold: true })
              .eq("id", li.artwork_id);
          } else {
            const { data: existingSold } = await supabaseAdmin
              .from("sold_artworks")
              .select("order_id")
              .eq("artwork_id", li.artwork_id)
              .maybeSingle();
            if (existingSold && existingSold.order_id !== orderId) {
              conflicts.push(li.title);
            }
            await supabaseAdmin
              .from("sold_artworks")
              .upsert(
                { artwork_id: li.artwork_id, order_id: orderId },
                { onConflict: "artwork_id", ignoreDuplicates: true },
              );
          }
        }

        if (conflicts.length) {
          try {
            const { sendTransactionalEmailInternal } = await import(
              "@/lib/email/send-internal.server"
            );
            await sendTransactionalEmailInternal({
              templateName: "order-double-sale-alert",
              idempotencyKey: `double-sale-${orderId}`,
              templateData: {
                orderId,
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                conflictingTitles: conflicts,
                amountTotal,
                adminUrl: `${process.env.PUBLIC_SITE_ORIGIN || "https://kiyari.art"}/admin/orders/${orderId}`,
              },
            });
          } catch (e) {
            console.error("Double-sale alert enqueue failed", e);
          }
        }
      }

      if (!isReentry) {
        try {
          const { sendTransactionalEmailInternal } = await import(
            "@/lib/email/send-internal.server"
          );
          const origin = process.env.PUBLIC_SITE_ORIGIN || "https://kiyari.art";
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
      console.error("[confirmCheckout] handler threw", {
        sessionId: data.sessionId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        raw: error,
      });
      return { error: getStripeErrorMessage(error) };
    }
  });

// Public: list sold-out artwork IDs (from both catalog overrides and custom).
export const listArtworkAvailability = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    soldIds: string[];
    availableOverrideIds: string[];
    deletedCatalogIds: string[];
    catalogOverrides: Array<{
      artwork_id: string;
      price_override: number | null;
      on_sale: boolean;
      sale_price: number | null;
      title: string | null;
      description: string | null;
      medium: string | null;
      image_url: string | null;
      alt_text: string | null;
      seo_title: string | null;
      seo_description: string | null;
      shipping_cad: number;
      deleted: boolean;
    }>;
    customShipping: Record<string, number>;
  }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: sold }, { data: customSold }, { data: stock }, { data: overrides }, { data: customShip }] = await Promise.all([
      supabaseAdmin.from("sold_artworks").select("artwork_id"),
      supabaseAdmin.from("artworks_custom").select("id").eq("sold", true),
      supabaseAdmin.from("artwork_stock").select("artwork_id,total_units,sold_units"),
      supabaseAdmin
        .from("artwork_catalog_overrides")
        .select("artwork_id,price_override,on_sale,sale_price,title,description,medium,image_url,alt_text,seo_title,seo_description,shipping_cad,deleted"),
      supabaseAdmin.from("artworks_custom").select("id,shipping_cad"),
    ]);
    const soldSet = new Set<string>();
    for (const r of sold ?? []) soldSet.add(r.artwork_id);
    for (const r of customSold ?? []) soldSet.add(r.id);
    const availableOverride = new Set<string>();
    for (const r of stock ?? []) {
      if ((r.total_units ?? 0) - (r.sold_units ?? 0) > 0) {
        availableOverride.add(r.artwork_id);
        soldSet.delete(r.artwork_id);
      }
    }
    const deletedCatalog: string[] = [];
    for (const r of overrides ?? []) if ((r as any).deleted) deletedCatalog.push((r as any).artwork_id);
    const customShipping: Record<string, number> = {};
    for (const r of customShip ?? []) customShipping[(r as any).id] = Number((r as any).shipping_cad ?? 0);
    return {
      soldIds: Array.from(soldSet),
      availableOverrideIds: Array.from(availableOverride),
      deletedCatalogIds: deletedCatalog,
      catalogOverrides: (overrides ?? []).map((r: any) => ({
        artwork_id: r.artwork_id,
        price_override: r.price_override != null ? Number(r.price_override) : null,
        on_sale: !!r.on_sale,
        sale_price: r.sale_price != null ? Number(r.sale_price) : null,
        title: r.title ?? null,
        description: r.description ?? null,
        medium: r.medium ?? null,
        image_url: r.image_url ?? null,
        alt_text: r.alt_text ?? null,
        seo_title: r.seo_title ?? null,
        seo_description: r.seo_description ?? null,
        shipping_cad: Number(r.shipping_cad ?? 0),
        deleted: !!r.deleted,
      })),
      customShipping,
    };
  },
);

export const listSoldArtworkIds = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("sold_artworks").select("artwork_id");
    if (error) throw error;
    return (data ?? []).map((r) => r.artwork_id);
  },
);

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

// -------- Admin: refund an order --------
// Verifies caller is an admin, refunds the PaymentIntent in Stripe, and
// relies on the `charge.refunded` webhook to flip status + un-mark artworks.
// Optimistically flips status to 'refunded' immediately for admin feedback.
export const adminRefundOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; environment: StripeEnv; reason?: string }) => {
    if (!data.orderId) throw new Error("orderId required");
    if (data.environment !== "sandbox" && data.environment !== "live") {
      throw new Error("Invalid environment");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      // Admin gate
      const { data: role } = await context.supabase
        .from("user_roles").select("role")
        .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
      if (!role) return { error: "Forbidden" };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("id,status,payment_intent_id,stripe_session_id,items")
        .eq("id", data.orderId)
        .maybeSingle();
      if (error) throw error;
      if (!order) return { error: "Order not found" };
      if (order.status === "refunded") return { error: "Order already refunded" };
      if (!order.payment_intent_id) return { error: "No payment intent on this order" };

      const stripe = createStripeClient(data.environment);
      await stripe.refunds.create({
        payment_intent: order.payment_intent_id,
        reason: "requested_by_customer",
        metadata: { orderId: data.orderId, note: data.reason ?? "" },
      });

      // Optimistic local update — webhook `charge.refunded` also does this.
      await supabaseAdmin
        .from("orders")
        .update({ status: "refunded" as any, updated_at: new Date().toISOString() })
        .eq("id", data.orderId);

      // Un-mark artworks as sold so they can be re-listed.
      const items = Array.isArray(order.items) ? (order.items as any[]) : [];
      for (const li of items) {
        const artId = li.artwork_id ?? li.id;
        if (!artId) continue;
        const isCustom = !ARTWORKS.find((a) => a.id === artId);
        if (isCustom) {
          await supabaseAdmin.from("artworks_custom").update({ sold: false }).eq("id", artId);
        } else {
          await supabaseAdmin.from("sold_artworks").delete().eq("artwork_id", artId).eq("order_id", data.orderId);
        }
      }

      return { ok: true };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

// -------- Public: fetch sold ids for cart auto-prune --------
// Thin wrapper around listArtworkAvailability for the checkout page's
// stale-cart cleanup. Same data — separate name for cache clarity.
