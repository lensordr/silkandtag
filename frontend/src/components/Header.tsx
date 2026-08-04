"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useCart } from "@/lib/cart";
import { useState } from "react";

export default function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Inicio" },
    { href: "/tienda", label: "Tienda" },
    { href: "/nosotros", label: "Nosotros" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-brand-cream/95 backdrop-blur border-b border-brand-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo iconSize={40} />
        </Link>

        <nav className="hidden md:flex items-center gap-8 font-serif-display text-[15px] tracking-wide">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-brand-black hover:text-brand-orange transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/carrito"
            className="relative inline-flex items-center gap-2 border border-brand-black px-4 py-2 text-sm font-medium hover:bg-brand-black hover:text-white transition-colors"
          >
            Carrito
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-brand-orange text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          <button
            className="md:hidden text-2xl leading-none"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            {open ? "×" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-brand-border bg-brand-cream px-4 py-3 flex flex-col gap-3 font-serif-display">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-1">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
