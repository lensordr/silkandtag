import Link from "next/link";
import ProductTabs from "@/components/ProductTabs";
import { api } from "@/lib/api";
import { Product } from "@/lib/types";

const CATEGORIES = [
  "Chaquetas",
  "Vestidos",
  "Camisas",
  "Pantalones",
  "Zapatos",
  "Bolsos",
];

// Category banner tiles use the brand lifestyle photos as a backdrop --
// real per-category photography can replace these once it exists.
const BANNER_TILES = [
  { category: "Chaquetas", label: "Chaquetas y abrigos", img: "/images/lifestyle/montana.jpg" },
  { category: "Camisas", label: "Camisas y camisetas", img: "/images/lifestyle/calle.jpg" },
  { category: "Zapatos", label: "Zapatos y accesorios", img: "/images/lifestyle/playa.jpg" },
];

export default async function HomePage() {
  let products: Product[] = [];
  try {
    products = await api.listProducts({ status: "available" });
  } catch {
    products = [];
  }
  const featured = products.slice(0, 8);
  const bestDeal = products.find((p) => p.original_price && p.original_price > p.price) || products[0];

  return (
    <div>
      {/* Hero: full-bleed photo instead of the old logo-on-blur layout */}
      <section className="relative border-b border-brand-border overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/lifestyle/playa.jpg"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/70 to-white/10" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
          <p className="uppercase tracking-[0.2em] text-brand-orange text-sm font-semibold mb-4">
            Moda circular, primera calidad
          </p>
          <h1 className="font-serif-display text-4xl sm:text-5xl leading-tight max-w-lg">
            Moda con historia,<br /> estilo sin excusas.
          </h1>
          <p className="mt-5 text-brand-gray text-lg leading-relaxed max-w-md">
            En Silk &amp; Tag seleccionamos prendas de calidad en excelente
            estado para que vistas mejor gastando menos, dando a cada
            pieza una nueva vida en Espana.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/tienda" className="btn-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide">
              Ver tienda
            </Link>
            <Link href="/nosotros" className="px-6 py-3 text-sm font-semibold uppercase tracking-wide border border-brand-black hover:bg-brand-black hover:text-white transition-colors bg-white/70">
              Nuestra historia
            </Link>
          </div>
        </div>
      </section>

      {/* Category banner: 3 asymmetric image tiles, same staggered layout as the reference */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-12 gap-5">
          <Link
            href={`/tienda?category=${encodeURIComponent(BANNER_TILES[0].category)}`}
            className="group relative col-span-12 lg:col-span-7 lg:col-start-6 aspect-[16/9] overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BANNER_TILES[0].img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-black/25 flex flex-col items-start justify-center px-8">
              <h2 className="text-white font-serif-display text-2xl mb-2">{BANNER_TILES[0].label}</h2>
              <span className="text-white text-sm font-semibold uppercase tracking-wide border-b border-white pb-1">Ver tienda</span>
            </div>
          </Link>
          <Link
            href={`/tienda?category=${encodeURIComponent(BANNER_TILES[1].category)}`}
            className="group relative col-span-12 sm:col-span-6 lg:col-span-5 aspect-[4/5] overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BANNER_TILES[1].img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-black/25 flex flex-col items-start justify-center px-8">
              <h2 className="text-white font-serif-display text-2xl mb-2">{BANNER_TILES[1].label}</h2>
              <span className="text-white text-sm font-semibold uppercase tracking-wide border-b border-white pb-1">Ver tienda</span>
            </div>
          </Link>
          <Link
            href={`/tienda?category=${encodeURIComponent(BANNER_TILES[2].category)}`}
            className="group relative col-span-12 sm:col-span-6 lg:col-span-7 aspect-[4/5] lg:aspect-[16/9] overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BANNER_TILES[2].img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-black/25 flex flex-col items-start justify-center px-8">
              <h2 className="text-white font-serif-display text-2xl mb-2">{BANNER_TILES[2].label}</h2>
              <span className="text-white text-sm font-semibold uppercase tracking-wide border-b border-white pb-1">Ver tienda</span>
            </div>
          </Link>
        </div>

        {/* Full category list stays reachable as a compact row below the tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-8">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/tienda?category=${encodeURIComponent(c)}`}
              className="border border-brand-border bg-white text-center py-3 text-sm font-medium hover:border-brand-orange hover:text-brand-orange transition-colors"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      {/* Product section with sort tabs, matching the reference's filter-tab layout */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-serif-display text-2xl">Descubre la tienda</h2>
          <Link href="/tienda" className="text-sm font-semibold text-brand-orange hover:underline">
            Ver todo →
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-brand-gray mt-6">
            Todavia no hay productos publicados. Vuelve pronto o entra al panel de administracion para anadir el primero.
          </p>
        ) : (
          <div className="mt-8">
            <ProductTabs products={featured} />
          </div>
        )}
      </section>

      {/* Mid-page promo split: real free-shipping threshold + a real featured item, no fake countdown */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-3 items-center">
          <div>
            <h2 className="font-serif-display text-2xl leading-snug">
              Prendas de<br />segunda mano<br />con primera calidad
            </h2>
          </div>
          <div className="relative aspect-square overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/lifestyle/montana.jpg" alt="" className="w-full h-full object-cover" />
            <div className="absolute bottom-4 right-4 bg-white px-4 py-3 text-center shadow">
              <span className="block text-xs uppercase tracking-wide text-brand-gray">Envio gratis desde</span>
              <span className="block font-serif-display text-xl text-brand-orange">80 €</span>
            </div>
          </div>
          {bestDeal ? (
            <div>
              <span className="text-brand-orange text-sm font-semibold uppercase tracking-wide">
                {bestDeal.original_price && bestDeal.original_price > bestDeal.price ? "Oferta destacada" : "Recien llegado"}
              </span>
              <h3 className="font-serif-display text-xl mt-2">{bestDeal.title}</h3>
              <p className="mt-2 flex items-center gap-2">
                <span className="font-semibold text-lg">{bestDeal.price.toFixed(2)} €</span>
                {bestDeal.original_price && (
                  <span className="text-sm text-brand-gray line-through">{bestDeal.original_price.toFixed(2)} €</span>
                )}
              </p>
              <Link href={`/producto/${bestDeal.id}`} className="btn-primary inline-block mt-4 px-6 py-3 text-sm font-semibold uppercase tracking-wide">
                Ver pieza
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-brand-gray">Pronto anadiremos mas piezas.</p>
            </div>
          )}
        </div>
      </section>

      {/* Instagram-style band: asymmetric photo grid + follow text, matching the reference's Instagram section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[2fr_1fr] items-stretch">
          <div className="grid grid-cols-3 gap-3">
            <div className="aspect-square overflow-hidden col-span-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/lifestyle/montana.jpg" alt="Silk & Tag en la montana" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="aspect-square overflow-hidden col-span-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/lifestyle/calle.jpg" alt="Silk & Tag en la calle" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="aspect-square overflow-hidden col-span-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/lifestyle/playa.jpg" alt="Silk & Tag en la playa" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col items-start justify-center bg-brand-black text-white p-8">
            <h2 className="font-serif-display text-2xl mb-3">Instagram</h2>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Etiquetanos con tus looks de Silk &amp; Tag y consigue un codigo de descuento del 10%.
            </p>
            <a
              href="https://www.instagram.com/silkandtag/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif-display text-xl text-brand-orange hover:underline"
            >
              @silkandtag
            </a>
          </div>
        </div>
      </section>

      <section className="bg-brand-black text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid gap-8 sm:grid-cols-3 text-center">
          <div>
            <p className="font-serif-display text-3xl text-brand-orange">100%</p>
            <p className="text-white/70 mt-2 text-sm">Prendas revisadas a mano</p>
          </div>
          <div>
            <p className="font-serif-display text-3xl text-brand-orange">80€</p>
            <p className="text-white/70 mt-2 text-sm">Envio gratis a partir de este importe</p>
          </div>
          <div>
            <p className="font-serif-display text-3xl text-brand-orange">♻</p>
            <p className="text-white/70 mt-2 text-sm">Moda circular y sostenible</p>
          </div>
        </div>
      </section>
    </div>
  );
}
