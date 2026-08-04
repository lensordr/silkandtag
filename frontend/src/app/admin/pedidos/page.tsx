"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Order } from "@/lib/types";

const STATUS_FLOW = ["pending_payment", "paid", "shipped", "delivered", "cancelled"];
const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [trackingDraft, setTrackingDraft] = useState<Record<number, string>>({});

  function load() {
    setLoading(true);
    api.adminListOrders().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(order: Order, status: string) {
    try {
      await api.adminUpdateOrder(order.id, { status });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al actualizar");
    }
  }

  async function saveTracking(order: Order) {
    try {
      await api.adminUpdateOrder(order.id, { tracking_number: trackingDraft[order.id] ?? order.tracking_number });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar seguimiento");
    }
  }

  return (
    <div>
      <h1 className="font-serif-display text-3xl mb-6">Pedidos</h1>

      {loading ? (
        <p className="text-brand-gray">Cargando...</p>
      ) : orders.length === 0 ? (
        <p className="text-brand-gray">Todavia no hay pedidos.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border border-brand-border bg-white">
              <button
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="font-semibold">#{o.id} · {o.customer_name}</p>
                  <p className="text-sm text-brand-gray">{new Date(o.created_at).toLocaleString("es-ES")} · {o.city}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold">{o.total.toFixed(2)} €</span>
                  <span className="px-2 py-1 text-xs uppercase font-semibold bg-[#F1EFE9]">
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
              </button>

              {expanded === o.id && (
                <div className="border-t border-brand-border p-4 grid gap-6 sm:grid-cols-2 text-sm">
                  <div>
                    <h3 className="font-semibold mb-2">Cliente</h3>
                    <p>{o.customer_name}</p>
                    <p>{o.email}</p>
                    <p>{o.phone}</p>
                    <p className="mt-2">{o.address_line}</p>
                    <p>{o.postal_code} {o.city}, {o.province}</p>
                    {o.notes && <p className="mt-2 text-brand-gray italic">"{o.notes}"</p>}
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Articulos</h3>
                    <ul className="space-y-1">
                      {o.items.map((it) => (
                        <li key={it.id} className="flex justify-between">
                          <span>{it.title}</span>
                          <span>{it.price.toFixed(2)} €</span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-brand-border mt-2 pt-2 flex justify-between text-brand-gray">
                      <span>Envio</span><span>{o.shipping_cost.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total</span><span>{o.total.toFixed(2)} €</span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex flex-wrap items-end gap-4 pt-2 border-t border-brand-border">
                    <div>
                      <label className="text-brand-gray block mb-1">Cambiar estado</label>
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o, e.target.value)}
                        className="border border-brand-border px-3 py-2"
                      >
                        {STATUS_FLOW.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-brand-gray block mb-1">Numero de seguimiento (transportista)</label>
                      <div className="flex gap-2">
                        <input
                          defaultValue={o.tracking_number}
                          onChange={(e) => setTrackingDraft((d) => ({ ...d, [o.id]: e.target.value }))}
                          placeholder="Pendiente de integrar transportista"
                          className="border border-brand-border px-3 py-2 w-64"
                        />
                        <button onClick={() => saveTracking(o)} className="btn-primary px-4 py-2 text-sm font-semibold">
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
