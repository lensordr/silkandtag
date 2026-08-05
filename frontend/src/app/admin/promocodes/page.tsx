"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PromoCode } from "@/lib/types";

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    instagram_username: "",
    discount_percent: "10",
    max_uses: "1",
  });

  function load() {
    setLoading(true);
    api
      .adminListPromoCodes()
      .then(setCodes)
      .catch(() => setCodes([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.adminCreatePromoCode({
        code: form.code.trim() || undefined,
        instagram_username: form.instagram_username.trim(),
        discount_percent: parseFloat(form.discount_percent) || 10,
        max_uses: parseInt(form.max_uses, 10) || 1,
      });
      setForm({ code: "", instagram_username: "", discount_percent: "10", max_uses: "1" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el codigo");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: PromoCode) {
    await api.adminUpdatePromoCode(c.id, { active: !c.active });
    load();
  }

  async function remove(c: PromoCode) {
    if (!confirm(`Eliminar el codigo ${c.code}?`)) return;
    await api.adminDeletePromoCode(c.id);
    load();
  }

  return (
    <div>
      <h1 className="font-serif-display text-2xl mb-2">Codigos de descuento</h1>
      <p className="text-brand-gray text-sm mb-8">
        Crea un codigo cuando un cliente te etiquete en Instagram tras recibir su pedido.
        Si dejas el campo &quot;Codigo&quot; en blanco, se genera automaticamente a partir
        de su usuario de Instagram.
      </p>

      <form onSubmit={handleCreate} className="border border-brand-border bg-white p-5 mb-10 grid gap-4 sm:grid-cols-4 items-end">
        <div>
          <label className="text-sm text-brand-gray block mb-1">Usuario de Instagram</label>
          <input
            type="text"
            value={form.instagram_username}
            onChange={(e) => setForm((f) => ({ ...f, instagram_username: e.target.value }))}
            placeholder="maria.style"
            className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
          />
        </div>
        <div>
          <label className="text-sm text-brand-gray block mb-1">Codigo (opcional)</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="Autogenerado si se deja vacio"
            className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange uppercase"
          />
        </div>
        <div>
          <label className="text-sm text-brand-gray block mb-1">Descuento (%)</label>
          <input
            type="number"
            value={form.discount_percent}
            onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))}
            className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
          />
        </div>
        <div>
          <label className="text-sm text-brand-gray block mb-1">Usos maximos</label>
          <input
            type="number"
            value={form.max_uses}
            onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
            className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
          />
        </div>
        <div className="sm:col-span-4">
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-6 py-2 text-sm font-semibold uppercase tracking-wide disabled:opacity-50"
          >
            {saving ? "Creando..." : "Crear codigo"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-brand-gray">Cargando...</p>
      ) : codes.length === 0 ? (
        <p className="text-brand-gray">Todavia no has creado ningun codigo.</p>
      ) : (
        <div className="border border-brand-border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-left text-brand-gray">
                <th className="p-3">Codigo</th>
                <th className="p-3">Instagram</th>
                <th className="p-3">Descuento</th>
                <th className="p-3">Usos</th>
                <th className="p-3">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-brand-border last:border-0">
                  <td className="p-3 font-mono font-semibold">{c.code}</td>
                  <td className="p-3">{c.instagram_username ? `@${c.instagram_username}` : "-"}</td>
                  <td className="p-3">{c.discount_percent}%</td>
                  <td className="p-3">{c.used_count} / {c.max_uses}</td>
                  <td className="p-3">
                    <span className={c.active ? "text-green-600" : "text-brand-gray"}>
                      {c.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => toggleActive(c)} className="text-brand-orange hover:underline">
                      {c.active ? "Desactivar" : "Activar"}
                    </button>
                    <button onClick={() => remove(c)} className="text-red-600 hover:underline">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
