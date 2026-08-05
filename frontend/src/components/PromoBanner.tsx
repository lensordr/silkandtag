"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "st_promo_banner_dismissed";

export default function PromoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(DISMISS_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div className="relative bg-brand-orange text-white text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 pr-10 text-center leading-snug">
        📸 Etiquetanos en Instagram con la foto de tu prenda bien visible y
        consigue un <strong>10% de descuento</strong> en tu proximo pedido.
      </div>
      <button
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
