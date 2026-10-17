"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ChevronRight, Info, ListOrdered, MapPin, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { FichaCaso } from "@/components/ficha-caso";

type Orden = "prioridad" | "cercania" | "alfabetico";

const OPCIONES_ORDEN: { id: Orden; label: string }[] = [
  { id: "prioridad", label: "Prioridad" },
  { id: "cercania", label: "Cercanía" },
  { id: "alfabetico", label: "A–Z" },
];

// Color del puntaje según severidad (rojo = más urgente, verde = menos).
function tonoPuntaje(p: number): { text: string; bar: string } {
  if (p >= 90) return { text: "text-red-600 dark:text-red-400", bar: "bg-red-500" };
  if (p >= 65) return { text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500" };
  if (p >= 40) return { text: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-600" };
  return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-400" };
}

export default function RankingPage() {
  const filas = useQuery(api.casos.ranking);
  const [abierto, setAbierto] = useState<Id<"casos"> | null>(null);
  const [orden, setOrden] = useState<Orden>("prioridad");

  const ordenadas = useMemo(() => {
    if (!filas) return filas;
    const copia = [...filas];
    if (orden === "prioridad") copia.sort((a, b) => b.puntajeFinal - a.puntajeFinal);
    else if (orden === "alfabetico") copia.sort((a, b) => a.alias.localeCompare(b.alias, "es"));
    else if (orden === "cercania")
      // Sin coordenadas reales: agrupamos por barrio y dentro por prioridad.
      copia.sort(
        (a, b) => a.barrio.localeCompare(b.barrio, "es") || b.puntajeFinal - a.puntajeFinal,
      );
    return copia;
  }, [filas, orden]);

  const maxFinal =
    filas && filas.length > 0 ? Math.max(...filas.map((f) => f.puntajeFinal)) : 100;

  return (
    <div className="min-h-full bg-emerald-50/30 dark:bg-transparent">
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {/* Encabezado */}
        <header className="mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <ListOrdered className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Ranking de urgencia</h1>
              <p className="text-xs text-muted-foreground">
                Familias priorizadas por la tabla de Cireneos
              </p>
            </div>
          </div>
        </header>

        {/* Barra de orden */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Ordenar por</span>
          <div className="inline-flex rounded-lg border border-border/70 bg-card p-0.5">
            {OPCIONES_ORDEN.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setOrden(op.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  orden === op.id
                    ? "bg-emerald-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nota */}
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
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
                    className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left transition-all hover:border-emerald-500/50 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:outline-none"
                    aria-label={`Abrir ficha de ${fila.alias}, puntaje ${fila.puntajeFinal}`}
                  >
                    {/* Puesto */}
                    <div className="flex w-7 shrink-0 justify-center">
                      {puesto !== null ? (
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            puesto <= 3
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {puesto}
                        </span>
                      ) : (
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Identidad + barra + explicación */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{fila.alias}</span>
                        <span className="flex items-center gap-0.5 truncate text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {fila.barrio}
                        </span>
                        {fila.ajusteAplicado !== 0 && (
                          <span className="flex items-center gap-0.5 rounded-full bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                            <TrendingUp className="h-2.5 w-2.5" />
                            {fila.ajusteAplicado > 0 ? "+" : ""}
                            {Math.round(fila.ajusteAplicado * 100)}%
                          </span>
                        )}
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
                      <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
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
