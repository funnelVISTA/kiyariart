import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Artwork } from "./artworks";

export type CartItem = { artwork: Artwork; qty: number };

type CartCtx = {
  items: CartItem[];
  add: (a: Artwork) => void;
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

  const add = (a: Artwork) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.artwork.id === a.id);
      if (existing) return prev.map((i) => i.artwork.id === a.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { artwork: a, qty: 1 }];
    });
    setOpen(true);
  };
  const remove = (id: string) => setItems((p) => p.filter((i) => i.artwork.id !== id));
  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.artwork.price, 0);

  return (
    <Ctx.Provider value={{ items, add, remove, clear, count, total, open, setOpen }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be within CartProvider");
  return c;
}
