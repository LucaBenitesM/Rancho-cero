"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";

import { FichaCaso } from "@/components/ficha-caso";

function colorPuntaje(p: number): string {
  if (p >= 70) return "text-red-500";
  if (p >= 45) return "text-orange-500";
  if (p >= 25) return "text-yellow-500";
  return "text-green-600";
}

export default function RankingPage() {
  // El ranking se calcula en el backend (Convex) con la fórmula en código.
  const filas = useQuery(api.casos.ranking);
  const [abierto, setAbierto] = useState<Id<"casos"> | null>(null);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Ranking de urgencia</h1>
        <p className="text-xs text-muted-foreground">
          Familias ordenadas por puntaje. Tocá una para ver su ficha completa.
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Datos simulados · puntaje calculado en Convex (FICHA.md)
        </p>
      </header>

      {filas === undefined ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando ranking…</p>
      ) : filas.length === 0 ? (
        <div className="rounded-none border bg-card p-4 text-center text-sm text-muted-foreground">
          No hay casos cargados todavía. Corré{" "}
          <code className="text-xs">npx convex run casos:seed</code> en{" "}
          <code className="text-xs">packages/backend</code>.
        </div>
      ) : (
        <ol className="space-y-2">
          {filas.map((fila, i) => (
            <li key={fila.id}>
              <button
                type="button"
                onClick={() => setAbierto(fila.id as Id<"casos">)}
                className="flex w-full items-center gap-3 rounded-none border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Abrir ficha de ${fila.alias}, puesto ${i + 1}, puntaje ${fila.puntajeFinal}`}
              >
                <div className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground tabular-nums">
                  {i + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{fila.alias}</span>
                    <span className="truncate text-xs text-muted-foreground">· {fila.barrio}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {fila.explicacion}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <div
                    className={`text-xl font-bold tabular-nums ${colorPuntaje(fila.puntajeFinal)}`}
                  >
                    {fila.puntajeFinal}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    base {fila.base}
                    {fila.espera > 0 ? ` · +${fila.espera}` : ""}
                    {fila.ajusteAplicado !== 0
                      ? ` · ${fila.ajusteAplicado > 0 ? "+" : ""}${Math.round(
                          fila.ajusteAplicado * 100,
                        )}%`
                      : ""}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}

      {abierto && <FichaCaso id={abierto} onClose={() => setAbierto(null)} />}
    </div>
  );
}
