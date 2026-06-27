import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, Webhook, Mail, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { adminGetSettings } from "@/lib/admin-settings.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin · art by KIYARI" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const q = useQuery({ queryKey: ["admin", "settings"], queryFn: () => adminGetSettings() });

  const copy = (s: string) => {
    navigator.clipboard.writeText(s).then(
      () => toast.success("Copied"),
      () => toast.error("Copy failed"),
    );
  };

  if (q.isLoading)
    return <div className="container-page pt-10 text-muted-foreground text-sm">Loading…</div>;
  if (q.error) return <div className="container-page pt-10 text-accent text-sm">Failed to load.</div>;

  const d = q.data!;
  const sandboxOk = d.env.sandbox.key && d.env.sandbox.webhook;
  const liveOk = d.env.live.key && d.env.live.webhook;

  return (
    <div className="pt-10 pb-20">
      <div className="container-page max-w-5xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
        <h1 className="font-display text-5xl md:text-6xl">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connection status, webhook endpoints, and recent sync activity.
        </p>

        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Payments</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <EnvCard label="Sandbox (test)" ok={sandboxOk} hasKey={d.env.sandbox.key} hasWebhook={d.env.sandbox.webhook} />
            <EnvCard label="Live" ok={liveOk} hasKey={d.env.live.key} hasWebhook={d.env.live.webhook} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3 flex items-center gap-2">
            <Webhook className="h-3.5 w-3.5" /> Webhook endpoints
          </h2>
          <div className="border border-border bg-card/40 divide-y divide-border">
            <WebhookRow label="Sandbox" url={d.env.webhookUrl.sandbox} onCopy={copy} />
            <WebhookRow label="Live" url={d.env.webhookUrl.live} onCopy={copy} />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            These endpoints are registered automatically. They write paid orders, decrement stock and send receipts even if the buyer closes the tab.
          </p>
        </section>

        <section className="mt-10 grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Recent order syncs</h2>
            <div className="border border-border bg-card/40 divide-y divide-border text-xs">
              {d.recentPaid.length === 0 && <div className="p-4 text-muted-foreground">No orders yet.</div>}
              {d.recentPaid.map((o) => (
                <Link
                  key={o.id}
                  to="/admin/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="block p-3 hover:bg-gold/5"
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={o.status} />
                    <span className="font-mono text-[11px]">{o.id.slice(0, 8)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate">{o.customer_email ?? "—"}</span>
                    <span className="ml-auto text-gold">${Number(o.amount_total_cad ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-[0.2em]">
                    {o.status} · {new Date(o.updated_at).toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
            {d.pendingCount > 0 && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-accent">
                <AlertTriangle className="h-3.5 w-3.5" />
                {d.pendingCount} order(s) still pending payment confirmation.
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3 flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> Recent emails
            </h2>
            <div className="border border-border bg-card/40 divide-y divide-border text-xs">
              {d.recentEmails.length === 0 && <div className="p-4 text-muted-foreground">No emails yet.</div>}
              {d.recentEmails.map((e, i) => (
                <div key={i} className="p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        e.status === "sent" || e.sent_at ? "bg-gold" : "bg-accent"
                      }`}
                    />
                    <span className="font-medium">{e.template_name}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate">{e.recipient_email}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-[0.2em]">
                    {e.status} · {new Date(e.created_at).toLocaleString()}
                  </div>
                  {e.error_message && (
                    <div className="text-[10px] text-accent mt-1">{e.error_message}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Studio</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <KV k="Site origin" v={d.env.origin} />
            <KV k="Notification email" v="kiyarisart@gmail.com" />
            <KV k="Studio location" v="Calgary, AB" />
            <KV k="Domain" v="kiyari.art" />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            To change these defaults, ask your agent. Account password and login email are managed under{" "}
            <Link to="/account" className="text-gold hover:underline">Account</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}

function EnvCard({
  label,
  ok,
  hasKey,
  hasWebhook,
}: {
  label: string;
  ok: boolean;
  hasKey: boolean;
  hasWebhook: boolean;
}) {
  return (
    <div className={`border p-4 ${ok ? "border-gold/40 bg-gold/5" : "border-border bg-card/40"}`}>
      <div className="flex items-center justify-between">
        <div className="font-display text-xl">{label}</div>
        <span
          className={`text-[10px] uppercase tracking-[0.25em] px-2 py-0.5 ${
            ok ? "bg-gold/20 text-gold" : "bg-accent/20 text-accent"
          }`}
        >
          {ok ? "Connected" : "Not connected"}
        </span>
      </div>
      <ul className="mt-3 text-xs space-y-1.5 text-muted-foreground">
        <li className="flex items-center gap-2">
          {hasKey ? <Check className="h-3.5 w-3.5 text-gold" /> : <span className="text-accent">×</span>} API key
        </li>
        <li className="flex items-center gap-2">
          {hasWebhook ? <Check className="h-3.5 w-3.5 text-gold" /> : <span className="text-accent">×</span>} Webhook secret
        </li>
      </ul>
    </div>
  );
}

function WebhookRow({ label, url, onCopy }: { label: string; url: string; onCopy: (s: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-3 text-xs">
      <span className="w-20 uppercase tracking-[0.2em] text-[10px] text-muted-foreground">{label}</span>
      <span className="flex-1 font-mono text-[11px] truncate">{url}</span>
      <button
        onClick={() => onCopy(url)}
        className="inline-flex items-center gap-1 px-2 py-1 border border-border hover:border-gold transition"
      >
        <Copy className="h-3 w-3" /> Copy
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1 border border-border hover:border-gold transition"
      >
        <ExternalLink className="h-3 w-3" /> Open
      </a>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const c =
    status === "paid"
      ? "bg-gold"
      : status === "shipped"
      ? "bg-blue-400"
      : status === "delivered"
      ? "bg-emerald-400"
      : status === "cancelled"
      ? "bg-accent"
      : "bg-muted-foreground";
  return <span className={`inline-block h-2 w-2 rounded-full ${c}`} />;
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="border border-border p-3 bg-card/40">
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{k}</div>
      <div className="mt-1 font-mono text-xs">{v}</div>
    </div>
  );
}
