import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Mail, RefreshCw, Search } from "lucide-react";
import { sendTransactionalEmail } from "@/lib/email/send";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — art by KIYARI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
type Status = typeof STATUSES[number];

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string | null;
  notes: string | null;
  items: Array<{ id: string; title: string; image: string; collection: string; price: number; qty: number }>;
  total_cad: number;
  status: Status;
  created_at: string;
  updated_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Check admin role on mount
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) {
        toast.error("Couldn't verify role");
        setIsAdmin(false);
        return;
      }
      setIsAdmin(!!data);
    })();
  }, [navigate]);

  const ordersQ = useQuery({
    queryKey: ["orders"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Order[];
    },
  });

  const filtered = useMemo(() => {
    const list = ordersQ.data ?? [];
    return list.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          o.customer_name.toLowerCase().includes(s) ||
          o.customer_email.toLowerCase().includes(s) ||
          o.id.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [ordersQ.data, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, pending: 0, paid: 0, shipped: 0, delivered: 0, cancelled: 0 };
    (ordersQ.data ?? []).forEach((o) => { c.all++; c[o.status]++; });
    return c;
  }, [ordersQ.data]);

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked as ${status}`);
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const [sendingTest, setSendingTest] = useState(false);
  const sendTest = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const to = userData.user?.email;
    if (!to) { toast.error("No email on your account"); return; }
    setSendingTest(true);
    try {
      await sendTransactionalEmail({
        templateName: "test-email",
        recipientEmail: to,
        idempotencyKey: `test-${Date.now()}`,
        templateData: { recipientName: userData.user?.user_metadata?.name || "" },
      });
      toast.success(`Test email queued to ${to}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setSendingTest(false);
    }
  };

  if (isAdmin === null) {
    return <div className="pt-32 pb-20 text-center text-muted-foreground">Verifying access…</div>;
  }

  if (isAdmin === false) {
    return (
      <div className="pt-40 pb-20 container-page max-w-xl text-center">
        <h1 className="font-display text-5xl">Access denied</h1>
        <p className="mt-4 text-muted-foreground">
          Your account isn't an admin yet. Ask the site owner to grant the <code className="text-gold">admin</code> role to your user.
        </p>
        <button onClick={signOut} className="mt-8 inline-flex items-center gap-2 border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-gold">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    );
  }

  const revenue = (ordersQ.data ?? [])
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total_cad), 0);

  return (
    <div className="pt-28 pb-20">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
            <h1 className="font-display text-5xl md:text-6xl">Orders</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={sendTest} disabled={sendingTest} className="inline-flex items-center gap-2 border border-gold/40 text-gold px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-gold/10 transition disabled:opacity-60">
              <Mail className="h-3.5 w-3.5" /> {sendingTest ? "Sending…" : "Send test email"}
            </button>
            <button onClick={() => ordersQ.refetch()} className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:border-gold transition">
              <RefreshCw className={`h-3.5 w-3.5 ${ordersQ.isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button onClick={signOut} className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:border-gold transition">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total orders" value={counts.all.toString()} />
          <Stat label="Pending" value={counts.pending.toString()} />
          <Stat label="Shipped" value={counts.shipped.toString()} />
          <Stat label="Revenue (non-cancelled)" value={`$${revenue.toLocaleString()}`} accent />
        </div>

        {/* Filters */}
        <div className="mt-8 flex flex-wrap gap-2 items-center border-b border-border pb-5">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] border transition ${
                filter === s ? "border-gold text-gold bg-gold/5" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s} {counts[s] != null && <span className="opacity-60 ml-1">({counts[s]})</span>}
            </button>
          ))}
          <div className="ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, id…"
              className="pl-9 pr-3 py-2 bg-card border border-border text-xs w-56 focus:border-gold outline-none"
            />
          </div>
        </div>

        {/* Orders list */}
        <div className="mt-6 space-y-3">
          {ordersQ.isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
          {ordersQ.isError && <p className="text-accent text-sm">Failed to load orders.</p>}
          {!ordersQ.isLoading && filtered.length === 0 && (
            <p className="text-muted-foreground text-sm py-10 text-center">No orders match.</p>
          )}

          {filtered.map((o) => {
            const isOpen = expanded === o.id;
            return (
              <div key={o.id} className="border border-border bg-card/40">
                <button
                  onClick={() => setExpanded(isOpen ? null : o.id)}
                  className="w-full grid grid-cols-12 gap-3 p-4 text-left hover:bg-card/80 transition"
                >
                  <div className="col-span-12 md:col-span-4">
                    <div className="font-display text-lg">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.customer_email}</div>
                  </div>
                  <div className="col-span-6 md:col-span-2 text-sm">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-[0.2em]">Items</div>
                    {o.items.length}
                  </div>
                  <div className="col-span-6 md:col-span-2 text-sm">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-[0.2em]">Total</div>
                    <span className="text-gold">${Number(o.total_cad).toLocaleString()}</span>
                  </div>
                  <div className="col-span-6 md:col-span-2 text-xs text-muted-foreground self-center">
                    {new Date(o.created_at).toLocaleDateString()}
                  </div>
                  <div className="col-span-6 md:col-span-2 self-center">
                    <StatusPill status={o.status} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border p-5 grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3">Customer</div>
                      <dl className="text-sm space-y-1.5">
                        <Row k="Name" v={o.customer_name} />
                        <Row k="Email" v={o.customer_email} />
                        {o.customer_phone && <Row k="Phone" v={o.customer_phone} />}
                        {o.shipping_address && <Row k="Address" v={o.shipping_address} />}
                        {o.notes && <Row k="Notes" v={o.notes} />}
                        <Row k="Order ID" v={<code className="text-xs">{o.id}</code>} />
                      </dl>

                      <div className="text-xs uppercase tracking-[0.2em] text-gold mt-6 mb-3">Update status</div>
                      <div className="flex flex-wrap gap-2">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(o.id, s)}
                            disabled={o.status === s}
                            className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] border transition ${
                              o.status === s
                                ? "border-gold text-gold bg-gold/10 cursor-default"
                                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3">Items</div>
                      <ul className="space-y-3">
                        {o.items.map((it, i) => (
                          <li key={i} className="flex gap-3 items-start">
                            <img src={it.image} alt={it.title} className="h-16 w-16 object-cover" />
                            <div className="flex-1">
                              <div className="font-display">{it.title}</div>
                              <div className="text-xs text-muted-foreground">{it.collection}</div>
                            </div>
                            <div className="text-sm text-gold">
                              {it.price > 0 ? `$${it.price.toLocaleString()}` : "Inquiry"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-border p-4 bg-card/40">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl mt-1 ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground self-center">{k}</dt>
      <dd className="col-span-2">{v}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    pending: "bg-muted text-muted-foreground border-border",
    paid: "bg-gold/10 text-gold border-gold/40",
    shipped: "bg-blue-500/10 text-blue-400 border-blue-400/40",
    delivered: "bg-green-500/10 text-green-400 border-green-400/40",
    cancelled: "bg-accent/10 text-accent border-accent/40",
  };
  return (
    <span className={`inline-block px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] border ${map[status]}`}>
      {status}
    </span>
  );
}
