"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { mediaUrl } from "@/lib/api";
import { productImages } from "@/lib/types";

const CHEAPEST_SHIPPING_RATE = 4.95;
const FREE_SHIPPING_THRESHOLD = 80;

export default function CartPage() {
  const { items, removeItem, total } = useCart();
  const freeShipping = total >= FREE_SHIPPING_THRESHOLD;
  const estimatedShipping = freeShipping ? 0 : CHEAPEST_SHIPPING_RATE;

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="font-serif-display text-3xl mb-3">Tu carrito esta vacio</h1>
        <p className="text-brand-gray mb-6">Descubre piezas unicas en la tienda.</p>
        <Link href="/tienda" className="btn-primary inline-block px-6 py-3 text-sm font-semibold uppercase tracking-wide">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif-display text-3xl mb-8">Tu carrito</h1>
      <div className="divide-y divide-brand-border border-t border-b border-brand-border">
        {items.map((p) => {
          const img = productImages(p)[0];
          return (
            <div key={p.id} className="flex items-center gap-4 py-4">
              <div className="w-20 h-24 bg-white border border-brand-border overflow-hidden shrink-0">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(img)} alt={p.title} className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="flex-1">
                <p className="font-serif-display">{p.title}</p>
                <p className="text-sm text-brand-gray">Talla {p.size} · {p.condition}</p>
              </div>
              <p className="font-semibold">{p.price.toFixed(2)} €</p>
              <button onClick={() => removeItem(p.id)} className="text-sm text-brand-gray hover:text-brand-orange underline">
                Quitar
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 max-w-sm ml-auto space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-brand-gray">Subtotal</span><span>{total.toFixed(2)} €</span></div>
        <div className="flex justify-between"><span className="text-brand-gray">Envio (desde)</span><span className={freeShipping ? "text-green-600 font-semibold" : ""}>{freeShipping ? "Gratis" : estimatedShipping.toFixed(2) + " €"}</span></div>
        {!freeShipping && (
          <p className="text-xs text-brand-gray">Envio gratis a partir de {FREE_SHIPPING_THRESHOLD.toFixed(0)} €. Elige transportista en el siguiente paso.</p>
        )}
        <div className="flex justify-between text-lg font-semibold pt-2 border-t border-brand-border">
          <span>Total</span><span>{(total + estimatedShipping).toFixed(2)} €</span>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Link href="/checkout" className="btn-primary px-8 py-3 text-sm font-semibold uppercase tracking-wide">
          Finalizar compra
        </Link>
      </div>
    </div>
  );
}
