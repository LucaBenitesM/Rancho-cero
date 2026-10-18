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
  if (p >= 90) return { label: "Urgencia muy alta", clase: "bg-urgencia-critica/12 text-urgencia-critica-texto" };
  if (p >= 65) return { label: "Urgencia alta", clase: "bg-urgencia-alta/15 text-urgencia-alta-texto" };
  if (p >= 40) return { label: "Urgencia media", clase: "bg-urgencia-media/20 text-urgencia-media-texto" };
  return { label: "Urgencia baja", clase: "bg-salvia-suave text-urgencia-baja-texto" };
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
  const nombre = `historias-aprobadas-${hoy.toISOString().slice(0, 10)}.txt`;
  const archivo = new File([contenido], nombre, { type: "text/plain;charset=utf-8" });

  // En iPhone/iPad la hoja de compartir permite "Guardar en Archivos".
  if (esIOS() && navigator.canShare?.({ files: [archivo] })) {
    navigator.share({ files: [archivo], title: "Historias aprobadas" }).catch((err) => {
      if (err instanceof Error && err.name === "AbortError") return; // canceló
      descargarConEnlace(archivo, nombre);
    });
    return;
  }
  descargarConEnlace(archivo, nombre);
}

function esIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// El enlace tiene que estar en el documento y la URL no se puede revocar en el
// acto: Safari (iOS) la lee después del click y si no, no descarga nada.
function descargarConEnlace(archivo: Blob, nombre: string) {
  const url = URL.createObjectURL(archivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function ListaHistorias() {
  const familias = useQuery(api.historias.listar);
  const esCoordinador = useQuery(api.roles.miRol) === "coordinador";
  const [filtro, setFiltro] = useState<Filtro>("todas");

  if (familias === undefined) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-border/60 bg-muted/60" />
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
          {OPCIONES_FILTRO.map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => setFiltro(op.id)}
              aria-pressed={filtro === op.id}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                filtro === op.id
                  ? "bg-oliva text-white"
                  : "text-muted-foreground hover:text-oliva-oscuro"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => descargarAprobadas(familias)} disabled={!hayAprobadas}>
          <Download />
          Descargar historias aprobadas
        </Button>
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          {familias.length === 0
            ? "Todavía no hay historias. Se escriben desde la ficha de cada familia en el ranking."
            : filtro === "aprobadas"
              ? "No hay historias aprobadas."
              : "No hay borradores."}
        </div>
      ) : (
        <div className="space-y-4">
          {visibles.map((f) => {
            const nivel = nivelUrgencia(f.puntajeFinal);
            return (
              <section
                key={f.casoId}
                className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgb(31_31_26/0.04),0_4px_16px_-6px_rgb(84_86_55/0.12)]"
              >
                <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-oliva-oscuro">{f.alias}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${nivel.clase}`}>
                      {nivel.label} · {f.puntajeFinal}
                    </span>
                  </div>
                  {esCoordinador && (
                    <Link
                      href={`/historia/${f.casoId}`}
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold text-oliva underline decoration-manteca decoration-2 underline-offset-4 hover:text-oliva-oscuro"
                    >
                      <PenLine className="size-3.5" />
                      Escribir y aprobar
                    </Link>
                  )}
                </header>

                <ul className="space-y-3">
                  {f.historias.map((h) => (
                    <li key={h.id} className="rounded-xl border border-border/60 bg-crema p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {h.aprobada ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-salvia-suave px-2 py-0.5 font-semibold text-oliva-oscuro">
                            <BadgeCheck className="h-3 w-3" />
                            Aprobada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-manteca/60 px-2 py-0.5 font-semibold text-urgencia-media-texto">
                            <FilePen className="h-3 w-3" />
                            Borrador
                          </span>
                        )}
                        <span>{fecha(h.fecha)}</span>
                        {h.aprobadaPor && <span>· aprobó {h.aprobadaPor}</span>}
                      </div>
                      <p className="text-[15px] leading-relaxed whitespace-pre-line">{h.texto}</p>
                      {h.aprobada && (
                        <div className="mt-3 flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => copiar(h.texto)}>
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
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6">
          <p className="font-heading text-xs font-semibold tracking-[0.2em] text-oliva uppercase">
            Contá su historia
          </p>
          <h1 className="mt-1 text-3xl font-bold text-oliva-oscuro">Historias</h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Historias anónimas de cada familia, de la más urgente a la menos urgente. Las aprobadas
            se pueden copiar o descargar para la web de Cireneos.
          </p>
        </header>
        <Authenticated>
          <ListaHistorias />
        </Authenticated>
        <Unauthenticated>
          <div className="rounded-2xl border border-border/80 bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
            <Link href="/dashboard" className="font-semibold text-oliva underline decoration-manteca decoration-2 underline-offset-4">
              Iniciá sesión
            </Link>{" "}
            para ver las historias.
          </div>
        </Unauthenticated>
        <AuthLoading>
          <div className="py-16 text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-salvia" />
          </div>
        </AuthLoading>
      </div>
    </div>
  );
}
