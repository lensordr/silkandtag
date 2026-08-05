"use client";

import { useEffect, useState } from "react";
import { api, mediaUrl } from "@/lib/api";
import { Product, productImages } from "@/lib/types";

const CATEGORIES = ["Chaquetas", "Vestidos", "Camisas", "Pantalones", "Zapatos", "Bolsos", "Accesorios"];
const CONDITIONS = ["Como nuevo", "Muy bueno", "Bueno", "Aceptable"];
const STATUSES = [
  { value: "available", label: "Disponible" },
  { value: "reserved", label: "Reservado" },
  { value: "sold", label: "Vendido" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  brand: "",
  category: CATEGORIES[0],
  size: "",
  condition: CONDITIONS[1],
  color: "",
  price: "",
  original_price: "",
  status: "available",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api.adminListProducts().then(setProducts).catch(() => setProducts([])).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFiles(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description || "",
      brand: p.brand || "",
      category: p.category || CATEGORIES[0],
      size: p.size || "",
      condition: p.condition || CONDITIONS[1],
      color: p.color || "",
      price: String(p.price),
      original_price: p.original_price ? String(p.original_price) : "",
      status: p.status,
    });
    setFiles(null);
    setError("");
    setShowForm(true);
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Eliminar "${p.title}"? Esta accion no se puede deshacer.`)) return;
    try {
      await api.adminDeleteProduct(p.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("brand", form.brand);
      fd.append("category", form.category);
      fd.append("size", form.size);
      fd.append("condition", form.condition);
      fd.append("color", form.color);
      fd.append("price", form.price);
      if (form.original_price) fd.append("original_price", form.original_price);
      fd.append("status", form.status);
      if (files) {
        Array.from(files).forEach((f) => fd.append("images", f));
      }

      if (editing) {
        await api.adminUpdateProduct(editing.id, fd);
      } else {
        await api.adminCreateProduct(fd);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif-display text-3xl">Productos</h1>
        <button onClick={openCreate} className="btn-primary px-5 py-2.5 text-sm font-semibold uppercase tracking-wide">
          + Anadir producto
        </button>
      </div>

      {loading ? (
        <p className="text-brand-gray">Cargando...</p>
      ) : products.length === 0 ? (
        <p className="text-brand-gray">Todavia no hay productos. Anade el primero.</p>
      ) : (
        <div className="overflow-x-auto border border-brand-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#F1EFE9] text-left">
              <tr>
                <th className="p-3">Foto</th>
                <th className="p-3">Codigo</th>
                <th className="p-3">Titulo</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Talla</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {products.map((p) => {
                const img = productImages(p)[0];
                return (
                  <tr key={p.id}>
                    <td className="p-3">
                      <div className="w-12 h-14 bg-[#F1EFE9] overflow-hidden">
                        {img && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-semibold text-brand-orange">{p.code}</td>
                    <td className="p-3 font-medium">{p.title}</td>
                    <td className="p-3">{p.category}</td>
                    <td className="p-3">{p.size}</td>
                    <td className="p-3">{p.price.toFixed(2)} €</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 text-xs uppercase font-semibold ${
                          p.status === "available"
                            ? "bg-green-100 text-green-700"
                            : p.status === "reserved"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {STATUSES.find((s) => s.value === p.status)?.label || p.status}
                      </span>
                    </td>
                    <td className="p-3 space-x-3 whitespace-nowrap">
                      <button onClick={() => openEdit(p)} className="text-brand-orange font-semibold hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(p)} className="text-red-600 font-semibold hover:underline">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
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
              <h2 className="font-serif-display text-xl">
                {editing ? "Editar producto" : "Nuevo producto"}
                {editing && (
                  <span className="ml-3 font-mono text-sm font-semibold text-brand-orange align-middle">{editing.code}</span>
                )}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-2xl leading-none">×</button>
            </div>
            {!editing && (
              <p className="text-sm text-brand-gray mb-4">
                El codigo interno (ej. ST-0007) se genera automaticamente al guardar.
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm text-brand-gray block mb-1">Titulo *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm text-brand-gray block mb-1">Descripcion</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange" />
              </div>

              <div>
                <label className="text-sm text-brand-gray block mb-1">Marca</label>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange" />
              </div>

              <div>
                <label className="text-sm text-brand-gray block mb-1">Categoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-brand-gray block mb-1">Talla</label>
                <input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange" />
              </div>

              <div>
                <label className="text-sm text-brand-gray block mb-1">Color</label>
                <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange" />
              </div>

              <div>
                <label className="text-sm text-brand-gray block mb-1">Estado de la prenda</label>
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange">
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-brand-gray block mb-1">Disponibilidad</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange">
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-brand-gray block mb-1">Precio (€) *</label>
                <input required type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange" />
              </div>

              <div>
                <label className="text-sm text-brand-gray block mb-1">Precio original (€)</label>
                <input type="number" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm text-brand-gray block mb-1">
                  Fotos {editing ? "(se anadiran a las existentes)" : ""}
                </label>
                <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} className="w-full text-sm" />
                {editing && productImages(editing).length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {productImages(editing).map((img) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={img} src={mediaUrl(img)} alt="" className="w-14 h-14 object-cover border border-brand-border" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm font-semibold border border-brand-border">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 text-sm font-semibold uppercase tracking-wide disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
