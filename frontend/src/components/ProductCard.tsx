import Link from "next/link";
import { Product, productImages } from "@/lib/types";
import { mediaUrl } from "@/lib/api";

const NEW_WINDOW_DAYS = 10; // items added in the last N days get a "Nuevo" tag

export default function ProductCard({ product }: { product: Product }) {
  const images = productImages(product);
  const cover = images[0];
  const discount =
    product.original_price && product.original_price > product.price
      ? Math.round(100 - (product.price / product.original_price) * 100)
      : null;
  const isNew =
    !discount &&
    Date.now() - new Date(product.created_at).getTime() < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return (
    <Link
      href={`/producto/${product.id}`}
      className="group block bg-white border border-brand-border hover:border-brand-black transition-colors"
    >
      <div className="relative aspect-[3/4] bg-[#F1EFE9] overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(cover)}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-gray text-sm">
            Sin foto
          </div>
        )}

        {discount && (
          <span className="absolute top-3 left-3 bg-brand-orange text-white text-xs font-semibold px-2 py-1">
            -{discount}%
          </span>
        )}
        {!discount && isNew && (
          <span className="absolute top-3 left-3 bg-brand-black text-white text-xs font-semibold px-2 py-1 uppercase">
            Nuevo
          </span>
        )}
        {product.status !== "available" && (
          <span className="absolute top-3 right-3 bg-brand-black text-white text-xs font-semibold px-2 py-1 uppercase">
            {product.status === "sold" ? "Vendido" : "Reservado"}
          </span>
        )}

        {/* Quick-view overlay, matching the reference template's hover pattern */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-3 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/60 to-transparent">
          <span className="bg-white text-brand-black text-xs font-semibold uppercase tracking-wide px-3 py-2 group-hover:bg-brand-orange group-hover:text-white transition-colors">
            Ver producto
          </span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wider text-brand-gray">{product.brand || product.category}</p>
        <h3 className="font-serif-display text-base mt-1 leading-snug">{product.title}</h3>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-semibold text-brand-black">{product.price.toFixed(2)} €</span>
          {product.original_price && (
            <span className="text-sm text-brand-gray line-through">{product.original_price.toFixed(2)} €</span>
          )}
        </div>
        <p className="text-xs text-brand-gray mt-1">Talla {product.size} · {product.condition}</p>
      </div>
    </Link>
  );
}
