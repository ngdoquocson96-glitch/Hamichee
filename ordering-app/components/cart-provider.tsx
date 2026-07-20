"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/types";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  total: number;
  ready: boolean;
  add: (item: CartItem) => void;
  setQuantity: (productId: string, variantLabel: string | undefined, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "hamichee-cart-v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setItems(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    ready,
    add: (item) => setItems((current) => {
      const found = current.find((entry) => entry.productId === item.productId && entry.variantLabel === item.variantLabel);
      return found
        ? current.map((entry) => entry === found ? { ...entry, quantity: entry.quantity + item.quantity } : entry)
        : [...current, item];
    }),
    setQuantity: (productId, variantLabel, quantity) => setItems((current) => quantity <= 0
      ? current.filter((item) => !(item.productId === productId && item.variantLabel === variantLabel))
      : current.map((item) => item.productId === productId && item.variantLabel === variantLabel ? { ...item, quantity } : item)),
    clear: () => setItems([]),
  }), [items, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart phải nằm trong CartProvider");
  return value;
}
