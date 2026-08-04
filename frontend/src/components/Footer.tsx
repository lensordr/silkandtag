import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="bg-brand-black text-white mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="mb-3 [&_svg_path]:fill-white [&_svg_rect]:fill-brand-orange">
            <Logo iconSize={40} />
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            Moda de segunda mano seleccionada a mano. Cada prenda tiene una
            historia; nosotros le damos una segunda vida en Espana.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3">Explorar</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li><Link href="/tienda" className="hover:text-brand-orange">Tienda</Link></li>
            <li><Link href="/nosotros" className="hover:text-brand-orange">Nosotros</Link></li>
            <li><Link href="/carrito" className="hover:text-brand-orange">Carrito</Link></li>
            <li><Link href="/politica-devoluciones" className="hover:text-brand-orange">Devoluciones y envios</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3">Contacto</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li>
              <a href="mailto:silkandtag@gmail.com" className="hover:text-brand-orange">
                silkandtag@gmail.com
              </a>
            </li>
            <li>Barcelona, España</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3">Envios y pagos</h4>
          <p className="text-sm text-white/60 leading-relaxed">
            Envios a toda España. Pago seguro proximamente con Square.
            Devoluciones en 14 dias.{" "}
            <Link href="/politica-devoluciones" className="text-brand-orange hover:underline">
              Ver politica →
            </Link>
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Silk &amp; Tag · Barcelona, España
      </div>
    </footer>
  );
}
