import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";

// /admin layout — redirects bare /admin to /admin/orders, enforces admin role for the whole subtree.
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — art by KIYARI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      throw redirect({ to: "/admin/orders" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "admin" | "denied">("checking");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!active) return;
      if (error || !data) setState("denied");
      else setState("admin");
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  if (state === "checking") {
    return <div className="pt-32 pb-20 text-center text-muted-foreground">Verifying access…</div>;
  }

  if (state === "denied") {
    return (
      <div className="pt-40 pb-20 container-page max-w-xl text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Studio</div>
        <h1 className="font-display text-5xl">Access denied</h1>
        <p className="mt-4 text-muted-foreground">
          Your account isn't an admin. Ask the site owner to grant the{" "}
          <code className="text-gold">admin</code> role to your user.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-gold"
          >
            Back to site
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-gold"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminNav />
      <Outlet />
    </>
  );
}
