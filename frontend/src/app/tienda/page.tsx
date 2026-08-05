import { Suspense } from "react";
import type { Metadata } from "next";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Tienda",
  description:
    "Explora piezas unicas de moda circular en Silk & Tag: chaquetas, vestidos, camisas, pantalones, zapatos y bolsos seleccionados a mano, disponibles mientras duren.",
  alternates: { canonical: "/tienda" },
};

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">Cargando...</div>}>
      <ShopClient />
    </Suspense>
  );
}
