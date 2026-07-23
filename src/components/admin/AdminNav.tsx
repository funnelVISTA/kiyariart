import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut, Package, LayoutDashboard, Palette, BarChart3, Users, Settings, Calendar, History } from "lucide-react";

const items = [
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/admin/events", label: "Events", icon: Calendar },
  { to: "/admin/inventory", label: "Inventory", icon: Palette },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/subscribers", label: "Subscribers", icon: Users },
  { to: "/admin/activity", label: "Activity", icon: History },
  { to: "/admin/settings", label: "Settings", icon: Settings },
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
      <div className="container-page grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 h-14">
        <Link
          to="/admin/orders"
          className="inline-flex shrink-0 items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold"
        >
          <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Studio</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
          {items.map((it) => {
            const active = pathname === it.to || pathname.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`inline-flex shrink-0 items-center gap-2 px-2.5 py-1.5 text-[11px] uppercase tracking-[0.18em] border transition ${
                  active
                    ? "border-gold text-gold bg-gold/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/"
            className="hidden md:inline text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-gold transition px-2"
          >
            View site
          </Link>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="inline-flex items-center gap-2 border border-border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.2em] hover:border-gold transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
