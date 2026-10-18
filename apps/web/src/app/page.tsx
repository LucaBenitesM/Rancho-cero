"use client";

import { ArrowRight, Plus, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { leerFundaciones, type Fundacion } from "@/lib/fundaciones";

// Portal relevAI: la capa "madre" (azul y blanco). Muestra los perfiles de las
// fundaciones. Cireneos ya viene cargada y abre la app Rancho Cero; se pueden
// agregar fundaciones de muestra. Esta pantalla no requiere sesión.

export default function RelevaiPortal() {
  // Se lee en el cliente para incluir las fundaciones guardadas en localStorage.
  const [fundaciones, setFundaciones] = useState<Fundacion[]>([]);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setFundaciones(leerFundaciones());
    setMontado(true);
  }, []);

  return (
    <main className="flex min-h-svh flex-col bg-gradient-to-b from-slate-50 to-blue-50 text-slate-900">
      {/* Barra superior */}
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Logo />
          <Link
            href="/agregar-fundacion"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="size-4" />
            Agregar fundación
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-5xl px-5 pt-14 pb-8 text-center sm:pt-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Sparkles className="size-3.5" />
          Relevamiento asistido por IA
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Una plataforma, muchas fundaciones
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          relevAI reúne a las organizaciones sociales y les da herramientas para relevar, priorizar
          y decidir con datos. Elegí una fundación para entrar a su espacio de trabajo.
        </p>
      </section>

      {/* Grilla de fundaciones */}
      <section className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Fundaciones
          </h2>
          {montado && (
            <span className="text-xs text-slate-400">
              {fundaciones.length} {fundaciones.length === 1 ? "fundación" : "fundaciones"}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fundaciones.map((f) => (
            <TarjetaFundacion key={f.id} fundacion={f} />
          ))}

          {/* Tarjeta para agregar */}
          <Link
            href="/agregar-fundacion"
            className="group flex min-h-[172px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-white/50 p-6 text-center transition-colors hover:border-blue-400 hover:bg-white"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <Plus className="size-5" />
            </span>
            <span className="text-sm font-semibold text-slate-700">Agregar fundación</span>
            <span className="text-xs text-slate-400">Sumá una organización al portal</span>
          </Link>
        </div>
      </section>

      {/* Pie */}
      <footer className="border-t border-blue-100 bg-white/70">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row">
          <Logo pequeno />
          <p>Plataforma de relevamiento y priorización para fundaciones.</p>
        </div>
      </footer>
    </main>
  );
}

function TarjetaFundacion({ fundacion }: { fundacion: Fundacion }) {
  const activa = Boolean(fundacion.ruta);

  const cuerpo = (
    <>
      <div className="flex items-start gap-3">
        {fundacion.logo ? (
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <Image
              src={fundacion.logo}
              alt={`Logo de ${fundacion.nombre}`}
              width={48}
              height={48}
              className="size-full object-contain p-0.5"
            />
          </span>
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-base font-bold text-white shadow-sm">
            {fundacion.iniciales}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            {fundacion.nombre}
            {fundacion.fija && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                Activa
              </span>
            )}
          </h3>
          <p className="text-xs font-medium text-slate-400">{fundacion.lugar}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
        {fundacion.descripcion}
      </p>
      <div className="mt-4 flex items-center justify-between">
        {activa ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition-transform group-hover:gap-2">
            Entrar <ArrowRight className="size-4" />
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
            Próximamente
          </span>
        )}
      </div>
    </>
  );

  if (activa && fundacion.ruta) {
    return (
      <Link
        href={fundacion.ruta as "/cireneos"}
        className="group flex min-h-[172px] flex-col rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
      >
        {cuerpo}
      </Link>
    );
  }

  return (
    <div className="flex min-h-[172px] cursor-default flex-col rounded-2xl border border-slate-100 bg-white/60 p-5 opacity-80">
      {cuerpo}
    </div>
  );
}

// Logotipo tipográfico de relevAI (sin assets): "relev" + "AI" destacado.
function Logo({ pequeno = false }: { pequeno?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="relevAI, inicio">
      <span
        className={`flex items-center justify-center rounded-lg bg-blue-600 font-bold text-white ${
          pequeno ? "size-6 text-xs" : "size-8 text-sm"
        }`}
      >
        r
      </span>
      <span className={`font-bold tracking-tight text-slate-900 ${pequeno ? "text-sm" : "text-xl"}`}>
        relev<span className="text-blue-600">AI</span>
      </span>
    </Link>
  );
}
