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
