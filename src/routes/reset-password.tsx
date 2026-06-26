import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — art by KIYARI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [recoveryOk, setRecoveryOk] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // Supabase fires PASSWORD_RECOVERY when arriving from a reset email.
  // We listen first, then also check existing session as fallback.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryOk(true);
        setReady(true);
      }
    });
    // Fallback: hash usually contains type=recovery on first load
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("type=recovery")) {
      setRecoveryOk(true);
    }
    // Give Supabase a moment to process the hash
    const t = setTimeout(() => setReady(true), 600);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated", { description: "You're signed in with the new password." });
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12 bg-gradient-hero">
      <div className="w-full max-w-md bg-card/60 backdrop-blur border border-border p-8 md:p-10">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
        <h1 className="font-display text-4xl md:text-5xl">Set a new password</h1>

        {!ready ? (
          <p className="mt-6 text-sm text-muted-foreground">Verifying reset link…</p>
        ) : !recoveryOk ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              This page only works when opened from a password reset email. The link may have expired.
            </p>
            <Link
              to="/auth"
              className="inline-block text-xs uppercase tracking-[0.2em] text-gold hover:opacity-80"
            >
              Request a new reset link →
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">New password</span>
              <input
                type="password" required minLength={8} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full bg-background border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Confirm password</span>
              <input
                type="password" required minLength={8} value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1.5 w-full bg-background border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
              />
            </label>
            <button
              type="submit" disabled={busy}
              className="w-full bg-gradient-gold text-primary-foreground py-3 text-xs tracking-[0.25em] uppercase font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? "Saving…" : "Update password"}
            </button>
            <p className="text-[11px] text-muted-foreground">Minimum 8 characters. Use a mix of letters, numbers and symbols.</p>
          </form>
        )}
      </div>
    </div>
  );
}
