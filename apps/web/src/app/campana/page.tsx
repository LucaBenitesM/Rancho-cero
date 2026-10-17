"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { Button } from "@rancho-cero/ui/components/button";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

// Montos de donación simulada (sin pagos reales).
const MONTOS = [50, 100, 250, 500];

function formatoUsd(n: number): string {
  return n.toLocaleString("es-UY", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function CampanaPage() {
  const campana = useQuery(api.campanas.obtenerActiva);
  const donar = useMutation(api.campanas.donar);
  const [ultimaDonacion, setUltimaDonacion] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleDonar(monto: number) {
    if (!campana) return;
    setEnviando(true);
    try {
      await donar({ campanaId: campana.id, montoUsd: monto });
      setUltimaDonacion(monto);
    } finally {
      setEnviando(false);
    }
  }

  if (campana === undefined) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8 text-center text-sm text-muted-foreground">
        Cargando campaña…
      </div>
    );
  }

  if (campana === null) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8">
        <div className="rounded-none border bg-card p-4 text-center text-sm text-muted-foreground">
          No hay ninguna campaña activa. Corré{" "}
          <code className="text-xs">npx convex run campanas:seed</code> en{" "}
          <code className="text-xs">packages/backend</code>.
        </div>
      </div>
    );
  }

  const progreso = Math.min(100, (campana.recaudadoUsd / campana.metaUsd) * 100);
  const falta = Math.max(0, campana.metaUsd - campana.recaudadoUsd);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-4">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">{campana.titulo}</h1>
        <p className="text-xs text-muted-foreground">{campana.barrio} · campaña pública</p>
      </header>

      {/* Imagen genérica (sin rasgos identificables) */}
      <div className="mb-4 flex aspect-video w-full items-center justify-center rounded-none border bg-gradient-to-br from-muted to-muted/40 text-muted-foreground">
        <span className="text-xs">imagen genérica · sin rasgos identificables</span>
      </div>

      {/* Historia anónima aprobada */}
      <section className="mb-5 rounded-none border bg-card p-4 text-card-foreground">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-green-600">
            ● Historia {campana.historiaAprobada ? "aprobada" : "pendiente"}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{campana.historia}</p>
      </section>

      {/* Meta + barra de progreso */}
      <section className="mb-5">
        <div className="mb-1.5 flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold tabular-nums">
              {formatoUsd(campana.recaudadoUsd)}
            </div>
            <div className="text-xs text-muted-foreground">
              de {formatoUsd(campana.metaUsd)} (costo de una casa container)
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold tabular-nums">{Math.round(progreso)}%</div>
            {!campana.financiado && (
              <div className="text-[10px] text-muted-foreground">faltan {formatoUsd(falta)}</div>
            )}
          </div>
        </div>

        <div
          className="h-3 w-full overflow-hidden rounded-none border bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progreso)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de la campaña"
        >
          <div
            className={`h-full transition-all duration-500 ease-out ${
              campana.financiado ? "bg-green-500" : "bg-primary"
            }`}
            style={{ width: `${progreso}%` }}
          />
        </div>
      </section>

      {/* Donar (simulado) */}
      {campana.financiado ? (
        <div className="rounded-none border border-green-500/40 bg-green-500/10 p-4 text-center">
          <div className="text-sm font-semibold text-green-700 dark:text-green-400">
            ¡Meta alcanzada! 🎉
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            La campaña llegó a {formatoUsd(campana.metaUsd)}. El caso pasa a estado{" "}
            <span className="font-medium">financiado</span>.
          </p>
        </div>
      ) : (
        <section className="rounded-none border bg-card p-4">
          <div className="mb-2 text-xs font-medium">Elegí un monto para donar</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MONTOS.map((m) => (
              <Button
                key={m}
                variant="outline"
                disabled={enviando}
                onClick={() => handleDonar(m)}
              >
                Donar {formatoUsd(m)}
              </Button>
            ))}
          </div>
          {ultimaDonacion !== null && (
            <p className="mt-2 text-center text-xs text-green-600">
              ¡Gracias! Sumaste {formatoUsd(ultimaDonacion)} (simulado).
            </p>
          )}
        </section>
      )}

      <p className="mt-4 text-center text-[10px] text-muted-foreground">
        Datos simulados · sin pagos reales · el botón suma a la campaña en Convex
      </p>
    </div>
  );
}
