import Link from "next/link";

export default function ReturnsPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <p className="uppercase tracking-[0.2em] text-brand-orange text-sm font-semibold mb-4">
        Informacion legal
      </p>
      <h1 className="font-serif-display text-4xl mb-8">Politica de Devoluciones y Envios</h1>

      <p className="text-brand-gray leading-relaxed text-lg mb-8">
        En Silk &amp; Tag queremos que tu experiencia de compra sea impecable.
        Si necesitas devolver un producto, dispones de un plazo de{" "}
        <strong className="text-brand-black">14 dias naturales</strong> desde
        la recepcion de tu pedido para ejercer tu derecho de desistimiento.
      </p>

      <section className="mb-10">
        <h2 className="font-serif-display text-2xl mb-4">Condiciones para la devolucion</h2>
        <ul className="space-y-4 text-brand-gray leading-relaxed">
          <li>
            <strong className="text-brand-black">Estado de la prenda:</strong>{" "}
            el producto debe encontrarse en las mismas condiciones en las que
            fue enviado: sin usar, sin lavar, sin olores y con su empaquetado
            original.
          </li>
          <li>
            <strong className="text-brand-black">Etiqueta original:</strong>{" "}
            la etiqueta de autenticidad (Orange Tag) debe permanecer intacta y
            fijada al producto. No se aceptaran devoluciones de prendas a las
            que se les haya retirado la etiqueta.
          </li>
          <li>
            <strong className="text-brand-black">Gastos de envio:</strong>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                Salvo que la devolucion se deba a un error por nuestra parte
                (envio de prenda incorrecta o tara no especificada en la
                descripcion), los gastos de envio del paquete de vuelta
                corren a cargo del comprador.
              </li>
              <li>
                El cliente puede optar por enviar el paquete por su cuenta o
                solicitar nuestra etiqueta de recogida, cuyo coste{" "}
                <strong className="text-brand-black">(4,90 €)</strong> se
                descontara del importe final a reembolsar.
              </li>
            </ul>
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-serif-display text-2xl mb-4">¿Como tramitar tu devolucion?</h2>
        <ol className="space-y-4 text-brand-gray leading-relaxed list-decimal pl-6">
          <li>
            Escribenos un correo a{" "}
            <a href="mailto:silkandtag@gmail.com" className="text-brand-orange font-semibold hover:underline">
              silkandtag@gmail.com
            </a>{" "}
            indicando tu numero de pedido y la prenda que deseas devolver.
          </li>
          <li>
            Prepara el paquete asegurandote de incluir el producto bien
            protegido con su embalaje original.
          </li>
          <li>
            Una vez recibido el paquete en nuestro almacen y verificado el
            estado de la prenda, procesaremos el reembolso del importe del
            producto en un plazo de 3 a 5 dias habiles mediante el mismo
            metodo de pago utilizado en la compra.
          </li>
        </ol>
      </section>

      <div className="border border-brand-border bg-white p-6">
        <h2 className="font-serif-display text-xl mb-3">¿Tienes dudas?</h2>
        <p className="text-brand-gray text-sm leading-relaxed">
          Escribenos a{" "}
          <a href="mailto:silkandtag@gmail.com" className="text-brand-orange font-semibold hover:underline">
            silkandtag@gmail.com
          </a>{" "}
          y te responderemos lo antes posible. Silk &amp; Tag · Barcelona, Espana.
        </p>
      </div>

      <div className="mt-10 text-center">
        <Link href="/tienda" className="btn-primary inline-block px-6 py-3 text-sm font-semibold uppercase tracking-wide">
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
