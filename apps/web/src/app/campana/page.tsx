"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, CheckCircle2, Heart, Home as HomeIcon, Loader2, Shield } from "lucide-react";
import { useState } from "react";

const MONTOS = [50, 100, 250, 500];

function formatoUsd(n: number): string {
  return n.toLocaleString("es-UY", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function CampanaPage() {
  const campana = useQuery(api.campanas.obtenerActiva);
  const donar = useMutation(api.campanas.donar);
  const [ultimaDonacion, setUltimaDonacion] = useState<number | null>(null);
  const [enviando, setEnviando] = useState<number | null>(null);

  async function handleDonar(monto: number) {
    if (!campana) return;
    setEnviando(monto);
    try {
      await donar({ campanaId: campana.id, montoUsd: monto });
      setUltimaDonacion(monto);
    } finally {
      setEnviando(null);
    }
  }

  if (campana === undefined) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-600" />
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
    <div className="min-h-full bg-gradient-to-b from-amber-50/40 to-background dark:from-amber-950/10">
      <div className="mx-auto w-full max-w-xl px-4 py-6">
        {/* Tarjeta principal */}
        <article className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
          {/* Imagen genérica */}
          <div className="relative flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600">
            <HomeIcon className="h-16 w-16 text-white/90" strokeWidth={1.5} />
            <span className="absolute bottom-2 right-3 text-[10px] text-white/70">
              imagen genérica · sin rasgos identificables
            </span>
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-amber-700 shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5" />
              Historia aprobada
            </span>
          </div>

          <div className="p-5">
            <h1 className="text-xl font-bold tracking-tight">{campana.titulo}</h1>
            <p className="text-xs text-muted-foreground">{campana.barrio} · campaña pública</p>

            {/* Historia */}
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">{campana.historia}</p>

            {/* Meta + progreso */}
            <div className="mt-5">
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {formatoUsd(campana.recaudadoUsd)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    de <span className="font-medium">{formatoUsd(campana.metaUsd)}</span> · una
                    casa container
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-500">
                    {Math.round(progreso)}%
                  </div>
                  {!campana.financiado && (
                    <div className="text-[10px] text-muted-foreground">
                      faltan {formatoUsd(falta)}
                    </div>
                  )}
                </div>
              </div>

              <div
                className="h-3 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={Math.round(progreso)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso de la campaña"
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    campana.financiado
                      ? "bg-emerald-500"
                      : "bg-gradient-to-r from-amber-500 to-orange-600"
                  }`}
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>

            {/* Donar / meta alcanzada */}
            {campana.financiado ? (
              <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <div className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  ¡Meta alcanzada! 🎉
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  La campaña llegó a {formatoUsd(campana.metaUsd)}. El caso pasa a estado{" "}
                  <span className="font-medium">financiado</span>.
                </p>
              </div>
            ) : (
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
                  <Heart className="h-3.5 w-3.5 text-amber-600" />
                  Elegí un monto para donar
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {MONTOS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={enviando !== null}
                      onClick={() => handleDonar(m)}
                      className="flex items-center justify-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-sm font-semibold text-amber-700 transition-all hover:-translate-y-0.5 hover:bg-amber-500 hover:text-white hover:shadow-md disabled:pointer-events-none disabled:opacity-50 dark:text-amber-400 dark:hover:text-white"
                    >
                      {enviando === m ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        formatoUsd(m)
                      )}
                    </button>
                  ))}
                </div>
                {ultimaDonacion !== null && (
                  <p className="mt-2.5 flex items-center justify-center gap-1 text-center text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    ¡Gracias! Sumaste {formatoUsd(ultimaDonacion)} (simulado).
                  </p>
                )}
              </div>
            )}
          </div>
        </article>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
          <Shield className="h-3 w-3" />
          Datos simulados · sin pagos reales · el botón suma a la campaña en Convex
        </p>
      </div>
    </div>
  );
}
