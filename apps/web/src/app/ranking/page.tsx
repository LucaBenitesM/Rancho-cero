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

// Color del puntaje según severidad (rojo = más urgente, teal = menos).
function tonoPuntaje(p: number): { text: string; bar: string } {
  if (p >= 90) return { text: "text-red-600 dark:text-red-400", bar: "bg-red-500" };
  if (p >= 65) return { text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500" };
  if (p >= 40) return { text: "text-green-800 dark:text-green-400", bar: "bg-green-700" };
  return { text: "text-green-700 dark:text-green-500", bar: "bg-green-500" };
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
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        {/* Encabezado */}
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-green-700 dark:text-green-500">
            Priorización
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Ranking de urgencia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Familias priorizadas según la tabla de puntajes de Cireneos.
          </p>
        </header>

        {/* Barra de orden */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Ordenar por</span>
          <div className="inline-flex rounded-md border border-border/70 bg-card p-0.5">
            {OPCIONES_ORDEN.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setOrden(op.id)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  orden === op.id
                    ? "bg-green-700 text-white dark:bg-green-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nota */}
        <div className="mb-3 flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 text-green-700 dark:text-green-500" />
          <span>
            Datos simulados · puntaje calculado en código (FICHA.md). Tocá una familia para ver su
            ficha.
          </span>
        </div>

        {ordenadas === undefined ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[88px] animate-pulse rounded-xl border border-border/60 bg-muted/40"
              />
            ))}
          </div>
        ) : ordenadas.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
            No hay casos cargados todavía.
            <br />
            Corré <code className="text-xs">npx convex run casos:seed</code> en{" "}
            <code className="text-xs">packages/backend</code>.
          </div>
        ) : (
          <>
            {/* Contenedor con scroll: ~4 casos visibles, el resto deslizando */}
            <div className="max-h-[560px] space-y-2.5 overflow-y-auto rounded-xl pr-1 [scrollbar-width:thin]">
              {ordenadas.map((fila, i) => {
                const tono = tonoPuntaje(fila.puntajeFinal);
                const ancho = Math.max(4, (fila.puntajeFinal / maxFinal) * 100);
                const puesto = orden === "prioridad" ? i + 1 : null;
                return (
                  <button
                    key={fila.id}
                    type="button"
                    onClick={() => setAbierto(fila.id as Id<"casos">)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left transition-all hover:border-green-600/50 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-green-600/40 focus-visible:outline-none"
                    aria-label={`Abrir ficha de ${fila.alias}, puntaje ${fila.puntajeFinal}`}
                  >
                    {/* Puesto (solo en orden por prioridad) */}
                    <div className="flex w-7 shrink-0 justify-center">
                      {puesto !== null ? (
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            puesto <= 3
                              ? "bg-green-700 text-white"
                              : "bg-muted text-muted-foreground"
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{fila.alias}</span>
                        <span className="flex items-center gap-0.5 truncate text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {fila.barrio}
                        </span>
                        {/* Meses de espera (destacado cuando se ordena por espera) */}
                        {fila.espera > 0 && (
                          <span
                            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              orden === "espera"
                                ? "bg-green-700/10 text-green-800 dark:text-green-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {fila.espera} {fila.espera === 1 ? "mes" : "meses"}
                          </span>
                        )}
                        {/* Ajuste: pendiente de decidir, o ya aplicado */}
                        {fila.ajusteEstado === "sugerido" ? (
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-500">
                            <TrendingUp className="h-2.5 w-2.5" />
                            ajuste pendiente
                          </span>
                        ) : fila.ajusteAplicado !== 0 ? (
                          <span className="flex items-center gap-0.5 rounded-full bg-green-700/10 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                            <TrendingUp className="h-2.5 w-2.5" />
                            {fila.ajusteAplicado > 0 ? "+" : ""}
                            {Math.round(fila.ajusteAplicado * 100)}%
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${tono.bar} transition-all`}
                          style={{ width: `${ancho}%` }}
                        />
                      </div>

                      <p className="mt-1.5 line-clamp-1 text-[11px] leading-snug text-muted-foreground">
                        {fila.explicacion}
                      </p>
                    </div>

                    {/* Puntaje */}
                    <div className="flex shrink-0 flex-col items-end">
                      <div className={`text-xl font-bold tabular-nums ${tono.text}`}>
                        {fila.puntajeFinal}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{fila.total}/135</div>
                      <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-green-700" />
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {ordenadas.length} familias · deslizá para ver todas
            </p>
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
