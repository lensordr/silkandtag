"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import { Product } from "@/lib/types";

const CATEGORIES = ["Chaquetas", "Vestidos", "Camisas", "Pantalones", "Zapatos", "Bolsos", "Accesorios"];

function ShopContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
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
        {CATEGORIES.map((c) => (
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

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">Cargando...</div>}>
      <ShopContent />
    </Suspense>
  );
}
