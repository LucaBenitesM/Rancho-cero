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
      punto: "bg-urgencia-critica",
      chip: "bg-urgencia-critica/12 text-urgencia-critica-texto",
    };
  if (puntos === 2)
    return {
      texto: "Alto",
      punto: "bg-urgencia-alta",
      chip: "bg-urgencia-alta/15 text-urgencia-alta-texto",
    };
  if (puntos === 1)
    return {
      texto: "Medio",
      punto: "bg-urgencia-media",
      chip: "bg-urgencia-media/20 text-urgencia-media-texto",
    };
  return {
    texto: "Sin carencia",
    punto: "bg-urgencia-baja",
    chip: "bg-salvia-suave text-urgencia-baja-texto",
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
        className="max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border/60 bg-crema shadow-2xl duration-300 animate-in slide-in-from-bottom-4 sm:rounded-3xl"
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
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-oliva-oscuro shadow-sm transition-colors hover:bg-manteca"
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
      <div className="relative overflow-hidden rounded-t-3xl bg-oliva p-5 text-white sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">{caso.alias}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-white/85">
              <MapPin className="size-3.5" />
              {caso.barrio}
            </p>
          </div>
          <CerrarBtn onClose={onClose} />
        </div>

        <div className="mt-4 flex items-end gap-4">
          <div>
            <div className="font-heading text-5xl leading-none font-extrabold text-manteca tabular-nums">
              {r.puntajeFinal}
            </div>
            <div className="mt-1.5 text-[10px] font-semibold tracking-[0.15em] text-white/80 uppercase">
              puntaje final
            </div>
          </div>
          <div className="mb-0.5 flex flex-1 flex-wrap gap-1.5 text-[11px] font-medium">
            <span className="rounded-full bg-white/15 px-2.5 py-1">Tabla: {r.total}/135</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1">Base: {r.base}</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1">
              Espera: +{r.espera} ({r.mesesEspera} {r.mesesEspera === 1 ? "mes" : "meses"})
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-1">
              Ajuste:{" "}
              {r.ajusteAplicado === 0
                ? "—"
                : `${r.ajusteAplicado > 0 ? "+" : ""}${Math.round(r.ajusteAplicado * 100)}%`}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Explicación */}
        <div className="mb-4 flex gap-3 rounded-2xl border border-salvia/30 bg-salvia-suave/70 p-4">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-oliva" />
          <div>
            <div className="mb-1 font-heading text-[11px] font-bold tracking-[0.12em] text-oliva uppercase">
              Explicación
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">{r.explicacion}</p>
          </div>
        </div>

        {/* Ajuste de la IA */}
        {caso.ajuste && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-semibold">
                Ajuste sugerido por IA {caso.ajuste.porcentaje > 0 ? "+" : ""}
                {caso.ajuste.porcentaje}%
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                  caso.ajuste.estado === "aceptado"
                    ? "bg-salvia-suave text-oliva-oscuro"
                    : caso.ajuste.estado === "rechazado"
                      ? "bg-urgencia-critica/12 text-urgencia-critica-texto"
                      : "bg-manteca/60 text-urgencia-media-texto"
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
                  className="rounded-full bg-oliva px-4 py-2 text-xs font-semibold text-white hover:bg-oliva-oscuro disabled:opacity-50"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => decidir("rechazado")}
                  disabled={decidiendo}
                  className="rounded-full border border-salvia/60 bg-card px-4 py-2 text-xs font-semibold text-oliva-oscuro hover:bg-salvia-suave disabled:opacity-50"
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
            className="mb-5 flex h-12 items-center justify-center gap-2 rounded-full bg-manteca px-5 text-sm font-bold tracking-wide text-tinta uppercase shadow-sm transition-colors hover:bg-manteca-oscuro"
          >
            <PenLine className="size-4" />
            Escribir y aprobar historia
          </Link>
        )}

        {/* Desglose por bloque de la tabla de Cireneos */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-oliva-oscuro">Desglose de la evaluación</h3>
            <span className="text-xs text-muted-foreground">
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
              <div
                key={bloque.titulo}
                className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
              >
                {/* Encabezado del bloque */}
                <div className="flex items-center justify-between border-b border-border/70 bg-salvia-suave/70 px-4 py-2.5">
                  <span className="font-heading text-xs font-bold text-oliva-oscuro">{bloque.titulo}</span>
                  <span className="text-[11px] font-semibold text-oliva">
                    {subtotal} / {maxBloque} pts
                  </span>
                </div>

                {/* Campos del bloque */}
                <div className="divide-y divide-border/60">
                  {filas.map((a) => {
                    const nivel = nivelDe(a.puntos, a.peso * 3);
                    return (
                      <div key={a.campo} className="flex items-center gap-3 px-4 py-3">
                        {/* Identidad del campo */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold">{a.etiqueta}</span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${nivel.chip}`}
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
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-medium">Nivel de carencia:</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-urgencia-baja" /> Sin carencia</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-urgencia-media" /> Medio</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-urgencia-alta" /> Alto</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-urgencia-critica" /> Crítico</span>
        </div>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Datos simulados · la fórmula vive en código (FICHA.md), no la decide la IA
        </p>
      </div>
    </>
  );
}
