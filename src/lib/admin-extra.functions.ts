import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// -------- Order detail --------
export const adminGetOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => {
    if (!d.orderId || typeof d.orderId !== "string") throw new Error("orderId required");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");

    const { data: emails } = await supabaseAdmin
      .from("email_send_log")
      .select("template_name,recipient_email,status,sent_at,created_at,error_message")
      .or(`idempotency_key.like.receipt-${order.id}%,idempotency_key.like.shipped-${order.id}%,idempotency_key.like.admin-${order.id}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    return { order, emails: emails ?? [] };
  });

// -------- Inventory --------
export const adminListInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: sold }, { data: stock }] = await Promise.all([
      supabaseAdmin.from("sold_artworks").select("artwork_id,order_id,sold_at"),
      supabaseAdmin.from("artwork_stock").select("artwork_id,total_units,sold_units,updated_at"),
    ]);
    return { sold: sold ?? [], stock: stock ?? [] };
  });

export const adminSetArtworkSold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { artworkId: string; sold: boolean }) => {
    if (!d.artworkId || typeof d.artworkId !== "string") throw new Error("artworkId required");
    if (typeof d.sold !== "boolean") throw new Error("sold flag required");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.sold) {
      const { error } = await supabaseAdmin
        .from("sold_artworks")
        .upsert({ artwork_id: data.artworkId, sold_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("sold_artworks")
        .delete()
        .eq("artwork_id", data.artworkId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// Set total units and (optionally) sold units. Clears legacy sold_artworks
// row when there's still stock left so the artwork reappears in checkout.
export const adminSetArtworkStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { artworkId: string; total: number; sold?: number }) => {
    if (!d.artworkId || typeof d.artworkId !== "string") throw new Error("artworkId required");
    const total = Math.floor(Number(d.total));
    const sold = d.sold == null ? undefined : Math.floor(Number(d.sold));
    if (!Number.isFinite(total) || total < 0 || total > 9999) throw new Error("Invalid total");
    if (sold != null && (!Number.isFinite(sold) || sold < 0 || sold > total))
      throw new Error("Invalid sold count");
    return { artworkId: d.artworkId, total, sold };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload: {
      artwork_id: string;
      total_units: number;
      sold_units?: number;
      updated_at: string;
    } = {
      artwork_id: data.artworkId,
      total_units: data.total,
      updated_at: new Date().toISOString(),
    };
    if (data.sold != null) payload.sold_units = data.sold;

    const { error } = await supabaseAdmin
      .from("artwork_stock")
      .upsert(payload, { onConflict: "artwork_id" });
    if (error) throw new Error(error.message);

    const { data: row } = await supabaseAdmin
      .from("artwork_stock")
      .select("total_units,sold_units")
      .eq("artwork_id", data.artworkId)
      .maybeSingle();
    const left = row ? row.total_units - row.sold_units : 0;
    if (left > 0) {
      await supabaseAdmin.from("sold_artworks").delete().eq("artwork_id", data.artworkId);
    }
    return { ok: true };
  });

// Increment sold_units by 1 / restock by 1 — handy quick-action.
export const adminAdjustArtworkSold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { artworkId: string; delta: number }) => {
    if (!d.artworkId || typeof d.artworkId !== "string") throw new Error("artworkId required");
    const delta = Math.trunc(Number(d.delta));
    if (delta !== 1 && delta !== -1) throw new Error("delta must be ±1");
    return { artworkId: d.artworkId, delta };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("artwork_stock")
      .select("total_units,sold_units")
      .eq("artwork_id", data.artworkId)
      .maybeSingle();
    const total = existing?.total_units ?? 1;
    const currentSold = existing?.sold_units ?? 0;
    const nextSold = Math.max(0, Math.min(total, currentSold + data.delta));
    const { error } = await supabaseAdmin
      .from("artwork_stock")
      .upsert(
        { artwork_id: data.artworkId, total_units: total, sold_units: nextSold, updated_at: new Date().toISOString() },
        { onConflict: "artwork_id" },
      );
    if (error) throw new Error(error.message);
    if (total - nextSold > 0) {
      await supabaseAdmin.from("sold_artworks").delete().eq("artwork_id", data.artworkId);
    }
    return { ok: true, sold: nextSold, left: total - nextSold };
  });


// -------- Analytics --------
export const adminGetAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id,status,total_cad,amount_total_cad,items,created_at,customer_email");
    if (error) throw new Error(error.message);
    const list = orders ?? [];

    const byStatus: Record<string, number> = { pending: 0, paid: 0, shipped: 0, delivered: 0, cancelled: 0 };
    let revenue = 0;
    let paidCount = 0;
    const customers = new Set<string>();
    const itemTallies: Record<string, { title: string; count: number; revenue: number }> = {};

    for (const o of list) {
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
      const amount = Number(o.amount_total_cad ?? o.total_cad ?? 0);
      if (o.status !== "cancelled") {
        revenue += amount;
        paidCount += 1;
      }
      if (o.customer_email) customers.add(o.customer_email);
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items as any[]) {
        const id = it.id ?? it.title ?? "unknown";
        const title = it.title ?? id;
        const qty = Number(it.qty ?? it.quantity ?? 1);
        const price = Number(it.price ?? it.unit_amount ?? it.unit_amount_cad ?? 0);
        const t = (itemTallies[id] ??= { title, count: 0, revenue: 0 });
        t.count += qty;
        t.revenue += price * qty;
      }
    }

    // 30-day series of revenue + order counts
    const days: { date: string; revenue: number; orders: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), revenue: 0, orders: 0 });
    }
    const dayIdx = new Map(days.map((d, i) => [d.date, i]));
    for (const o of list) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const idx = dayIdx.get(key);
      if (idx == null) continue;
      days[idx].orders += 1;
      if (o.status !== "cancelled") {
        days[idx].revenue += Number(o.amount_total_cad ?? o.total_cad ?? 0);
      }
    }

    const topItems = Object.entries(itemTallies)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    return {
      totals: {
        orders: list.length,
        revenue,
        avgOrder: paidCount ? revenue / paidCount : 0,
        customers: customers.size,
      },
      byStatus,
      days,
      topItems,
    };
  });

// -------- Subscribers --------
export const adminListSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("subscribers")
      .select("id,email,name,source,confirmed,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { subscribers: data ?? [] };
  });

export const adminDeleteSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d.id || typeof d.id !== "string") throw new Error("id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("subscribers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
