"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import { Product } from "@/lib/types";

export default function ShopClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const category = params.get("category") || "";
  const q = params.get("q") || "";

  useEffect(() => {
    setLoading(true);
    const query: Record<string, string> = { status: "available" };
    if (category) query.category = category;
    if (q) query.q = q;
    api
      .listProducts(query)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, q]);

  // Category filter buttons should only ever show categories that currently
  // have at least one available item -- otherwise clients see empty
  // categories, and newly-added categories never show up until someone
  // manually edits this list. Derived from the full available catalog
  // (unfiltered by the active category selection).
  useEffect(() => {
    api
      .listProducts({ status: "available" })
      .then((all: Product[]) => {
        const distinct = Array.from(new Set(all.map((p) => p.category).filter(Boolean)));
        distinct.sort((a, b) => a.localeCompare(b, "es"));
        setCategories(distinct);
      })
      .catch(() => setCategories([]));
  }, []);

  function setCategory(c: string) {
    const sp = new URLSearchParams(params.toString());
    if (c) sp.set("category", c);
    else sp.delete("category");
    router.push(`/tienda?${sp.toString()}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif-display text-3xl mb-2">Tienda</h1>
      <p className="text-brand-gray mb-8">Piezas unicas, disponibles mientras duren.</p>

      <div className="flex flex-wrap gap-2 mb-10">
        <button
          onClick={() => setCategory("")}
          className={`px-4 py-2 text-sm border ${!category ? "bg-brand-black text-white border-brand-black" : "border-brand-border hover:border-brand-black"}`}
        >
          Todo
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-2 text-sm border ${category === c ? "bg-brand-black text-white border-brand-black" : "border-brand-border hover:border-brand-black"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-brand-gray">Cargando...</p>
      ) : products.length === 0 ? (
        <p className="text-brand-gray">No hay productos disponibles en esta categoria por ahora.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

