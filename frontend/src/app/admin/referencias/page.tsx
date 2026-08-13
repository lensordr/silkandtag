"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type ReferenceEntry = {
  id: number;
  brand: string;
  product_name: string | null;
  category: string | null;
  condition: string | null;
  vinted_price: number | null;
  website_price: number | null;
  quick_sale_price: number | null;
  authenticity_notes: string;
  source_url: string | null;
};

const EMPTY_FORM = {
  brand: "",
  product_name: "",
  category: "",
  condition: "",
  vinted_price: "",
  website_price: "",
  quick_sale_price: "",
  authenticity_notes: "",
  source_url: "",
};

function toPayload(form: typeof EMPTY_FORM) {
  return {
    brand: form.brand,
    product_name: form.product_name || null,
    category: form.category || null,
    condition: form.condition || null,
    vinted_price: form.vinted_price ? parseFloat(form.vinted_price) : null,
    website_price: form.website_price ? parseFloat(form.website_price) : null,
    quick_sale_price: form.quick_sale_price ? parseFloat(form.quick_sale_price) : null,
    authenticity_notes: form.authenticity_notes,
    source_url: form.source_url || null,
  };
}

export default function ReferenciasPage() {
  const [entries, setEntries] = useState<ReferenceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ReferenceEntry | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api.referenceList().then(setEntries).catch(() => setEntries([])).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(e: ReferenceEntry) {
    setEditing(e);
    setForm({
      brand: e.brand,
      product_name: e.product_name || "",
      category: e.category || "",
      condition: e.condition || "",
      vinted_price: e.vinted_price?.toString() || "",
      website_price: e.website_price?.toString() || "",
      quick_sale_price: e.quick_sale_price?.toString() || "",
      authenticity_notes: e.authenticity_notes || "",
      source_url: e.source_url || "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.brand.trim()) {
      setError("La marca es obligatoria");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.referenceUpdate(editing.id, toPayload(form));
      } else {
        await api.referenceCreate(toPayload(form));
      }
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: ReferenceEntry) {
    if (!confirm(`Eliminar la referencia de ${e.brand}?`)) return;
    await api.referenceDelete(e.id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif-display text-2xl">Referencias</h1>
        <button onClick={openCreate} className="bg-brand-black text-white px-4 py-2 text-sm font-semibold">
          + Nueva referencia
        </button>
      </div>

      <p className="text-sm text-brand-gray mb-6 max-w-2xl">
        Base de datos de comparables (precios en Vinted, en tu web, y de venta rapida) y notas de
        autenticidad por marca/categoria, para consultar cuando escaneas una prenda. Se rellena a
        mano con tu propia investigacion.
      </p>

      {loading ? (
        <p className="text-brand-gray text-sm">Cargando...</p>
      ) : entries.length === 0 ? (
        <p className="text-brand-gray text-sm">Todavia no hay ninguna referencia guardada.</p>
      ) : (
        <div className="overflow-x-auto border border-brand-border">
          <table className="w-full text-sm">
            <thead className="bg-[#F1EFE9] text-left">
              <tr>
                <th className="p-3">Marca</th>
                <th className="p-3">Producto</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Vinted</th>
                <th className="p-3">Web</th>
                <th className="p-3">Venta rapida</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="p-3 font-semibold">{e.brand}</td>
                  <td className="p-3">{e.product_name || "-"}</td>
                  <td className="p-3">{e.category || "-"}</td>
                  <td className="p-3">{e.condition || "-"}</td>
                  <td className="p-3">{e.vinted_price ? `${e.vinted_price.toFixed(2)} €` : "-"}</td>
                  <td className="p-3">{e.website_price ? `${e.website_price.toFixed(2)} €` : "-"}</td>
                  <td className="p-3">{e.quick_sale_price ? `${e.quick_sale_price.toFixed(2)} €` : "-"}</td>
                  <td className="p-3 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(e)} className="text-brand-orange font-semibold hover:underline">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(e)} className="text-red-600 font-semibold hover:underline">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-brand-border w-full max-w-2xl p-6 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif-display text-xl">{editing ? "Editar referencia" : "Nueva referencia"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-2xl leading-none">
                ×
              </button>
            </div>

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-brand-gray block mb-1">Marca *</label>
                <input
                  required
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-sm text-brand-gray block mb-1">Producto / modelo</label>
                <input
                  value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                  className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-sm text-brand-gray block mb-1">Categoria</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-sm text-brand-gray block mb-1">Estado</label>
                <input
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  placeholder="ej. Bueno, Como nuevo..."
                  className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-sm text-brand-gray block mb-1">Precio en Vinted (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.vinted_price}
                  onChange={(e) => setForm({ ...form, vinted_price: e.target.value })}
                  className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-sm text-brand-gray block mb-1">Precio en tu web (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.website_price}
                  onChange={(e) => setForm({ ...form, website_price: e.target.value })}
                  className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-sm text-brand-gray block mb-1">Precio de venta rapida (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.quick_sale_price}
                  onChange={(e) => setForm({ ...form, quick_sale_price: e.target.value })}
                  className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-sm text-brand-gray block mb-1">URL de origen (ej. anuncio de Vinted)</label>
                <input
                  value={form.source_url}
                  onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                  className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-brand-gray block mb-1">Notas de autenticidad</label>
                <textarea
                  value={form.authenticity_notes}
                  onChange={(e) => setForm({ ...form, authenticity_notes: e.target.value })}
                  rows={3}
                  placeholder="ej. el swoosh va cosido, no impreso; la etiqueta de talla lleva el codigo RN#..."
                  className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="bg-brand-black text-white px-6 py-2 text-sm font-semibold disabled:opacity-40">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
