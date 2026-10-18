"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ChevronRight, Clock, Info, MapPin, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { FichaCaso } from "@/components/ficha-caso";
import Protegida from "@/components/protegida";

type Orden = "prioridad" | "espera" | "pendiente" | "alfabetico";

const OPCIONES_ORDEN: { id: Orden; label: string }[] = [
  { id: "prioridad", label: "Prioridad" },
  { id: "espera", label: "Mayor espera" },
  { id: "pendiente", label: "Ajuste pendiente" },
  { id: "alfabetico", label: "A–Z" },
];

// Color del puntaje según severidad (terracota = más urgente, salvia = menos).
function tonoPuntaje(p: number): { text: string; bar: string } {
  if (p >= 90) return { text: "text-urgencia-critica-texto", bar: "bg-urgencia-critica" };
  if (p >= 65) return { text: "text-urgencia-alta-texto", bar: "bg-urgencia-alta" };
  if (p >= 40) return { text: "text-urgencia-media-texto", bar: "bg-urgencia-media" };
  return { text: "text-urgencia-baja-texto", bar: "bg-urgencia-baja" };
}

function Ranking() {
  const filas = useQuery(api.casos.ranking);
  const [abierto, setAbierto] = useState<Id<"casos"> | null>(null);
  const [orden, setOrden] = useState<Orden>("prioridad");

  const ordenadas = useMemo(() => {
    if (!filas) return filas;
    const copia = [...filas];
    if (orden === "prioridad") {
      copia.sort((a, b) => b.puntajeFinal - a.puntajeFinal);
    } else if (orden === "alfabetico") {
      copia.sort((a, b) => a.alias.localeCompare(b.alias, "es"));
    } else if (orden === "espera") {
      // Más tiempo esperando primero; a igual espera, mayor puntaje.
      copia.sort((a, b) => b.espera - a.espera || b.puntajeFinal - a.puntajeFinal);
    } else if (orden === "pendiente") {
      // Primero las que tienen un ajuste sugerido sin decidir (requieren acción);
      // dentro de cada grupo, por puntaje.
      const pend = (f: (typeof copia)[number]) => (f.ajusteEstado === "sugerido" ? 0 : 1);
      copia.sort((a, b) => pend(a) - pend(b) || b.puntajeFinal - a.puntajeFinal);
    }
    return copia;
  }, [filas, orden]);

  const maxFinal =
    filas && filas.length > 0 ? Math.max(...filas.map((f) => f.puntajeFinal)) : 100;

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Encabezado */}
        <header className="mb-6">
          <p className="font-heading text-xs font-semibold tracking-[0.2em] text-oliva uppercase">
            Priorizá
          </p>
          <h1 className="mt-1 text-3xl font-bold text-oliva-oscuro">Ranking de urgencia</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Familias priorizadas según la tabla de puntajes de Cireneos.
          </p>
        </header>

        {/* Barra de orden */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Ordenar por</span>
          <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
            {OPCIONES_ORDEN.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setOrden(op.id)}
                aria-pressed={orden === op.id}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors sm:flex-none sm:px-4 ${
                  orden === op.id
                    ? "bg-oliva text-white"
                    : "text-muted-foreground hover:text-oliva-oscuro"
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nota */}
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-salvia/30 bg-salvia-suave/60 px-4 py-3 text-xs text-oliva-oscuro">
          <Info className="size-4 shrink-0 text-oliva" />
          <span>
            Familias ordenadas por urgencia según la tabla de criterios de Cireneos. Tocá una
            familia para ver su ficha.
          </span>
        </div>

        {ordenadas === undefined ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[96px] animate-pulse rounded-2xl border border-border/60 bg-muted/60"
              />
            ))}
          </div>
        ) : ordenadas.length === 0 ? (
          <div className="rounded-2xl border border-border/80 bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
            <p className="font-heading text-base font-bold text-oliva-oscuro">
              Todavía no hay familias en el ranking
            </p>
            <p className="mt-1.5">
              Cargá una visita desde <span className="font-semibold text-oliva-oscuro">Nueva visita</span>{" "}
              y, cuando guardes la ficha, la familia aparece acá priorizada por urgencia.
            </p>
          </div>
        ) : (
          <>
            {/* Contenedor con scroll: ~4 casos visibles, el resto deslizando */}
            <div className="max-h-[600px] space-y-3 overflow-y-auto rounded-2xl p-1 [scrollbar-width:thin]">
              {ordenadas.map((fila, i) => {
                const tono = tonoPuntaje(fila.puntajeFinal);
                const ancho = Math.max(4, (fila.puntajeFinal / maxFinal) * 100);
                const puesto = orden === "prioridad" ? i + 1 : null;
                return (
                  <button
                    key={fila.id}
                    type="button"
                    onClick={() => setAbierto(fila.id as Id<"casos">)}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-[0_1px_2px_rgb(31_31_26/0.04)] transition-all hover:border-salvia hover:shadow-md focus-visible:ring-3 focus-visible:ring-salvia/50 focus-visible:outline-none"
                    aria-label={`Abrir ficha de ${fila.alias}, puntaje ${fila.puntajeFinal}`}
                  >
                    {/* Puesto (solo en orden por prioridad) */}
                    <div className="flex w-7 shrink-0 justify-center">
                      {puesto !== null ? (
                        <span
                          className={`flex size-7 items-center justify-center rounded-full font-heading text-xs font-bold ${
                            puesto <= 3
                              ? "bg-oliva text-white"
                              : "bg-salvia-suave text-oliva-oscuro"
                          }`}
                        >
                          {puesto}
                        </span>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>

                    {/* Identidad + barra + explicación */}
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-heading text-sm font-bold">{fila.alias}</span>
                        <span className="flex min-w-0 items-center gap-0.5 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          {fila.barrio}
                        </span>
                        {/* Meses de espera (destacado cuando se ordena por espera) */}
                        {fila.espera > 0 && (
                          <span
                            className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              orden === "espera"
                                ? "bg-salvia-suave text-oliva-oscuro"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {fila.espera} {fila.espera === 1 ? "mes" : "meses"}
                          </span>
                        )}
                        {/* Ajuste: pendiente de decidir, o ya aplicado */}
                        {fila.ajusteEstado === "sugerido" ? (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            <TrendingUp className="h-2.5 w-2.5" />
                            ajuste pendiente
                          </span>
                        ) : fila.ajusteAplicado !== 0 ? (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-salvia-suave px-1.5 py-0.5 text-[10px] font-semibold text-oliva-oscuro">
                            <TrendingUp className="h-2.5 w-2.5" />
                            {fila.ajusteAplicado > 0 ? "+" : ""}
                            {Math.round(fila.ajusteAplicado * 100)}%
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${tono.bar} transition-all`}
                          style={{ width: `${ancho}%` }}
                        />
                      </div>

                      <p className="mt-1.5 line-clamp-1 text-xs leading-snug text-muted-foreground">
                        {fila.explicacion}
                      </p>
                    </div>

                    {/* Puntaje */}
                    <div className="flex shrink-0 flex-col items-end">
                      <div className={`font-heading text-2xl font-extrabold tabular-nums ${tono.text}`}>
                        {fila.puntajeFinal}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{fila.total}/135</div>
                      <ChevronRight className="mt-0.5 size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-oliva" />
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {ordenadas.length} familias · deslizá para ver todas
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="font-semibold">Urgencia:</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-urgencia-critica" /> Muy alta</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-urgencia-alta" /> Alta</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-urgencia-media" /> Media</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-urgencia-baja" /> Baja</span>
            </div>
          </>
        )}
      </div>

      {abierto && <FichaCaso id={abierto} onClose={() => setAbierto(null)} />}
    </div>
  );
}

export default function RankingPage() {
  return (
    <Protegida soloCoordinador>
      <Ranking />
    </Protegida>
  );
}
