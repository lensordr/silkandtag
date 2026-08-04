"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAdminToken } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(username, password);
      setAdminToken(res.token);
      router.push("/admin/productos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm border border-brand-border bg-white p-8">
        <h1 className="font-serif-display text-2xl mb-1 text-center">
          SILK <span className="text-brand-orange">&amp;</span> TAG
        </h1>
        <p className="text-center text-sm text-brand-gray mb-6">Panel de administracion</p>

        <label className="text-sm text-brand-gray block mb-1">Usuario</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-brand-border px-3 py-2 mb-4 focus:outline-none focus:border-brand-orange"
          autoFocus
        />
        <label className="text-sm text-brand-gray block mb-1">Contrasena</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-brand-border px-3 py-2 mb-4 focus:outline-none focus:border-brand-orange"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-sm font-semibold uppercase tracking-wide disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
