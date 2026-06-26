import { createServerFn } from "@tanstack/react-start";

/**
 * One-time setup: provision the studio admin account.
 * Idempotent: safe to call repeatedly. Returns "exists" if the user is already provisioned.
 *
 * Guarded by a setup token (env var SETUP_TOKEN). The endpoint stays disabled until
 * the token env var is set; once setup is done, unset SETUP_TOKEN to lock it.
 */
export const provisionAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.SETUP_TOKEN;
    if (!expected || data.token !== expected) {
      throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look for existing user
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;
    let user = list.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());

    if (!user) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      user = created.user!;
    } else {
      // Reset password to provided value
      await supabaseAdmin.auth.admin.updateUserById(user.id, { password: data.password });
    }

    // Grant admin role
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;

    return { ok: true, userId: user.id, email: user.email };
  });
