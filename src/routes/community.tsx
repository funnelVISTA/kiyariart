import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { z } from "zod";
import { Mail, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/community")({
  validateSearch: (s: Record<string, unknown>): { inquiry?: string } => ({
    inquiry: typeof s.inquiry === "string" ? s.inquiry : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Community — art by KIYARI" },
      { name: "description", content: "Connect with Kiyari — newsletter, contact form, and supporters." },
      { property: "og:title", content: "Community — art by KIYARI" },
      { property: "og:description", content: "Join the network. Connect with the artist." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { t } = useI18n();
  const { inquiry } = Route.useSearch();
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: inquiry ? `Inquiry about: ${inquiry}\n\n` : "",
    subscribe: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (inquiry) {
      setForm((f) => ({ ...f, message: `Inquiry about: ${inquiry}\n\n${f.message.startsWith("Inquiry about:") ? "" : f.message}` }));
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiry]);

  const schema = z.object({
    name: z.string().trim().min(1, t("com.err.name")).max(80),
    email: z.string().trim().email(t("com.err.email")).max(160),
    message: z.string().trim().min(5, t("com.err.message")).max(1500),
    subscribe: z.boolean().optional(),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    toast.success(t("com.sent"), { description: t("com.sentDesc") });
    setForm({ name: "", email: "", message: "", subscribe: true });
  };

  return (
    <div className="pt-32 pb-20">
      <div className="container-page">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-4">{t("com.kicker")}</div>
          <h1 className="font-display text-6xl md:text-8xl leading-[0.95]">
            {t("com.title1")}<br />
            <span className="italic text-gradient-gold">{t("com.title2")}</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">{t("com.lede")}</p>
        </div>

        <div className="mt-20 grid lg:grid-cols-12 gap-12">
          <motion.form
            ref={formRef}
            onSubmit={submit}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7 space-y-6"
          >
            <Field label={t("com.name")} error={errors.name}>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-transparent border-b border-border focus:border-gold outline-none py-3 text-lg transition-colors"
                placeholder={t("com.name.ph")}
              />
            </Field>
            <Field label={t("com.email")} error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-transparent border-b border-border focus:border-gold outline-none py-3 text-lg transition-colors"
                placeholder={t("com.email.ph")}
              />
            </Field>
            <Field label={t("com.message")} error={errors.message}>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={5}
                className="w-full bg-transparent border-b border-border focus:border-gold outline-none py-3 text-lg resize-none transition-colors"
                placeholder={t("com.message.ph")}
              />
            </Field>
            <label className="flex items-center gap-3 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.subscribe}
                onChange={(e) => setForm({ ...form, subscribe: e.target.checked })}
                className="h-4 w-4 accent-[var(--gold)]"
              />
              {t("com.subscribe")}
            </label>
            <button
              type="submit"
              disabled={sending}
              className="group inline-flex items-center gap-3 bg-gradient-gold px-8 py-4 text-sm uppercase tracking-[0.2em] text-primary-foreground font-medium hover:shadow-glow transition disabled:opacity-50"
            >
              {sending ? t("com.sending") : <>{t("com.send")} <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
            </button>
          </motion.form>

          <div className="lg:col-span-5 space-y-6">
            <ContactCard
              icon={<MessageCircle className="h-5 w-5" />}
              title="WhatsApp"
              detail="+1 778 233 1921"
              href="https://wa.me/17782331921"
            />
            <ContactCard
              icon={<Mail className="h-5 w-5" />}
              title={t("com.email")}
              detail="hello@kiyari.art"
              href="mailto:hello@kiyari.art"
            />
            <div className="border border-border p-8">
              <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">{t("com.studio")}</div>
              <div className="font-display text-2xl">{t("com.studio.loc")}</div>
              <p className="mt-3 text-sm text-muted-foreground">{t("com.studio.note")}</p>
            </div>
            <SubscribeCard />
          </div>
        </div>

        <section className="mt-32 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">{t("com.supporters.kicker")}</div>
          <h2 className="font-display text-4xl md:text-5xl">{t("com.supporters.title")}</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{t("com.supporters.lede")}</p>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
            {["Future Stars Foundation", "Pyoor Entertainment", "Big Rich Entertainment", "L&R Studios"].map((s) => (
              <div key={s} className="border border-border p-6 hover:border-gold transition">
                <div className="text-sm uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground">
                  {s}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SubscribeCard() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.from("subscribers").insert({ email: email.trim(), name: name.trim() || null, source: "community" });
    setBusy(false);
    if (error && !/duplicate/i.test(error.message)) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success(t("com.news.toast"), { description: t("com.news.toastDesc") });
    setEmail(""); setName("");
  };

  return (
    <form onSubmit={submit} className="border border-gold/40 bg-card/40 p-8">
      <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">{t("com.news.kicker")}</div>
      <div className="font-display text-2xl">{t("com.news.title")}</div>
      <p className="mt-2 text-sm text-muted-foreground">{t("com.news.lede")}</p>
      <div className="mt-5 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("com.news.name.ph")} className="w-full bg-background border border-border px-3 py-2.5 text-sm focus:border-gold outline-none" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("com.news.email.ph")} className="w-full bg-background border border-border px-3 py-2.5 text-sm focus:border-gold outline-none" />
        <button disabled={busy} className="w-full bg-gradient-gold py-3 text-[11px] uppercase tracking-[0.25em] text-primary-foreground font-medium hover:shadow-glow transition disabled:opacity-50">
          {busy ? t("com.news.subscribing") : done ? t("com.news.subscribed") : t("com.news.subscribe")}
        </button>
      </div>
    </form>
  );
}


function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-1">{label}</div>
      {children}
      {error && <div className="mt-1 text-xs text-accent">{error}</div>}
    </div>
  );
}

function ContactCard({ icon, title, detail, href }: { icon: React.ReactNode; title: string; detail: string; href: string }) {
  return (
    <a href={href} className="group flex items-center gap-5 border border-border p-6 hover:border-gold transition">
      <div className="grid h-12 w-12 place-items-center border border-border text-gold group-hover:border-gold transition">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
        <div className="font-display text-xl mt-0.5 group-hover:text-gold transition">{detail}</div>
      </div>
    </a>
  );
}
