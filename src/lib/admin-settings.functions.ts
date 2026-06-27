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

// Settings page payload: env status, webhook URL, recent webhook-driven syncs,
// last few orders updated by Stripe events.
export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const origin = process.env.PUBLIC_SITE_ORIGIN || "https://kiyari.art";
    const hasSandboxKey = Boolean(process.env.STRIPE_SANDBOX_API_KEY);
    const hasSandboxWebhook = Boolean(process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET);
    const hasLiveKey = Boolean(process.env.STRIPE_LIVE_API_KEY);
    const hasLiveWebhook = Boolean(process.env.PAYMENTS_LIVE_WEBHOOK_SECRET);

    const [{ data: recentPaid }, { data: recentEmails }, { count: pendingCount }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id,status,customer_email,amount_total_cad,stripe_session_id,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(8),
      supabaseAdmin
        .from("email_send_log")
        .select("template_name,recipient_email,status,sent_at,created_at,error_message")
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    return {
      env: {
        origin,
        sandbox: { key: hasSandboxKey, webhook: hasSandboxWebhook },
        live: { key: hasLiveKey, webhook: hasLiveWebhook },
        webhookUrl: {
          sandbox: `${origin}/api/public/payments/webhook?env=sandbox`,
          live: `${origin}/api/public/payments/webhook?env=live`,
        },
      },
      recentPaid: recentPaid ?? [],
      recentEmails: recentEmails ?? [],
      pendingCount: pendingCount ?? 0,
    };
  });
