"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { useCart } from "@/lib/cart";
import { api } from "@/lib/api";

const SHIPPING_FLAT_RATE = 4.95;

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "";
const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";
const SQUARE_ENV = process.env.NEXT_PUBLIC_SQUARE_ENV || "sandbox";
const SQUARE_SDK_SRC =
  SQUARE_ENV === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";

type OrderOut = {
  id: number;
  total: number;
};

declare global {
  interface Window {
    Square?: {
      payments: (
        appId: string,
        locationId: string
      ) => {
        card: () => Promise<{
          attach: (selector: string) => Promise<void>;
          tokenize: () => Promise<{
            status: string;
            token?: string;
            errors?: { message: string }[];
          }>;
        }>;
      };
    };
  }
}

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const router = useRouter();
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [order, setOrder] = useState<OrderOut | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    email: "",
    phone: "",
    address_line: "",
    city: "",
    postal_code: "",
    province: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [squareLoaded, setSquareLoaded] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const cardRef = useRef<{ tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }> } | null>(null);
  const attachedOrderId = useRef<number | null>(null);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleShippingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const createdOrder = await api.createOrder({
        ...form,
        items: items.map((p) => ({ product_id: p.id })),
      });
      clear();
      setOrder(createdOrder);
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el pedido");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (step !== "payment" || !squareLoaded || !order) return;
    if (attachedOrderId.current === order.id) return;
    if (!window.Square || !SQUARE_APP_ID || !SQUARE_LOCATION_ID) {
      setError("El pago con tarjeta no esta disponible en este momento.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const payments = window.Square!.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
        const card = await payments.card();
        await card.attach("#card-container");
        if (cancelled) return;
        cardRef.current = card;
        attachedOrderId.current = order.id;
        setCardReady(true);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el formulario de pago.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, squareLoaded, order]);

  async function handlePaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !cardRef.current) return;
    setError("");
    setPaying(true);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        const msg = result.errors?.[0]?.message || "No se pudo procesar la tarjeta.";
        throw new Error(msg);
      }
      await api.payOrder(order.id, result.token);
      router.push(`/pedido/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "El pago no se pudo completar. Intentalo de nuevo.");
    } finally {
      setPaying(false);
    }
  }

  if (step === "shipping" && items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-brand-gray mb-6">No tienes articulos en el carrito.</p>
        <Link href="/tienda" className="btn-primary inline-block px-6 py-3 text-sm font-semibold uppercase tracking-wide">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  return (
    <>
      <Script
        src={SQUARE_SDK_SRC}
        strategy="afterInteractive"
        onLoad={() => setSquareLoaded(true)}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          {step === "shipping" ? (
            <>
              <h1 className="font-serif-display text-3xl mb-6">Datos de envio</h1>
              <form onSubmit={handleShippingSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Nombre completo" value={form.customer_name} onChange={(v) => update("customer_name", v)} required />
                  <Field label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} required />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Telefono" value={form.phone} onChange={(v) => update("phone", v)} />
                  <Field label="Provincia" value={form.province} onChange={(v) => update("province", v)} />
                </div>
                <Field label="Direccion" value={form.address_line} onChange={(v) => update("address_line", v)} required />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Ciudad" value={form.city} onChange={(v) => update("city", v)} required />
                  <Field label="Codigo postal" value={form.postal_code} onChange={(v) => update("postal_code", v)} required />
                </div>
                <div>
                  <label className="text-sm text-brand-gray block mb-1">Notas (opcional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
                    rows={3}
                  />
                </div>

                <div className="border border-brand-border bg-white p-4 text-sm text-brand-gray">
                  El siguiente paso te pedira los datos de tu tarjeta para
                  completar el pago de forma segura. Dudas antes de comprar:
                  escribenos a{" "}
                  <a href="mailto:silkandtag@gmail.com" className="text-brand-orange font-semibold hover:underline">
                    silkandtag@gmail.com
                  </a>
                  . Consulta tambien nuestra{" "}
                  <Link href="/politica-devoluciones" className="text-brand-orange font-semibold hover:underline">
                    politica de devoluciones
                  </Link>
                  .
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full py-3 text-sm font-semibold uppercase tracking-wide disabled:opacity-50"
                >
                  {submitting ? "Enviando..." : "Continuar al pago"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-serif-display text-3xl mb-6">Pago con tarjeta</h1>
              <p className="text-sm text-brand-gray mb-4">
                Pedido #{order?.id} creado. Introduce los datos de tu tarjeta
                para completar la compra de forma segura a traves de Square.
              </p>
              <form onSubmit={handlePaySubmit} className="space-y-4">
                <div id="card-container" className="border border-brand-border bg-white p-4 min-h-[90px]" />

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={!cardReady || paying}
                  className="btn-primary w-full py-3 text-sm font-semibold uppercase tracking-wide disabled:opacity-50"
                >
                  {paying ? "Procesando pago..." : !cardReady ? "Cargando formulario..." : `Pagar ${order ? order.total.toFixed(2) : ""} €`}
                </button>
              </form>
            </>
          )}
        </div>

        <div>
          <h2 className="font-serif-display text-xl mb-4">Resumen</h2>
          <div className="border border-brand-border bg-white p-4 space-y-3">
            {step === "shipping" ? (
              <>
                {items.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span>{p.title}</span>
                    <span>{p.price.toFixed(2)} €</span>
                  </div>
                ))}
                <div className="border-t border-brand-border pt-3 flex justify-between text-sm text-brand-gray">
                  <span>Envio</span><span>{SHIPPING_FLAT_RATE.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span><span>{(total + SHIPPING_FLAT_RATE).toFixed(2)} €</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between font-semibold text-lg">
                <span>Total a pagar</span><span>{order ? order.total.toFixed(2) : "0.00"} €</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm text-brand-gray block mb-1">
        {label}
        {required && <span className="text-brand-orange"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-brand-border px-3 py-2 focus:outline-none focus:border-brand-orange"
      />
    </div>
  );
}
