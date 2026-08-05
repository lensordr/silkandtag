"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { isAdminLoggedIn, clearAdminToken } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoginPage && !isAdminLoggedIn()) {
      router.replace("/admin/login");
    } else {
      setChecked(true);
    }
  }, [isLoginPage, router]);

  // Make the admin section (only) installable as a PWA on phones. Injected
  // via JS rather than metadata export because this layout is a client
  // component, and scoped to /admin so the public storefront is unaffected.
  useEffect(() => {
    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    manifestLink.href = "/admin-manifest.json";
    document.head.appendChild(manifestLink);

    const themeColor = document.createElement("meta");
    themeColor.name = "theme-color";
    themeColor.content = "#111111";
    document.head.appendChild(themeColor);

    const appleCapable = document.createElement("meta");
    appleCapable.name = "apple-mobile-web-app-capable";
    appleCapable.content = "yes";
    document.head.appendChild(appleCapable);

    const appleStatusBar = document.createElement("meta");
    appleStatusBar.name = "apple-mobile-web-app-status-bar-style";
    appleStatusBar.content = "black-translucent";
    document.head.appendChild(appleStatusBar);

    const appleTitle = document.createElement("meta");
    appleTitle.name = "apple-mobile-web-app-title";
    appleTitle.content = "S&T Admin";
    document.head.appendChild(appleTitle);

    const appleIcon = document.createElement("link");
    appleIcon.rel = "apple-touch-icon";
    appleIcon.href = "/icons/apple-touch-icon.png";
    document.head.appendChild(appleIcon);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin/" }).catch(() => {});
    }

    return () => {
      manifestLink.remove();
      themeColor.remove();
      appleCapable.remove();
      appleStatusBar.remove();
      appleTitle.remove();
      appleIcon.remove();
    };
  }, []);

  if (isLoginPage) return <>{children}</>;
  if (!checked) return null;

  return (
    <div>
      <div className="bg-brand-black text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/admin/productos" className={pathname.startsWith("/admin/productos") ? "text-brand-orange" : ""}>
              Productos
            </Link>
            <Link href="/admin/pedidos" className={pathname.startsWith("/admin/pedidos") ? "text-brand-orange" : ""}>
              Pedidos
            </Link>
            <Link href="/admin/analiticas" className={pathname.startsWith("/admin/analiticas") ? "text-brand-orange" : ""}>
              Analiticas
            </Link>
            <Link href="/" className="text-white/60 hover:text-white">Ver tienda ↗</Link>
          </div>
          <button
            onClick={() => {
              clearAdminToken();
              router.push("/admin/login");
            }}
            className="text-sm text-white/60 hover:text-white"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">{children}</div>
    </div>
  );
}
