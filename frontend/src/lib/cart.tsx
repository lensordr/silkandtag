"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Product } from "./types";

interface CartContextValue {
  items: Product[];
  addItem: (p: Product) => void;
  removeItem: (id: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "silktag_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  function addItem(p: Product) {
    setItems((prev) => (prev.some((i) => i.id === p.id) ? prev : [...prev, p]));
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function clear() {
    setItems([]);
  }

  const total = items.reduce((sum, i) => sum + i.price, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear, total, count: items.length }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
