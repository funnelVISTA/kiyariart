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

type UpdateInput = {
  orderId: string;
  status?: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  notes?: string | null;
};

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: UpdateInput) => {
    if (!data.orderId) throw new Error("orderId required");
    if (data.tracking_url && !/^https?:\/\//.test(data.tracking_url)) {
      throw new Error("tracking_url must be a full URL");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const previous = await supabaseAdmin
      .from("orders")
      .select("status,customer_email,customer_name,tracking_number")
      .eq("id", data.orderId)
      .maybeSingle();

    const patch: {
      updated_at: string;
      status?: UpdateInput["status"];
      tracking_carrier?: string | null;
      tracking_number?: string | null;
      tracking_url?: string | null;
      notes?: string | null;
    } = { updated_at: new Date().toISOString() };
    if (data.status !== undefined) patch.status = data.status;
    if (data.tracking_carrier !== undefined) patch.tracking_carrier = data.tracking_carrier;
    if (data.tracking_number !== undefined) patch.tracking_number = data.tracking_number;
    if (data.tracking_url !== undefined) patch.tracking_url = data.tracking_url;
    if (data.notes !== undefined) patch.notes = data.notes;

    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("id", data.orderId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Auto-send a "shipped" notification when status transitions to shipped
    // AND tracking info is present (or just shipped without tracking).
    const becameShipped =
      data.status === "shipped" && previous.data?.status !== "shipped";
    if (becameShipped && row.customer_email) {
      try {
        const { sendTransactionalEmailInternal } = await import(
          "@/lib/email/send-internal.server"
        );
        const origin = process.env.PUBLIC_SITE_ORIGIN || "https://kiyari.art";
        await sendTransactionalEmailInternal({
          templateName: "order-shipped",
          recipientEmail: row.customer_email,
          idempotencyKey: `shipped-${row.id}-${row.tracking_number ?? "notrack"}`,
          fromAddress: "Kiyari <hello@kiyari.art>",
          templateData: {
            customerName: row.customer_name,
            orderId: row.id,
            items: Array.isArray(row.items) ? row.items : [],
            trackingCarrier: row.tracking_carrier,
            trackingNumber: row.tracking_number,
            trackingUrl: row.tracking_url,
            statusUrl: `${origin}/orders/${row.id}?email=${encodeURIComponent(
              row.customer_email,
            )}`,
          },
        });
      } catch (e) {
        console.error("Shipped email failed", e);
      }
    }

    return { ok: true, order: row };
  });

export const adminResendReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id,customer_email,customer_name,items,amount_total_cad,total_cad,shipping_address",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Order not found");
    if (!row.customer_email) throw new Error("Order has no customer email");

    const { sendTransactionalEmailInternal } = await import(
      "@/lib/email/send-internal.server"
    );
    const origin = process.env.PUBLIC_SITE_ORIGIN || "https://kiyari.art";
    await sendTransactionalEmailInternal({
      templateName: "order-receipt",
      recipientEmail: row.customer_email,
      // New idempotency key on every resend so it actually re-enqueues.
      idempotencyKey: `receipt-${row.id}-${Date.now()}`,
      templateData: {
        customerName: row.customer_name,
        orderId: row.id,
        items: Array.isArray(row.items) ? row.items : [],
        amountTotal: Number(row.amount_total_cad ?? row.total_cad ?? 0),
        shippingAddress: row.shipping_address,
        statusUrl: `${origin}/orders/${row.id}?email=${encodeURIComponent(
          row.customer_email,
        )}`,
      },
    });
    return { ok: true, sentTo: row.customer_email };
  });

export const adminResendShipped = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select("id,customer_email,customer_name,items,tracking_carrier,tracking_number,tracking_url")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Order not found");
    if (!row.customer_email) throw new Error("Order has no customer email");
    if (!row.tracking_number) throw new Error("Add a tracking number before sending the shipped email");

    const { sendTransactionalEmailInternal } = await import(
      "@/lib/email/send-internal.server"
    );
    const origin = process.env.PUBLIC_SITE_ORIGIN || "https://kiyari.art";
    await sendTransactionalEmailInternal({
      templateName: "order-shipped",
      recipientEmail: row.customer_email,
      idempotencyKey: `shipped-${row.id}-${row.tracking_number}-${Date.now()}`,
      fromAddress: "Kiyari <hello@kiyari.art>",
      templateData: {
        customerName: row.customer_name,
        orderId: row.id,
        items: Array.isArray(row.items) ? row.items : [],
        trackingCarrier: row.tracking_carrier,
        trackingNumber: row.tracking_number,
        trackingUrl: row.tracking_url,
        statusUrl: `${origin}/orders/${row.id}?email=${encodeURIComponent(row.customer_email)}`,
      },
    });
    return { ok: true, sentTo: row.customer_email };
  });
