"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Envuelve una página que necesita sesión. Sin sesión redirige al login
// (/dashboard). Con `soloCoordinador`, un voluntario ve un aviso en vez de la
// página. Mientras se sabe el rol muestra "Cargando…", nunca la página equivocada.
export default function Protegida({
  soloCoordinador = false,
  children,
}: {
  soloCoordinador?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const rol = useQuery(api.roles.miRol, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/dashboard");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || rol === undefined || rol === null) {
    return <Cargando />;
  }

  if (soloCoordinador && rol !== "coordinador") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-lg font-semibold">No tenés permiso para ver esta página</h1>
          <p className="mt-1 text-sm text-muted-foreground">Es solo para coordinadores.</p>
          <Link
            href="/nueva-visita"
            className="mt-5 inline-block rounded-xl bg-green-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-800"
          >
            Ir a Nueva visita
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Cargando() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-green-700" />
      <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
    </div>
  );
}
