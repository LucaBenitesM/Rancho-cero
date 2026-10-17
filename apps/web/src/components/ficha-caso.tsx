"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import { Button } from "@rancho-cero/ui/components/button";
import { useQuery } from "convex/react";
import { useEffect } from "react";

const CAMPOS_VIVIENDA = ["techo", "paredes", "piso", "humedad", "riesgoElectrico", "bano", "agua"];

function colorPuntos(puntos: number): string {
  if (puntos >= 8) return "bg-red-500";
  if (puntos >= 5) return "bg-orange-400";
  if (puntos >= 3) return "bg-yellow-400";
  return "bg-green-500";
}

interface Aporte {
  campo: string;
  etiqueta: string;
  textoValor: string;
  peso: number;
  puntos: number;
  aporte: number;
}

/**
 * Ficha de un caso. Se abre al tocar una familia en el ranking.
 * Carga el caso desde Convex (api.casos.obtener) con su desglose y explicación.
 */
export function FichaCaso({ id, onClose }: { id: Id<"casos">; onClose: () => void }) {
  const caso = useQuery(api.casos.obtener, { id });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ficha de la familia"
    >
      <div
        className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-none border bg-card p-4 text-card-foreground shadow-lg sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {caso === undefined ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando ficha…</p>
        ) : caso === null ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">No se encontró el caso.</p>
            <Button variant="ghost" size="icon-sm" aria-label="Cerrar" onClick={onClose}>
              ✕
            </Button>
          </div>
        ) : (
          <Contenido caso={caso} onClose={onClose} />
        )}
      </div>
    </div>
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
  const vivienda = aportes.filter((a) => CAMPOS_VIVIENDA.includes(a.campo));
  const familia = aportes.filter((a) => !CAMPOS_VIVIENDA.includes(a.campo));

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{caso.alias}</h2>
          <p className="text-xs text-muted-foreground">{caso.barrio}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Cerrar" onClick={onClose}>
          ✕
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-4 border-y py-3">
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums">{r.puntajeFinal}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">puntaje</div>
        </div>
        <div className="flex-1 space-y-0.5 text-xs text-muted-foreground">
          <div>Base: {r.base} / 100</div>
          <div>
            Espera: +{r.espera} ({r.mesesEspera} {r.mesesEspera === 1 ? "mes" : "meses"})
          </div>
          <div>
            Ajuste:{" "}
            {r.ajusteAplicado === 0
              ? "—"
              : `${r.ajusteAplicado > 0 ? "+" : ""}${Math.round(r.ajusteAplicado * 100)}%`}
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-none border bg-muted/40 p-3">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Explicación
        </div>
        <p className="text-xs leading-relaxed">{r.explicacion}</p>
      </div>

      {caso.ajuste && (
        <div className="mb-4 rounded-none border border-dashed p-3 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium">
              Ajuste IA {caso.ajuste.porcentaje > 0 ? "+" : ""}
              {caso.ajuste.porcentaje}%
            </span>
            <span
              className={
                caso.ajuste.estado === "aceptado"
                  ? "text-green-600"
                  : caso.ajuste.estado === "rechazado"
                    ? "text-red-600"
                    : "text-orange-500"
              }
            >
              {caso.ajuste.estado}
            </span>
          </div>
          <p className="text-muted-foreground">{caso.ajuste.motivo}</p>
          <p className="mt-1 italic text-muted-foreground">{caso.ajuste.evidencia}</p>
        </div>
      )}

      <TablaCampos titulo="Vivienda" filas={vivienda} />
      <TablaCampos titulo="Familia" filas={familia} />

      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        Datos simulados · la fórmula vive en código (FICHA.md), no la decide la IA
      </p>
    </>
  );
}

function TablaCampos({ titulo, filas }: { titulo: string; filas: Aporte[] }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {titulo}
      </div>
      <div className="divide-y">
        {filas.map((a) => (
          <div key={a.campo} className="flex items-center gap-2 py-1.5 text-xs">
            <div className={`h-2 w-2 shrink-0 rounded-full ${colorPuntos(a.puntos)}`} />
            <div className="flex-1">
              <span className="font-medium">{a.etiqueta}</span>{" "}
              <span className="text-muted-foreground">· {a.textoValor}</span>
            </div>
            <div className="shrink-0 tabular-nums text-muted-foreground">
              peso {a.peso} · {a.puntos}/10
            </div>
            <div className="w-10 shrink-0 text-right font-medium tabular-nums">
              +{a.aporte.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
