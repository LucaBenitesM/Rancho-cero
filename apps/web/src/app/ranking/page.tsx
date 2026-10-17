"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ChevronRight, Info, ListOrdered, MapPin, TrendingUp } from "lucide-react";
import { useState } from "react";

import { FichaCaso } from "@/components/ficha-caso";

// Color del puntaje según severidad (rojo = más urgente).
function tonoPuntaje(p: number): { text: string; bar: string; chip: string } {
  if (p >= 90) return { text: "text-red-600 dark:text-red-400", bar: "bg-red-500", chip: "bg-red-500/10 text-red-700 dark:text-red-400" };
  if (p >= 65) return { text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500", chip: "bg-orange-500/10 text-orange-700 dark:text-orange-400" };
  if (p >= 40) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-500" };
  return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" };
}

const MEDALLAS = ["🥇", "🥈", "🥉"];

export default function RankingPage() {
  const filas = useQuery(api.casos.ranking);
  const [abierto, setAbierto] = useState<Id<"casos"> | null>(null);
  const maxFinal = filas && filas.length > 0 ? Math.max(...filas.map((f) => f.puntajeFinal)) : 100;

  return (
    <div className="min-h-full bg-gradient-to-b from-amber-50/40 to-background dark:from-amber-950/10">
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {/* Encabezado */}
        <header className="mb-6">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
              <ListOrdered className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Ranking de urgencia</h1>
              <p className="text-xs text-muted-foreground">
                Familias priorizadas por la tabla de Cireneos
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>
              Datos simulados · puntaje calculado en código (FICHA.md), no por la IA. Tocá una
              familia para ver su ficha.
            </span>
          </div>
        </header>

        {filas === undefined ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-border/60 bg-muted/40"
              />
            ))}
          </div>
        ) : filas.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
            No hay casos cargados todavía.
            <br />
            Corré <code className="text-xs">npx convex run casos:seed</code> en{" "}
            <code className="text-xs">packages/backend</code>.
          </div>
        ) : (
          <ol className="space-y-2.5">
            {filas.map((fila, i) => {
              const tono = tonoPuntaje(fila.puntajeFinal);
              const ancho = Math.max(4, (fila.puntajeFinal / maxFinal) * 100);
              return (
                <li key={fila.id}>
                  <button
                    type="button"
                    onClick={() => setAbierto(fila.id as Id<"casos">)}
                    className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                    aria-label={`Abrir ficha de ${fila.alias}, puesto ${i + 1}, puntaje ${fila.puntajeFinal}`}
                  >
                    {/* Puesto / medalla */}
                    <div className="flex w-9 shrink-0 flex-col items-center">
                      {i < 3 ? (
                        <span className="text-xl leading-none">{MEDALLAS[i]}</span>
                      ) : (
                        <span className="text-base font-bold text-muted-foreground tabular-nums">
                          {i + 1}
                        </span>
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
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                            <TrendingUp className="h-2.5 w-2.5" />
                            {fila.ajusteAplicado > 0 ? "+" : ""}
                            {Math.round(fila.ajusteAplicado * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Barra de puntaje */}
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${tono.bar} transition-all`}
                          style={{ width: `${ancho}%` }}
                        />
                      </div>

                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {fila.explicacion}
                      </p>
                    </div>

                    {/* Puntaje */}
                    <div className="flex shrink-0 flex-col items-end">
                      <div className={`text-2xl font-bold tabular-nums ${tono.text}`}>
                        {fila.puntajeFinal}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {fila.total}/135 pts
                      </div>
                      <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-600" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {abierto && <FichaCaso id={abierto} onClose={() => setAbierto(null)} />}
    </div>
  );
}
