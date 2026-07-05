import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Artwork } from "./artworks";

export type CartItem = { artwork: Artwork; qty: number };

type CartCtx = {
  items: CartItem[];
  add: (a: Artwork) => boolean;
  has: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  total: number;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "kiyari-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // One-of-one model: adding an artwork already in the cart is a no-op.
  // Returns true if the item was newly added, false if it was already present.
  const add = (a: Artwork): boolean => {
    let added = false;
    setItems((prev) => {
      if (prev.some((i) => i.artwork.id === a.id)) return prev;
      added = true;
      return [...prev, { artwork: a, qty: 1 }];
    });
    if (added) setOpen(true);
    return added;
  };
  const has = (id: string) => items.some((i) => i.artwork.id === id);
  const remove = (id: string) => setItems((p) => p.filter((i) => i.artwork.id !== id));
  const clear = () => setItems([]);

  // Each piece is 1-of-1 — count equals distinct items and total ignores qty.
  const count = items.length;
  const total = items.reduce((s, i) => s + i.artwork.price, 0);

  return (
    <Ctx.Provider value={{ items, add, has, remove, clear, count, total, open, setOpen }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be within CartProvider");
  return c;
}
