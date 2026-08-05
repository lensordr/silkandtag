"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Order } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default function OrderConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    const token = searchParams.get("t") || "";
    api.getOrder(params.id as string, token).then(setOrder).catch(() => setOrder(null)).finally(() => setLoading(false));
  }, [params.id, searchParams]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">Cargando...</div>;

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-brand-gray mb-4">No encontramos ese pedido.</p>
        <Link href="/tienda" className="text-brand-orange font-semibold">Volver a la tienda →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-10">
        <p className="text-brand-orange font-serif-display text-5xl mb-3">✓</p>
        <h1 className="font-serif-display text-3xl mb-2">Gracias, {order.customer_name.split(" ")[0]}</h1>
        <p className="text-brand-gray">Tu pedido #{order.id} se ha registrado correctamente.</p>
      </div>

      <div className="border border-brand-border bg-white p-6 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-brand-gray">Estado</span>
          <span className="font-semibold">{STATUS_LABELS[order.status] || order.status}</span>
        </div>
        <div className="divide-y divide-brand-border">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between py-2 text-sm">
              <span>{i.title}</span>
              <span>{i.price.toFixed(2)} €</span>
            </div>
          ))}
        </div>
        <div className="border-t border-brand-border pt-3 flex justify-between text-sm text-brand-gray">
          <span>Envio</span><span>{order.shipping_cost.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span><span>{order.total.toFixed(2)} €</span>
        </div>
      </div>

      <div className="border border-brand-border bg-[#FFF7F0] p-4 mt-6 text-sm text-brand-gray">
        Te contactaremos en <strong>{order.email}</strong> para coordinar el
        envio a {order.city}.
      </div>

      <div className="mt-8 text-center">
        <Link href="/tienda" className="btn-primary inline-block px-6 py-3 text-sm font-semibold uppercase tracking-wide">
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
