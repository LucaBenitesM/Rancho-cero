"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { LogOut, Menu, X } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";

// /historias la suma otro PR: hasta entonces no está en las rutas tipadas.
const LINKS: { to: Route; label: string; soloCoordinador: boolean }[] = [
  { to: "/nueva-visita", label: "Nueva visita", soloCoordinador: false },
  { to: "/historias" as Route, label: "Historias", soloCoordinador: false },
  { to: "/ranking", label: "Ranking", soloCoordinador: true },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const rol = useQuery(api.roles.miRol, isAuthenticated ? {} : "skip");
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Al navegar se cierra el menú del celular.
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  // Hasta saber el rol no se muestran links (sin parpadeo del menú equivocado).
  const links = rol ? LINKS.filter((l) => !l.soloCoordinador || rol === "coordinador") : [];
  const etiquetaRol = rol === "coordinador" ? "Coordinador" : "Voluntario";

  function cerrarSesion() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.replace("/dashboard"),
      },
    });
  }

  return (
    <header className="sticky top-0 z-40 bg-oliva text-white shadow-[0_2px_12px_rgb(31_31_26/0.18)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Rancho Cero, inicio">
          <Image
            src="/imagenes/logo-cireneos.png"
            alt="Logo de Cireneos"
            width={48}
            height={48}
            priority
            className="size-11 rounded-full sm:size-12"
          />
          <span className="flex flex-col leading-none">
            <span className="font-heading text-[15px] font-bold tracking-wide uppercase">Rancho Cero</span>
            <span className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-white/70 uppercase">
              Cireneos
            </span>
          </span>
        </Link>

        {/* Navegación (compu) */}
        {links.length > 0 && (
          <nav className="hidden flex-1 items-center justify-end gap-1 md:flex" aria-label="Principal">
            {links.map(({ to, label }) => {
              const activo = pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  href={to}
                  aria-current={activo ? "page" : undefined}
                  className={`relative px-3 py-2 font-heading text-xs font-semibold tracking-[0.12em] uppercase transition-colors ${
                    activo ? "text-white" : "text-white/80 hover:text-white"
                  }`}
                >
                  {label}
                  <span
                    className={`absolute inset-x-3 -bottom-0.5 h-[3px] rounded-full bg-manteca transition-opacity ${
                      activo ? "opacity-100" : "opacity-0"
                    }`}
                    aria-hidden
                  />
                </Link>
              );
            })}
          </nav>
        )}

        {/* Rol y cerrar sesión (compu) */}
        {rol && (
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide">
              {etiquetaRol}
            </span>
            <button
              type="button"
              onClick={cerrarSesion}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" aria-hidden />
              Cerrar sesión
            </button>
          </div>
        )}

        {/* Hamburguesa (celular) */}
        {rol && (
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            className="flex size-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 md:hidden"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            aria-controls="menu-celular"
          >
            {menuAbierto ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        )}
      </div>

      {/* Menú desplegable (celular) */}
      {rol && menuAbierto && (
        <div
          id="menu-celular"
          className="border-t border-white/15 bg-oliva duration-200 animate-in fade-in slide-in-from-top-2 md:hidden"
        >
          <nav className="flex flex-col px-4 py-2" aria-label="Principal">
            {links.map(({ to, label }) => {
              const activo = pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  href={to}
                  aria-current={activo ? "page" : undefined}
                  className={`flex items-center gap-3 border-l-4 py-3.5 pl-3 font-heading text-sm font-semibold tracking-[0.12em] uppercase ${
                    activo ? "border-manteca text-white" : "border-transparent text-white/80"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-between gap-3 border-t border-white/15 px-4 py-3">
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">
              {etiquetaRol}
            </span>
            <button
              type="button"
              onClick={cerrarSesion}
              className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              <LogOut className="size-4" aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
