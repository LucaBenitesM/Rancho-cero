"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { LogOut } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";

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

  // Hasta saber el rol no se muestran links (sin parpadeo del menú equivocado).
  const links = rol ? LINKS.filter((l) => !l.soloCoordinador || rol === "coordinador") : [];

  function cerrarSesion() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.replace("/dashboard"),
      },
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 px-4 sm:h-16 sm:flex-nowrap sm:px-6">
        {/* Wordmark */}
        <Link href="/" className="flex h-14 items-center gap-1.5 sm:h-auto">
          <span className="text-base font-semibold tracking-tight text-foreground">Rancho Cero</span>
          <span className="h-1.5 w-1.5 rounded-full bg-green-700 dark:bg-green-500" aria-hidden />
        </Link>

        {/* Navegación: en el celular pasa a una segunda fila */}
        {links.length > 0 && (
          <nav className="order-last -mx-1 flex w-full items-center gap-1 overflow-x-auto pb-1 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:justify-end sm:gap-2 sm:pb-0">
            {links.map(({ to, label }) => {
              const activo = pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  href={to}
                  className={`relative shrink-0 px-2.5 py-1.5 text-[13px] font-medium transition-colors sm:px-3 ${
                    activo ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                  {activo && (
                    <span className="absolute inset-x-2.5 -bottom-[1px] h-[2px] rounded-full bg-green-700 dark:bg-green-500 sm:inset-x-3" />
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Rol, cerrar sesión y tema */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {rol && (
            <>
              <span className="rounded-full bg-green-700/10 px-2.5 py-1 text-[11px] font-medium text-green-800 dark:text-green-400">
                {rol === "coordinador" ? "Coordinador" : "Voluntario"}
              </span>
              <button
                type="button"
                onClick={cerrarSesion}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
