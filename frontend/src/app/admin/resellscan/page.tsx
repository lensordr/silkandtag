"use client";

import { useEffect, useState } from "react";
import { api, mediaUrl } from "@/lib/api";

const SLOTS: { label: string; title: string; hint: string }[] = [
  { label: "front", title: "Frontal", hint: "Prenda completa, de frente" },
  { label: "back", title: "Trasera", hint: "Prenda completa, por detras" },
  { label: "logo", title: "Logo / marca", hint: "Logo o marca de cerca" },
  { label: "size_label", title: "Etiqueta de talla", hint: "Etiqueta con la talla legible" },
  { label: "care_label", title: "Etiqueta de composicion", hint: "Etiqueta de lavado/composicion" },
  { label: "sku_code", title: "Codigo / SKU", hint: "Codigo de referencia si lo hay" },
  { label: "hardware", title: "Herrajes", hint: "Cremalleras, botones, hebillas" },
  { label: "detail", title: "Detalle / defecto", hint: "Cualquier detalle o desperfecto" },
];

type ScannedItem = {
  id: number;
  image_urls: string[];
  photo_labels: string[];
  brand: string | null;
  brand_confidence: number | null;
  product_name: string | null;
  product_name_confidence: number | null;
  category: string | null;
  category_confidence: number | null;
  gender: string | null;
  colour: string | null;
  colour_confidence: number | null;
  size: string | null;
  size_confidence: number | null;
  sku: string | null;
  sku_confidence: number | null;
  style_code: string | null;
  material: string | null;
  estimated_retail_price: number | null;
  condition: string | null;
  condition_confidence: number | null;
  defects: string[];
  ai_provider: string;
  ai_error: string;
  status: string;
  created_at: string | null;
};

function Confidence({ value }: { value: number | null }) {
  if (value === null || value === undefined) return null;
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "text-green-700" : pct >= 40 ? "text-yellow-700" : "text-red-600";
  return <span className={`text-xs font-mono ${color}`}> {pct}%</span>;
}

function Field({ label, value, confidence }: { label: string; value: string | number | null; confidence?: number | null }) {
  return (
    <div className="py-2 border-b border-brand-border/60">
      <div className="text-xs uppercase text-brand-gray tracking-wide">{label}</div>
      <div className="font-medium">
        {value === null || value === undefined || value === "" ? (
          <span className="text-brand-gray italic">Sin datos</span>
        ) : (
          <>
            {value}
            {confidence !== undefined && <Confidence value={confidence} />}
          </>
        )}
      </div>
    </div>
  );
}

export default function ResellScanPage() {
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScannedItem | null>(null);
  const [history, setHistory] = useState<ScannedItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  function loadHistory() {
    setLoadingHistory(true);
    api
      .resellscanList()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function handleSlotChange(label: string, file: File | null) {
    setFiles((prev) => ({ ...prev, [label]: file }));
    setPreviews((prev) => {
      const next = { ...prev };
      if (file) next[label] = URL.createObjectURL(file);
      else delete next[label];
      return next;
    });
  }

  const filledSlots = SLOTS.filter((s) => files[s.label]);

  async function handleSubmit() {
    if (filledSlots.length === 0) {
      setError("Sube al menos una foto");
      return;
    }
    setScanning(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      filledSlots.forEach((s) => {
        formData.append("images", files[s.label] as File);
      });
      formData.append("labels", filledSlots.map((s) => s.label).join(","));
      const item = await api.resellscanScan(formData);
      setResult(item);
      setFiles({});
      setPreviews({});
      loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al analizar");
    } finally {
      setScanning(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminar este escaneo?")) return;
    await api.resellscanDelete(id);
    if (result?.id === id) setResult(null);
    loadHistory();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif-display text-2xl">ResellScan</h1>
      </div>

      <p className="text-sm text-brand-gray mb-6 max-w-2xl">
        Sube fotos de una prenda para identificarla con IA (marca, talla, estado...). Cuantas mas
        fotos de la lista aportes, mas precisa sera la identificacion. No es obligatorio rellenar
        todas las casillas.
      </p>

      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        {SLOTS.map((slot) => (
          <label
            key={slot.label}
            className="border border-brand-border p-3 cursor-pointer hover:border-brand-orange block"
          >
            <div className="text-sm font-semibold mb-1">{slot.title}</div>
            <div className="text-xs text-brand-gray mb-2">{slot.hint}</div>
            <div className="w-full aspect-square bg-[#F1EFE9] overflow-hidden flex items-center justify-center">
              {previews[slot.label] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[slot.label]} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl text-brand-gray">+</span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleSlotChange(slot.label, e.target.files?.[0] || null)}
            />
          </label>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={scanning || filledSlots.length === 0}
        className="bg-brand-black text-white px-6 py-3 font-semibold disabled:opacity-40 mb-10"
      >
        {scanning ? "Analizando..." : `Analizar (${filledSlots.length} foto${filledSlots.length === 1 ? "" : "s"})`}
      </button>

      {result && (
        <div className="border border-brand-border p-6 mb-10 max-w-2xl">
          <h2 className="font-serif-display text-lg mb-4">Resultado del escaneo</h2>
          {result.ai_error ? (
            <p className="text-red-600 text-sm">{result.ai_error}</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-x-6">
              <Field label="Marca" value={result.brand} confidence={result.brand_confidence} />
              <Field label="Producto" value={result.product_name} confidence={result.product_name_confidence} />
              <Field label="Categoria" value={result.category} confidence={result.category_confidence} />
              <Field label="Genero" value={result.gender} />
              <Field label="Color" value={result.colour} confidence={result.colour_confidence} />
              <Field label="Talla" value={result.size} confidence={result.size_confidence} />
              <Field label="SKU" value={result.sku} confidence={result.sku_confidence} />
              <Field label="Codigo de estilo" value={result.style_code} />
              <Field label="Material" value={result.material} />
              <Field
                label="Precio de venta original estimado"
                value={result.estimated_retail_price ? `${result.estimated_retail_price} €` : null}
              />
              <Field label="Estado" value={result.condition} confidence={result.condition_confidence} />
              <Field label="Defectos" value={result.defects.length ? result.defects.join(", ") : null} />
            </div>
          )}
        </div>
      )}

      <h2 className="font-serif-display text-lg mb-4">Historial</h2>
      {loadingHistory ? (
        <p className="text-brand-gray text-sm">Cargando...</p>
      ) : history.length === 0 ? (
        <p className="text-brand-gray text-sm">Todavia no has escaneado ninguna prenda.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((item) => (
            <div key={item.id} className="border border-brand-border p-4">
              <div className="w-full aspect-square bg-[#F1EFE9] overflow-hidden mb-3">
                {item.image_urls[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(item.image_urls[0])} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="font-semibold">{item.brand || "Marca desconocida"}</div>
              <div className="text-sm text-brand-gray mb-2">
                {item.product_name || item.category || "Sin identificar"}
              </div>
              {item.ai_error && <div className="text-xs text-red-600 mb-2">{item.ai_error}</div>}
              <button onClick={() => handleDelete(item.id)} className="text-red-600 text-sm font-semibold hover:underline">
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
