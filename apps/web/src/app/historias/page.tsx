"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { Button } from "@rancho-cero/ui/components/button";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { BadgeCheck, Copy, Download, FilePen, Loader2, PenLine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────
// Pantalla "Historias" (uso interno de Cireneos, requiere sesión).
// Todas las historias, agrupadas por familia y ordenadas por urgencia.
// Las aprobadas se copian o se descargan para usarlas en la web de Cireneos.
// Voluntarios y coordinadores ven y copian; solo coordinadores escriben y
// aprueban (en /historia/[id]).
// ─────────────────────────────────────────────────────────────

type Familias = FunctionReturnType<typeof api.historias.listar>;
type Filtro = "todas" | "aprobadas" | "borradores";

const OPCIONES_FILTRO: { id: Filtro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "aprobadas", label: "Aprobadas" },
  { id: "borradores", label: "Borradores" },
];

// Nivel de urgencia según el puntaje final (mismos cortes que los colores del ranking).
function nivelUrgencia(p: number): { label: string; clase: string } {
  if (p >= 90) return { label: "Urgencia muy alta", clase: "bg-red-500/10 text-red-700 dark:text-red-400" };
  if (p >= 65) return { label: "Urgencia alta", clase: "bg-orange-500/10 text-orange-700 dark:text-orange-400" };
  if (p >= 40) return { label: "Urgencia media", clase: "bg-green-700/10 text-green-800 dark:text-green-400" };
  return { label: "Urgencia baja", clase: "bg-green-500/10 text-green-700 dark:text-green-500" };
}

function fecha(ms: number): string {
  return new Date(ms).toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" });
}

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success("Texto copiado.");
  } catch {
    toast.error("No se pudo copiar. Seleccioná el texto y copialo a mano.");
  }
}

// Archivo de texto con todas las historias aprobadas, listo para pegar en la web.
function descargarAprobadas(familias: Familias) {
  const bloques = familias.flatMap((f) =>
    f.historias.filter((h) => h.aprobada).map((h) => `${f.alias}\n\n${h.texto}`),
  );
  if (bloques.length === 0) {
    toast.error("Todavía no hay historias aprobadas.");
    return;
  }
  const hoy = new Date();
  const contenido =
    `Historias aprobadas — Rancho Cero (Cireneos)\n` +
    `Descargadas el ${fecha(hoy.getTime())}. Textos anónimos, revisados y aprobados por el equipo.\n\n` +
    bloques.join("\n\n────────────────────\n\n") +
    "\n";
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `historias-aprobadas-${hoy.toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function ListaHistorias() {
  const familias = useQuery(api.historias.listar);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  if (familias === undefined) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
        ))}
      </div>
    );
  }

  const hayAprobadas = familias.some((f) => f.historias.some((h) => h.aprobada));
  const visibles = familias
    .map((f) => ({
      ...f,
      historias: f.historias.filter((h) =>
        filtro === "todas" ? true : filtro === "aprobadas" ? h.aprobada : !h.aprobada,
      ),
    }))
    .filter((f) => f.historias.length > 0);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-border/70 bg-card p-0.5">
          {OPCIONES_FILTRO.map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => setFiltro(op.id)}
              aria-pressed={filtro === op.id}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                filtro === op.id
                  ? "bg-green-700 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => descargarAprobadas(familias)} disabled={!hayAprobadas}>
          <Download />
          Descargar historias aprobadas
        </Button>
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          {familias.length === 0
            ? "Todavía no hay historias. Se escriben desde la ficha de cada familia en el ranking."
            : filtro === "aprobadas"
              ? "No hay historias aprobadas."
              : "No hay borradores."}
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map((f) => {
            const nivel = nivelUrgencia(f.puntajeFinal);
            return (
              <section key={f.casoId} className="rounded-xl border border-border/60 bg-card p-4">
                <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{f.alias}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${nivel.clase}`}>
                      {nivel.label} · {f.puntajeFinal}
                    </span>
                  </div>
                  {/* TODO(roles): mostrar este enlace solo a coordinadores. */}
                  <Link
                    href={`/historia/${f.casoId}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline dark:text-green-400"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    Escribir y aprobar
                  </Link>
                </header>

                <ul className="space-y-2.5">
                  {f.historias.map((h) => (
                    <li key={h.id} className="rounded-lg border border-border/50 bg-background/60 p-3">
                      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        {h.aprobada ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-700/10 px-1.5 py-0.5 font-medium text-green-700 dark:text-green-400">
                            <BadgeCheck className="h-3 w-3" />
                            Aprobada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-800 dark:text-amber-400">
                            <FilePen className="h-3 w-3" />
                            Borrador
                          </span>
                        )}
                        <span>{fecha(h.fecha)}</span>
                        {h.aprobadaPor && <span>· aprobó {h.aprobadaPor}</span>}
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{h.texto}</p>
                      {h.aprobada && (
                        <div className="mt-2 flex justify-end">
                          <Button size="xs" variant="outline" onClick={() => copiar(h.texto)}>
                            <Copy />
                            Copiar texto
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function HistoriasPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-green-700 dark:text-green-500">
            Uso interno
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Historias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historias anónimas de cada familia, de la más urgente a la menos urgente. Las aprobadas
            se pueden copiar o descargar para la web de Cireneos.
          </p>
        </header>
        <Authenticated>
          <ListaHistorias />
        </Authenticated>
        <Unauthenticated>
          <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
            <Link href="/dashboard" className="font-semibold text-green-700 underline dark:text-green-400">
              Iniciá sesión
            </Link>{" "}
            para ver las historias.
          </div>
        </Unauthenticated>
        <AuthLoading>
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-green-700" />
          </div>
        </AuthLoading>
      </div>
    </div>
  );
}
