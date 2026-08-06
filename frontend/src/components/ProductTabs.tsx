"use client";

import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/lib/types";

type TabKey = "recientes" | "precio" | "descuento";

const TABS: { key: TabKey; label: string }[] = [
  { key: "recientes", label: "Recien llegado" },
  { key: "precio", label: "Precio mas bajo" },
  { key: "descuento", label: "Con descuento" },
];

export default function ProductTabs({ products }: { products: Product[] }) {
  const [tab, setTab] = useState<TabKey>("recientes");

  let sorted = [...products];
  if (tab === "precio") {
    sorted.sort((a, b) => a.price - b.price);
  } else if (tab === "descuento") {
    sorted = sorted.filter((p) => p.original_price && p.original_price > p.price);
  }
  // "recientes" keeps the order already returned by the API (newest first).

  return (
    <div>
      <ul className="flex items-center justify-center gap-8 mb-10 text-sm font-semibold uppercase tracking-wide">
        {TABS.map((t) => (
          <li key={t.key}>
            <button
              onClick={() => setTab(t.key)}
              className={
                t.key === tab
                  ? "text-brand-orange border-b-2 border-brand-orange pb-1"
                  : "text-brand-gray hover:text-brand-black pb-1"
              }
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {sorted.length === 0 ? (
        <p className="text-brand-gray text-center">No hay productos con descuento ahora mismo.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {sorted.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
