"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, mediaUrl } from "@/lib/api";
import { Product, productImages } from "@/lib/types";
import { useCart } from "@/lib/cart";

export default function ProductClient() {
  const params = useParams();
  const router = useRouter();
  const { addItem, items } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api
      .getProduct(params.id as string)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">Cargando...</div>;
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-brand-gray mb-4">Producto no encontrado.</p>
        <Link href="/tienda" className="text-brand-orange font-semibold">Volver a la tienda →</Link>
      </div>
    );
  }

  const images = productImages(product);
  const inCart = items.some((i) => i.id === product.id);
  const unavailable = product.status !== "available";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="aspect-[3/4] bg-white border border-brand-border overflow-hidden">
            {images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(images[activeImg])} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-gray">Sin foto</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 border overflow-hidden ${i === activeImg ? "border-brand-orange" : "border-brand-border"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="uppercase tracking-wider text-sm text-brand-gray">{product.brand || product.category}</p>
          <h1 className="font-serif-display text-3xl mt-1">{product.title}</h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl font-semibold">{product.price.toFixed(2)} €</span>
            {product.original_price && (
              <span className="text-lg text-brand-gray line-through">{product.original_price.toFixed(2)} €</span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-brand-gray">Talla</span><p className="font-medium">{product.size || "-"}</p></div>
            <div><span className="text-brand-gray">Estado</span><p className="font-medium">{product.condition}</p></div>
            <div><span className="text-brand-gray">Color</span><p className="font-medium">{product.color || "-"}</p></div>
            <div><span className="text-brand-gray">Categoria</span><p className="font-medium">{product.category || "-"}</p></div>
          </div>

          {product.description && (
            <p className="mt-6 text-brand-gray leading-relaxed">{product.description}</p>
          )}

          <div className="mt-8 flex flex-col gap-3">
            {unavailable ? (
              <button disabled className="bg-brand-border text-brand-gray py-3 font-semibold uppercase tracking-wide cursor-not-allowed">
                {product.status === "sold" ? "Vendido" : "Reservado"}
              </button>
            ) : inCart ? (
              <button
                onClick={() => router.push("/carrito")}
                className="border border-brand-black py-3 font-semibold uppercase tracking-wide hover:bg-brand-black hover:text-white transition-colors"
              >
                Ya esta en tu carrito · Ver carrito
              </button>
            ) : (
              <button
                onClick={() => {
                  addItem(product);
                  setAdded(true);
                }}
                className="btn-primary py-3 font-semibold uppercase tracking-wide"
              >
                Anadir al carrito
              </button>
            )}
            {added && (
              <p className="text-sm text-brand-orange">
                Anadido. <Link href="/carrito" className="underline">Ir al carrito →</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
