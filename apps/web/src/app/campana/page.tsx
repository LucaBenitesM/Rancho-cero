"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, CheckCircle2, Home as HomeIcon, Loader2, Shield } from "lucide-react";
import { useState } from "react";

import { FormularioPago } from "@/components/formulario-pago";

// Montos de donación en pesos uruguayos (modo demo).
const MONTOS = [2000, 5000, 10000, 20000];

function formatoPesos(n: number): string {
  return n.toLocaleString("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 });
}

export default function CampanaPage() {
  const campana = useQuery(api.campanas.obtenerActiva);
  const donar = useMutation(api.campanas.donar);
  const [ultimaDonacion, setUltimaDonacion] = useState<number | null>(null);
  // Monto elegido que abre el formulario de pago (null = cerrado).
  const [montoPago, setMontoPago] = useState<number | null>(null);

  // Confirmación desde el formulario de pago: solo llega el monto (los datos de
  // tarjeta nunca salen del formulario). Registra la donación como hasta ahora.
  async function confirmarDonacion(monto: number) {
    if (!campana) return;
    await donar({ campanaId: campana.id, montoUsd: monto });
    setUltimaDonacion(monto);
    setMontoPago(null);
  }

  if (campana === undefined) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-green-700" />
        <p className="mt-2 text-sm text-muted-foreground">Cargando campaña…</p>
      </div>
    );
  }

  if (campana === null) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          No hay ninguna campaña activa.
          <br />
          Corré <code className="text-xs">npx convex run campanas:seed</code> en{" "}
          <code className="text-xs">packages/backend</code>.
        </div>
      </div>
    );
  }

  const progreso = Math.min(100, (campana.recaudadoUsd / campana.metaUsd) * 100);
  const falta = Math.max(0, campana.metaUsd - campana.recaudadoUsd);

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        {/* Encabezado de sección */}
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-green-700 dark:text-green-500">
          Campaña pública
        </p>

        {/* Tarjeta principal */}
        <article className="mt-4 overflow-hidden rounded-lg border border-border/60 bg-card">
          {/* Imagen genérica */}
          <div className="relative flex aspect-[16/9] w-full items-center justify-center bg-muted">
            <HomeIcon className="h-14 w-14 text-muted-foreground/40" strokeWidth={1.25} />
            <span className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground">
              imagen genérica · sin rasgos identificables
            </span>
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-2.5 py-1 text-[11px] font-medium text-green-700 dark:text-green-400">
              <BadgeCheck className="h-3.5 w-3.5" />
              Historia aprobada
            </span>
          </div>

          <div className="p-6">
            <h1 className="text-2xl font-semibold tracking-tight">{campana.titulo}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{campana.barrio}</p>

            {/* Historia */}
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/80">{campana.historia}</p>

            {/* Meta + progreso */}
            <div className="mt-7">
              <div className="mb-2.5 flex items-end justify-between">
                <div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatoPesos(campana.recaudadoUsd)}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    de <span className="font-medium text-foreground">{formatoPesos(campana.metaUsd)}</span> · costo de una casa container
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold tabular-nums text-green-800 dark:text-green-400">
                    {Math.round(progreso)}%
                  </div>
                  {!campana.financiado && (
                    <div className="text-[10px] text-muted-foreground">
                      faltan {formatoPesos(falta)}
                    </div>
                  )}
                </div>
              </div>

              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={Math.round(progreso)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso de la campaña"
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    campana.financiado ? "bg-green-600" : "bg-green-700 dark:bg-green-500"
                  }`}
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>

            {/* Donar / meta alcanzada */}
            {campana.financiado ? (
              <div className="mt-6 rounded-lg border border-green-600/30 bg-green-50/60 p-5 text-center dark:bg-green-950/20">
                <CheckCircle2 className="mx-auto h-7 w-7 text-green-700 dark:text-green-400" />
                <div className="mt-2 text-sm font-medium text-green-800 dark:text-green-300">
                  Meta alcanzada
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  La campaña llegó a {formatoPesos(campana.metaUsd)}. El caso pasa a estado{" "}
                  <span className="font-medium">financiado</span>.
                </p>
              </div>
            ) : (
              <div className="mt-6 border-t border-border/60 pt-6">
                <div className="mb-3 text-sm font-medium">Elegí un monto para donar</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {MONTOS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMontoPago(m)}
                      className="rounded-md border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:border-green-700 hover:bg-green-700 hover:text-white dark:hover:border-green-500 dark:hover:bg-green-600"
                    >
                      {formatoPesos(m)}
                    </button>
                  ))}
                </div>
                {ultimaDonacion !== null && (
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    ¡Gracias! Sumaste {formatoPesos(ultimaDonacion)} (simulado).
                  </p>
                )}
              </div>
            )}
          </div>
        </article>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
          <Shield className="h-3 w-3" />
          Modo demo · sin pagos reales · los datos de tarjeta no se guardan
        </p>
      </div>

      {/* Formulario de pago (demo): se abre al elegir un monto. */}
      {montoPago !== null && (
        <FormularioPago
          monto={montoPago}
          onCerrar={() => setMontoPago(null)}
          onConfirmar={confirmarDonacion}
        />
      )}
    </div>
  );
}
