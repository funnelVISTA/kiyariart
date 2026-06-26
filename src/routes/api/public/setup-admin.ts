import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
});

export const Route = createFileRoute("/api/public/setup-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SETUP_TOKEN;
        if (!expected) {
          return new Response("Setup disabled", { status: 403 });
        }
        let parsed;
        try {
          parsed = schema.parse(await request.json());
        } catch (e: any) {
          return new Response("Bad request", { status: 400 });
        }
        if (parsed.token !== expected) {
          return new Response("Forbidden", { status: 403 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (listErr) return new Response(listErr.message, { status: 500 });
        let user = list.users.find((u) => u.email?.toLowerCase() === parsed.email.toLowerCase());
        if (!user) {
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: parsed.email,
            password: parsed.password,
            email_confirm: true,
          });
          if (createErr) return new Response(createErr.message, { status: 500 });
          user = created.user!;
        } else {
          await supabaseAdmin.auth.admin.updateUserById(user.id, { password: parsed.password });
        }
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
        if (roleErr) return new Response(roleErr.message, { status: 500 });
        return Response.json({ ok: true, userId: user.id, email: user.email });
      },
    },
  },
});
