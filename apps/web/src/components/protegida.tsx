"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { buttonVariants } from "@rancho-cero/ui/components/button";
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
        <div className="rounded-3xl border border-border/80 bg-card p-7 text-center shadow-[0_4px_24px_-8px_rgb(84_86_55/0.18)]">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-manteca/50 text-urgencia-media-texto">
            <ShieldAlert className="size-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-oliva-oscuro">No tenés permiso para ver esta página</h1>
          <p className="mt-1 text-sm text-muted-foreground">Es solo para coordinadores.</p>
          <Link
            href="/nueva-visita"
            className={`mt-6 ${buttonVariants({ variant: "acento", size: "lg" })}`}
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
    <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
      <Loader2 className="mx-auto size-8 animate-spin text-salvia" />
      <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
    </div>
  );
}
