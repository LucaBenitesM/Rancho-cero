"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { MapPin, PenLine, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Agrupación de campos por bloque de la tabla de Cireneos (FICHA.md).
const BLOQUES: { titulo: string; campos: string[] }[] = [
  { titulo: "Materialidad", campos: ["pared", "techo", "piso", "bano"] },
  { titulo: "Habitabilidad", campos: ["m2PorPersona", "ventanas", "separacionAmbientes"] },
  { titulo: "Seguridad y salubridad", campos: ["riesgoDerrumbe", "inundable"] },
  {
    titulo: "Salud y familia",
    campos: ["enfermedad", "menoresDe5", "menores5a12", "menores12a18", "monoparental"],
  },
  {
    titulo: "Dimensión social",
    campos: ["vinculoOrganizacion", "impresionPrimeraVisita", "desalojo", "adicionales"],
  },
];

// Nivel de carencia según la puntuación del campo (1 = mejor, 3 = peor).
// Se muestra como una etiqueta clara, no un punto de color suelto.
function nivelDe(puntos: number, pesoMax: number): {
  texto: string;
  punto: string;
  chip: string;
} {
  // Relativo al máximo del campo (algunos van 0..3, otros 1..3).
  if (puntos >= 3)
    return {
      texto: "Crítico",
      punto: "bg-red-500",
      chip: "bg-red-500/10 text-red-700 dark:text-red-400",
    };
  if (puntos === 2)
    return {
      texto: "Alto",
      punto: "bg-orange-500",
      chip: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    };
  if (puntos === 1)
    return {
      texto: "Medio",
      punto: "bg-yellow-500",
      chip: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500",
    };
  return {
    texto: "Sin carencia",
    punto: "bg-green-600",
    chip: "bg-green-600/10 text-green-700 dark:text-green-400",
  };
}

interface Aporte {
  campo: string;
  etiqueta: string;
  textoValor: string;
  peso: number;
  puntos: number;
  aporte: number;
}

/** Ficha de un caso. Carga desde Convex (api.casos.obtener). */
export function FichaCaso({ id, onClose }: { id: Id<"casos">; onClose: () => void }) {
  const caso = useQuery(api.casos.obtener, { id });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm duration-200 animate-in fade-in sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ficha de la familia"
    >
      <div
        className="max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border/60 bg-card shadow-2xl duration-300 animate-in slide-in-from-bottom-4 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {caso === undefined ? (
          <div className="p-6">
            <div className="mb-4 h-16 animate-pulse rounded-xl bg-muted/50" />
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-muted/40" />
              ))}
            </div>
          </div>
        ) : caso === null ? (
          <div className="flex items-center justify-between gap-2 p-6">
            <p className="text-sm text-muted-foreground">No se encontró el caso.</p>
            <CerrarBtn onClose={onClose} />
          </div>
        ) : (
          <Contenido caso={caso} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function CerrarBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Cerrar"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function Contenido({
  caso,
  onClose,
}: {
  caso: NonNullable<ReturnType<typeof useQuery<typeof api.casos.obtener>>>;
  onClose: () => void;
}) {
  const r = caso.resultado;
  const aportes = r.aportes as Aporte[];
  const porCampo = new Map(aportes.map((a) => [a.campo, a]));
  const decidirAjuste = useMutation(api.casos.decidirAjuste);
  const [decidiendo, setDecidiendo] = useState(false);

  // El coordinador acepta o rechaza el ajuste sugerido por la IA.
  async function decidir(decision: "aceptado" | "rechazado") {
    setDecidiendo(true);
    try {
      await decidirAjuste({ casoId: caso.id, decision });
      toast.success(decision === "aceptado" ? "Ajuste aceptado." : "Ajuste rechazado.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        /sesión/i.test(msg)
          ? "Necesitás iniciar sesión para decidir el ajuste."
          : "No se pudo guardar la decisión."
      );
    } finally {
      setDecidiendo(false);
    }
  }

  return (
    <>
      {/* Cabecera */}
      <div className="relative overflow-hidden rounded-t-3xl bg-green-800 p-5 text-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">{caso.alias}</h2>
            <p className="flex items-center gap-1 text-xs text-white/80">
              <MapPin className="h-3 w-3" />
              {caso.barrio}
            </p>
          </div>
          <CerrarBtn onClose={onClose} />
        </div>

        <div className="mt-4 flex items-end gap-4">
          <div>
            <div className="text-4xl font-bold leading-none tabular-nums">{r.puntajeFinal}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wide text-white/70">
              puntaje final
            </div>
          </div>
          <div className="mb-0.5 flex flex-1 flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full bg-white/20 px-2 py-0.5">Tabla: {r.total}/135</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5">Base: {r.base}</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5">
              Espera: +{r.espera} ({r.mesesEspera} {r.mesesEspera === 1 ? "mes" : "meses"})
            </span>
            <span className="rounded-full bg-white/20 px-2 py-0.5">
              Ajuste:{" "}
              {r.ajusteAplicado === 0
                ? "—"
                : `${r.ajusteAplicado > 0 ? "+" : ""}${Math.round(r.ajusteAplicado * 100)}%`}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Explicación */}
        <div className="mb-4 flex gap-2.5 rounded-2xl border border-green-700/20 bg-green-50/70 p-3.5 dark:bg-green-950/20">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
          <div>
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
              Explicación
            </div>
            <p className="text-xs leading-relaxed text-foreground/80">{r.explicacion}</p>
          </div>
        </div>

        {/* Ajuste de la IA */}
        {caso.ajuste && (
          <div className="mb-4 rounded-2xl border border-border bg-muted/30 p-3.5 text-xs">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-semibold">
                Ajuste sugerido por IA {caso.ajuste.porcentaje > 0 ? "+" : ""}
                {caso.ajuste.porcentaje}%
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                  caso.ajuste.estado === "aceptado"
                    ? "bg-green-700/10 text-green-800 dark:text-green-300"
                    : caso.ajuste.estado === "rechazado"
                      ? "bg-red-500/10 text-red-700 dark:text-red-400"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-500"
                }`}
              >
                {caso.ajuste.estado}
              </span>
            </div>
            <p className="text-muted-foreground">{caso.ajuste.motivo}</p>
            <p className="mt-1 italic text-muted-foreground/80">{caso.ajuste.evidencia}</p>
            {caso.ajuste.estado === "sugerido" && caso.estado !== "relevado" && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => decidir("aceptado")}
                  disabled={decidiendo}
                  className="rounded-full bg-green-700 px-3 py-1 text-[11px] font-medium text-white hover:bg-green-800 disabled:opacity-50"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => decidir("rechazado")}
                  disabled={decidiendo}
                  className="rounded-full border border-border px-3 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Historia para donantes: la escribe la IA y la aprueba el coordinador. */}
        {caso.estado !== "relevado" && (
          <Link
            href={`/historia/${caso.id}`}
            className="mb-4 flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-muted"
          >
            <PenLine className="h-3.5 w-3.5" />
            Escribir y aprobar historia
          </Link>
        )}

        {/* Desglose por bloque de la tabla de Cireneos */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Desglose de la evaluación</h3>
            <span className="text-[11px] text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{r.total}</span> / 135
            </span>
          </div>

          {BLOQUES.map((bloque) => {
            const filas = bloque.campos
              .map((c) => porCampo.get(c))
              .filter((a): a is Aporte => a !== undefined);
            if (filas.length === 0) return null;
            const subtotal = filas.reduce((acc, a) => acc + a.aporte, 0);
            const maxBloque = filas.reduce((acc, a) => acc + a.peso * 3, 0);
            return (
              <div key={bloque.titulo} className="overflow-hidden rounded-xl border border-border/70">
                {/* Encabezado del bloque */}
                <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-3.5 py-2">
                  <span className="text-xs font-semibold">{bloque.titulo}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {subtotal} / {maxBloque} pts
                  </span>
                </div>

                {/* Campos del bloque */}
                <div className="divide-y divide-border/60">
                  {filas.map((a) => {
                    const nivel = nivelDe(a.puntos, a.peso * 3);
                    return (
                      <div key={a.campo} className="flex items-center gap-3 px-3.5 py-2.5">
                        {/* Identidad del campo */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{a.etiqueta}</span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${nivel.chip}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${nivel.punto}`} />
                              {nivel.texto}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {a.textoValor}
                          </p>
                        </div>

                        {/* Aporte al puntaje */}
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold tabular-nums">{a.aporte}</div>
                          <div className="text-[10px] text-muted-foreground">
                            de {a.peso * 3} pts
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Leyenda de niveles */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="font-medium">Nivel de carencia:</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-600" /> Sin carencia</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> Medio</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Alto</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Crítico</span>
        </div>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Datos simulados · la fórmula vive en código (FICHA.md), no la decide la IA
        </p>
      </div>
    </>
  );
}
