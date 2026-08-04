import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <p className="uppercase tracking-[0.2em] text-brand-orange text-sm font-semibold mb-4">Nuestra historia</p>
      <h1 className="font-serif-display text-4xl mb-6">Moda con etiqueta, sin desperdicio</h1>
      <div className="space-y-5 text-brand-gray leading-relaxed text-lg">
        <p>
          Silk &amp; Tag nace en Barcelona con una idea sencilla: la mejor
          prenda es la que ya existe. Buscamos ropa de calidad en buen
          estado, la revisamos con cuidado y la ponemos de nuevo en
          circulacion, con su historia intacta y su etiqueta al dia.
        </p>
        <p>
          Cada pieza que ves en la tienda pasa por un proceso de seleccion:
          comprobamos el estado, la autenticidad de la marca y fotografiamos
          cada detalle para que sepas exactamente lo que vas a recibir.
        </p>
        <p>
          Creemos en una moda circular real: menos produccion nueva, mas
          prendas queridas durante mas tiempo. Comprar en Silk &amp; Tag es
          vestir mejor y elegir de forma mas consciente.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mt-12">
        {[
          ["Seleccion cuidada", "Revisamos cada prenda a mano antes de publicarla."],
          ["Envio a toda Espana", "Recibe tu pedido en pocos dias, sea donde sea."],
          ["Pago seguro", "Muy pronto, pagos con Square directamente en la web."],
        ].map(([title, text]) => (
          <div key={title} className="border border-brand-border bg-white p-5">
            <h3 className="font-serif-display text-lg mb-2">{title}</h3>
            <p className="text-sm text-brand-gray">{text}</p>
          </div>
        ))}
      </div>

      <div className="border border-brand-border bg-white p-6 mt-12">
        <h2 className="font-serif-display text-xl mb-2">Contacto</h2>
        <p className="text-sm text-brand-gray leading-relaxed">
          <a href="mailto:silkandtag@gmail.com" className="text-brand-orange font-semibold hover:underline">
            silkandtag@gmail.com
          </a>
          <br />
          Barcelona, España
        </p>
      </div>

      <div className="mt-12 text-center">
        <Link href="/tienda" className="btn-primary inline-block px-6 py-3 text-sm font-semibold uppercase tracking-wide">
          Explorar la tienda
        </Link>
      </div>
    </div>
  );
}
