import { AnimatePresence, motion } from "motion/react";
import { X, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";

export function CartSheet() {
  const { items, remove, total, open, setOpen } = useCart();
  const navigate = useNavigate();

  const close = () => setOpen(false);

  const goToCheckout = () => {
    setOpen(false);
    navigate({ to: "/checkout" });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 240 }}
            className="fixed right-0 top-0 z-[70] h-full w-full max-w-md bg-background border-l border-border flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your selection</div>
                <div className="font-display text-2xl">Cart</div>
              </div>
              <button
                onClick={close}
                className="grid h-9 w-9 place-items-center rounded-full border border-border hover:border-gold"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="text-center text-muted-foreground py-20">
                  <div className="font-display text-3xl mb-2">Empty</div>
                  <p className="text-sm">Browse the collection to begin.</p>
                </div>
              ) : (
                items.map((i) => (
                  <motion.div layout key={i.artwork.id} className="flex gap-4 items-start group">
                    <img src={i.artwork.image} alt={i.artwork.title} className="h-24 w-24 object-cover" />
                    <div className="flex-1">
                      <div className="font-display text-lg">{i.artwork.title}</div>
                      <div className="text-xs text-muted-foreground">{i.artwork.collection}</div>
                      <div className="mt-1 text-gold">
                        {i.artwork.price > 0 ? `$${i.artwork.price.toLocaleString()} CAD` : "Inquiry"}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(i.artwork.id)}
                      className="text-muted-foreground hover:text-accent transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-border p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-gold font-medium">${total.toLocaleString()} CAD</span>
                </div>
                <button
                  onClick={goToCheckout}
                  className="w-full bg-gradient-gold text-primary-foreground py-3 text-sm tracking-[0.2em] uppercase font-medium hover:opacity-90 transition"
                >
                  Checkout securely
                </button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Shipping calculated at checkout. Each piece is one of a kind.
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
