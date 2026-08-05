import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingBackground from "@/components/FloatingBackground";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const SITE_URL = "https://www.silkandtag.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Silk & Tag · Moda circular seleccionada en España",
    template: "%s · Silk & Tag",
  },
  description:
    "Silk & Tag es una tienda online de moda circular en España: prendas de calidad revisadas y fotografiadas a mano, piezas unicas con envio a toda la peninsula.",
  keywords: [
    "moda circular",
    "ropa vintage España",
    "moda sostenible",
    "prendas seleccionadas",
    "tienda online ropa Barcelona",
    "Silk & Tag",
  ],
  authors: [{ name: "Silk & Tag" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Silk & Tag",
    url: SITE_URL,
    title: "Silk & Tag · Moda circular seleccionada en España",
    description:
      "Prendas de calidad revisadas a mano, piezas unicas con envio a toda la peninsula.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Silk & Tag · Moda circular seleccionada en España",
    description: "Prendas de calidad revisadas a mano, piezas unicas con envio a toda la peninsula.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-brand-black">
        <FloatingBackground />
        <CartProvider>
          <div className="relative z-10 flex flex-col min-h-full flex-1">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
