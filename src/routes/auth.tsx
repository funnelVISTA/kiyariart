import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — art by KIYARI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email) {
      toast.error("Enter your email above first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Reset link sent", { description: "Check your inbox for the link to set a new password." });
  };


  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12 bg-gradient-hero">
      <div className="w-full max-w-md bg-card/60 backdrop-blur border border-border p-8 md:p-10">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Studio</div>
        <h1 className="font-display text-4xl md:text-5xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">For the artist & studio team only.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Email</span>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full bg-background border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Password</span>
            <input
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full bg-background border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
            />
          </label>
          <button
            type="submit" disabled={busy}
            className="w-full bg-gradient-gold text-primary-foreground py-3 text-xs tracking-[0.25em] uppercase font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Sign in"}
          </button>
        </form>

        <button
          onClick={resetPassword}
          className="mt-6 w-full text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold transition"
        >
          Forgot password?
        </button>
      </div>
    </div>
  );
}
