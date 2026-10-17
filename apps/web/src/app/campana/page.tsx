// ─────────────────────────────────────────────────────────────
// CAMPAÑA — DISCONTINUADA
//
// La app pasó a ser de uso interno de Cireneos. Se sacó la campaña pública y
// la donación (incluido el formulario de pago de demo). Las historias
// aprobadas ya no se publican acá: Cireneos las publica en su propia web.
//
// Esta página queda como un aviso para no romper los enlaces que todavía
// apuntan a /campana (en el header y en la pantalla de aprobar historia, que
// son de otras personas del equipo). Cuando esos enlaces se saquen, esta
// carpeta se puede borrar.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";

export default function CampanaPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center px-6 py-20 text-center">
      <h1 className="text-xl font-semibold tracking-tight">La campaña se movió</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Rancho Cero es ahora una herramienta de uso interno de Cireneos. Las historias
        aprobadas se publican en la web de Cireneos, no en esta app.
      </p>
      <Link
        href="/ranking"
        className="mt-6 inline-flex items-center rounded-md bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500"
      >
        Ir al ranking
      </Link>
    </div>
  );
}
