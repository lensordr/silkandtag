import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Logo from "@/components/Logo";
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

export default async function HomePage() {
  let products: Product[] = [];
  try {
    products = await api.listProducts({ status: "available" });
  } catch {
    products = [];
  }
  const featured = products.slice(0, 4);

  return (
    <div>
      <section className="border-b border-brand-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <p className="uppercase tracking-[0.2em] text-brand-orange text-sm font-semibold mb-4">
              Moda circular, primera calidad
            </p>
            <h1 className="font-serif-display text-4xl sm:text-5xl leading-tight">
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
              <Link href="/nosotros" className="px-6 py-3 text-sm font-semibold uppercase tracking-wide border border-brand-black hover:bg-brand-black hover:text-white transition-colors">
                Nuestra historia
              </Link>
            </div>
          </div>
          <div className="aspect-square flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full bg-white/60 blur-2xl scale-75" aria-hidden="true" />
            <Logo layout="stacked" showTagline iconSize={140} className="relative z-10" />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="font-serif-display text-2xl mb-6">Categorias</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/tienda?category=${encodeURIComponent(c)}`}
              className="border border-brand-border bg-white text-center py-4 text-sm font-medium hover:border-brand-orange hover:text-brand-orange transition-colors"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif-display text-2xl">Recien llegado</h2>
          <Link href="/tienda" className="text-sm font-semibold text-brand-orange hover:underline">
            Ver todo →
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-brand-gray">
            Todavia no hay productos publicados. Vuelve pronto o entra al panel de administracion para anadir el primero.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <p className="uppercase tracking-[0.2em] text-brand-orange text-sm font-semibold mb-3">
            Silk &amp; Tag en cualquier parte
          </p>
          <h2 className="font-serif-display text-2xl">Vive Espana con estilo circular</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="aspect-[3/4] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/lifestyle/montana.jpg"
              alt="Silk & Tag en la montana"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="aspect-[3/4] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/lifestyle/calle.jpg"
              alt="Silk & Tag paseando por un pueblo espanol"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="aspect-[3/4] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/lifestyle/playa.jpg"
              alt="Silk & Tag en la playa"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
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
