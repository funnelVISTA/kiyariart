import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — art by KIYARI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const [email, setEmail] = useState<string>("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast.error("New password must be at least 8 characters");
    if (next !== confirm) return toast.error("Passwords do not match");
    if (!email) return toast.error("No account email on file");

    setBusy(true);
    try {
      // Re-verify the current password by signing in again (defence-in-depth)
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInErr) throw new Error("Current password is incorrect");

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;

      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      toast.error(err.message ?? "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-28 pb-20">
      <div className="container-page max-w-2xl">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
        </Link>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
          <h1 className="font-display text-5xl md:text-6xl">Account</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{email || "…"}</span>
          </p>
        </div>

        <div className="mt-10 border border-border bg-card/40 backdrop-blur p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <KeyRound className="h-4 w-4 text-gold" />
            <h2 className="font-display text-2xl">Change password</h2>
          </div>

          <form onSubmit={submit} className="space-y-4 max-w-md">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Current password</span>
              <input
                type="password" required value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                className="mt-1.5 w-full bg-background border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">New password</span>
              <input
                type="password" required minLength={8} value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                className="mt-1.5 w-full bg-background border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Confirm new password</span>
              <input
                type="password" required minLength={8} value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="mt-1.5 w-full bg-background border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
              />
            </label>
            <button
              type="submit" disabled={busy}
              className="bg-gradient-gold text-primary-foreground py-3 px-6 text-xs tracking-[0.25em] uppercase font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? "Saving…" : "Update password"}
            </button>
            <p className="text-[11px] text-muted-foreground">Minimum 8 characters. You'll stay signed in on this device.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
