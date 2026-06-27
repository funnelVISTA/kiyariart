import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut, Package, LayoutDashboard } from "lucide-react";

const items = [
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/account", label: "Account", icon: KeyRound },
] as const;

export function AdminNav() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container-page flex items-center gap-2 h-14">
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-2 mr-4 text-xs uppercase tracking-[0.3em] text-gold"
        >
          <LayoutDashboard className="h-4 w-4" /> Studio
        </Link>
        <nav className="flex items-center gap-1 flex-1">
          {items.map((it) => {
            const active = pathname === it.to || pathname.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] border transition ${
                  active
                    ? "border-gold text-gold bg-gold/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <Link
          to="/"
          className="hidden sm:inline text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-gold transition px-3"
        >
          View site
        </Link>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] hover:border-gold transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
