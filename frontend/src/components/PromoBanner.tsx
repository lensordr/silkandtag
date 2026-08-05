"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "st_promo_banner_dismissed";
const INSTAGRAM_HANDLE = "silkandtag";
const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;

function Message() {
  return (
    <span className="inline-flex items-center px-8 shrink-0">
      📸 Etiquetanos en Instagram{" "}
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-1 font-semibold underline hover:text-white/90"
      >
        @{INSTAGRAM_HANDLE}
      </a>{" "}
      con la foto de tu prenda bien visible y consigue un{" "}
      <strong>10% de descuento</strong> en tu proximo pedido.
    </span>
  );
}

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
    <div className="relative bg-brand-orange text-white text-sm overflow-hidden">
      <div className="marquee-track flex whitespace-nowrap py-2.5 pr-10">
        <Message />
        <Message />
      </div>
      <button
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-lg leading-none bg-brand-orange pl-2"
      >
        ×
      </button>
    </div>
  );
}
