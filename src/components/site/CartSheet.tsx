import { AnimatePresence, motion } from "motion/react";
import { X, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CartSheet() {
  const { items, remove, total, open, setOpen, clear } = useCart();
  const [step, setStep] = useState<"cart" | "form">("cart");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });

  const close = () => { setOpen(false); setTimeout(() => setStep("cart"), 300); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email required");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      customer_name: form.name.trim(),
      customer_email: form.email.trim(),
      customer_phone: form.phone.trim() || null,
      shipping_address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      items: items.map((i) => ({
        id: i.artwork.id,
        title: i.artwork.title,
        image: i.artwork.image,
        collection: i.artwork.collection,
        price: i.artwork.price,
        qty: i.qty,
      })),
      total_cad: total,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit", { description: error.message });
      return;
    }
    toast.success("Order received", { description: "Kiyari will email you to confirm." });
    clear();
    setForm({ name: "", email: "", phone: "", address: "", notes: "" });
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 240 }}
            className="fixed right-0 top-0 z-[70] h-full w-full max-w-md bg-background border-l border-border flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {step === "cart" ? "Your selection" : "Order details"}
                </div>
                <div className="font-display text-2xl">{step === "cart" ? "Cart" : "Checkout"}</div>
              </div>
              <button onClick={close} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-gold">
                <X className="h-4 w-4" />
              </button>
            </div>

            {step === "cart" ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {items.length === 0 ? (
                    <div className="text-center text-muted-foreground py-20">
                      <div className="font-display text-3xl mb-2">Empty</div>
                      <p className="text-sm">Browse the collection to begin.</p>
                    </div>
                  ) : items.map((i) => (
                    <motion.div layout key={i.artwork.id} className="flex gap-4 items-start group">
                      <img src={i.artwork.image} alt={i.artwork.title} className="h-24 w-24 object-cover" />
                      <div className="flex-1">
                        <div className="font-display text-lg">{i.artwork.title}</div>
                        <div className="text-xs text-muted-foreground">{i.artwork.collection}</div>
                        <div className="mt-1 text-gold">
                          {i.artwork.price > 0 ? `$${i.artwork.price.toLocaleString()} CAD` : "Inquiry"}
                        </div>
                      </div>
                      <button onClick={() => remove(i.artwork.id)} className="text-muted-foreground hover:text-accent transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>

                {items.length > 0 && (
                  <div className="border-t border-border p-6 space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estimated total</span>
                      <span className="text-gold font-medium">${total.toLocaleString()} CAD</span>
                    </div>
                    <button
                      onClick={() => setStep("form")}
                      className="w-full bg-gradient-gold text-primary-foreground py-3 text-sm tracking-[0.2em] uppercase font-medium hover:opacity-90 transition"
                    >
                      Request Invoice
                    </button>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Each piece is one-of-a-kind. We'll confirm availability & shipping.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-4">
                <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                <Field label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <Field label="Shipping address" textarea value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                <Field label="Notes" textarea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />

                <div className="pt-2 flex justify-between text-sm border-t border-border">
                  <span className="text-muted-foreground pt-3">Total</span>
                  <span className="text-gold font-medium pt-3">${total.toLocaleString()} CAD</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep("cart")} className="flex-1 border border-border py-3 text-xs tracking-[0.2em] uppercase hover:border-gold transition">
                    Back
                  </button>
                  <button type="submit" disabled={submitting} className="flex-[2] bg-gradient-gold text-primary-foreground py-3 text-xs tracking-[0.2em] uppercase font-medium hover:opacity-90 transition disabled:opacity-50">
                    {submitting ? "Submitting…" : "Place order"}
                  </button>
                </div>
              </form>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, value, onChange, type = "text", textarea = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)} rows={3}
          className="mt-1.5 w-full bg-card border border-border px-3 py-2 text-sm focus:border-gold outline-none transition"
        />
      ) : (
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full bg-card border border-border px-3 py-2 text-sm focus:border-gold outline-none transition"
        />
      )}
    </label>
  );
}
