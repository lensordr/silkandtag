"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type CategoryRow = { category: string; available: number; reserved: number; sold: number; total: number };
type Analytics = {
  total_products: number;
  products_by_status: { available: number; reserved: number; sold: number };
  products_by_category: CategoryRow[];
  orders_by_status: Record<string, number>;
  revenue: { total: number; orders_count: number };
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  expired: "Expirado",
  cancelled: "Cancelado",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminAnalytics().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-brand-gray">Cargando...</p>;
  if (!data) return <p className="text-brand-gray">No se pudieron cargar las estadisticas.</p>;

  const maxCategoryTotal = Math.max(1, ...data.products_by_category.map((c) => c.total));

  return (
    <div>
      <h1 className="font-serif-display text-2xl mb-8">Analiticas</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="border border-brand-border bg-white p-4">
          <p className="text-xs uppercase text-brand-gray mb-1">Productos totales</p>
          <p className="text-2xl font-semibold">{data.total_products}</p>
        </div>
        <div className="border border-brand-border bg-white p-4">
          <p className="text-xs uppercase text-brand-gray mb-1">Disponibles</p>
          <p className="text-2xl font-semibold">{data.products_by_status.available}</p>
        </div>
        <div className="border border-brand-border bg-white p-4">
          <p className="text-xs uppercase text-brand-gray mb-1">Vendidos</p>
          <p className="text-2xl font-semibold">{data.products_by_status.sold}</p>
        </div>
        <div className="border border-brand-border bg-white p-4">
          <p className="text-xs uppercase text-brand-gray mb-1">Ingresos (pagados)</p>
          <p className="text-2xl font-semibold">{data.revenue.total.toFixed(2)} €</p>
          <p className="text-xs text-brand-gray">{data.revenue.orders_count} pedidos</p>
        </div>
      </div>

      <h2 className="font-serif-display text-xl mb-4">Productos por categoria</h2>
      <div className="space-y-3 mb-10">
        {data.products_by_category.length === 0 && (
          <p className="text-brand-gray text-sm">Todavia no hay productos.</p>
        )}
        {data.products_by_category.map((c) => (
          <div key={c.category}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{c.category}</span>
              <span className="text-brand-gray">
                {c.total} total &middot; {c.available} disponibles &middot; {c.reserved} reservados &middot; {c.sold} vendidos
              </span>
            </div>
            <div className="h-2 bg-[#F1EFE9] w-full">
              <div
                className="h-2 bg-brand-orange"
                style={{ width: `${(c.total / maxCategoryTotal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-serif-display text-xl mb-4">Pedidos por estado</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Object.entries(data.orders_by_status).length === 0 && (
          <p className="text-brand-gray text-sm">Todavia no hay pedidos.</p>
        )}
        {Object.entries(data.orders_by_status).map(([status, count]) => (
          <div key={status} className="border border-brand-border bg-white p-4">
            <p className="text-xs uppercase text-brand-gray mb-1">{ORDER_STATUS_LABELS[status] || status}</p>
            <p className="text-2xl font-semibold">{count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
