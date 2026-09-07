"use client";

import { useEffect, useState } from "react";
import { api, mediaUrl } from "@/lib/api";

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
  suggested_title: string | null;
  suggested_description: string | null;
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

function PublishPanel({
  item,
  onPublished,
}: {
  item: ScannedItem;
  onPublished: () => void;
}) {
  const [title, setTitle] = useState(item.suggested_title || "");
  const [description, setDescription] = useState(item.suggested_description || "");
  const [price, setPrice] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ code: string } | null>(null);

  async function handlePublish() {
    setError("");
    const priceValue = parseFloat(price);
    if (!priceValue || priceValue <= 0) {
      setError("Indica un precio valido");
      return;
    }
    setPublishing(true);
    try {
      const product = await api.resellscanPublish(item.id, {
        price: priceValue,
        title: title || undefined,
        description: description || undefined,
      });
      setDone({ code: product.code });
      onPublished();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al publicar");
    } finally {
      setPublishing(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-green-700 font-semibold mt-4">
        Producto creado ({done.code}). Ya esta disponible en la tienda.
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-brand-border pt-4">
      <div className="text-xs uppercase text-brand-gray tracking-wide mb-2">
        Publicar como producto
      </div>
      <label className="text-sm text-brand-gray block mb-1">Titulo</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titulo del producto"
        className="w-full border border-brand-border px-3 py-2 mb-3 focus:outline-none focus:border-brand-orange"
      />
      <label className="text-sm text-brand-gray block mb-1">Descripcion</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Descripcion del producto"
        className="w-full border border-brand-border px-3 py-2 mb-3 focus:outline-none focus:border-brand-orange"
      />
      <label className="text-sm text-brand-gray block mb-1">Precio (€) *</label>
      <input
        type="number"
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="0.00"
        className="w-40 border border-brand-border px-3 py-2 mb-3 focus:outline-none focus:border-brand-orange"
      />
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <div>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="bg-brand-black text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          {publishing ? "Creando..." : "Crear producto"}
        </button>
      </div>
    </div>
  );
}

export default function ResellScanPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScannedItem | null>(null);
  const [history, setHistory] = useState<ScannedItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [publishingId, setPublishingId] = useState<number | null>(null);

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

  function handleAddFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const added = Array.from(list);
    setFiles((prev) => [...prev, ...added]);
    setPreviews((prev) => [...prev, ...added.map((f) => URL.createObjectURL(f))]);
  }

  function handleRemoveFile(index: number) {
    setPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function clearFiles() {
    setPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setFiles([]);
  }

  async function handleSubmit() {
    if (files.length === 0) {
      setError("Sube al menos una foto");
      return;
    }
    if (files.length > 8) {
      setError("Maximo 8 fotos por prenda");
      return;
    }
    setScanning(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("images", f));
      // No labels: the AI identifies the item from all photos together.
      const item = await api.resellscanScan(formData);
      setResult(item);
      clearFiles();
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
        Sube todas las fotos de una prenda a la vez (frontal, trasera, etiquetas, logo,
        defectos...). La IA identifica sola la marca, talla, color y estado a partir del
        conjunto de fotos. Cuantas mas fotos utiles subas, mas precisa sera la identificacion.
        Maximo 8 fotos.
      </p>

      <label className="border-2 border-dashed border-brand-border p-8 mb-4 cursor-pointer hover:border-brand-orange flex flex-col items-center justify-center text-center block">
        <span className="text-3xl text-brand-gray mb-2">+</span>
        <span className="text-sm font-semibold">Subir fotos de la prenda</span>
        <span className="text-xs text-brand-gray mt-1">
          Puedes seleccionar o hacer varias fotos a la vez
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleAddFiles(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </label>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {previews.map((url, i) => (
            <div key={i} className="relative group">
              <div className="w-full aspect-square bg-[#F1EFE9] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(i)}
                aria-label="Quitar foto"
                className="absolute top-1 right-1 bg-black/70 text-white w-6 h-6 flex items-center justify-center text-sm leading-none hover:bg-black"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={scanning || files.length === 0}
        className="bg-brand-black text-white px-6 py-3 font-semibold disabled:opacity-40 mb-10"
      >
        {scanning ? "Analizando..." : `Analizar (${files.length} foto${files.length === 1 ? "" : "s"})`}
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
          {!result.ai_error && result.status !== "published" && (
            <PublishPanel item={result} onPublished={loadHistory} />
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
              {item.status === "published" ? (
                <div className="text-xs font-semibold text-green-700 mb-2">Publicado como producto</div>
              ) : (
                !item.ai_error && (
                  <button
                    onClick={() => setPublishingId(publishingId === item.id ? null : item.id)}
                    className="text-brand-orange text-sm font-semibold hover:underline mb-2 block"
                  >
                    {publishingId === item.id ? "Cerrar" : "Publicar como producto"}
                  </button>
                )
              )}
              {publishingId === item.id && item.status !== "published" && (
                <PublishPanel
                  item={item}
                  onPublished={() => {
                    setPublishingId(null);
                    loadHistory();
                  }}
                />
              )}
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
