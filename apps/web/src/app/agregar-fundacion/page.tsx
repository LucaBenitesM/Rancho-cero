"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { agregarFundacion } from "@/lib/fundaciones";

// Alta de una fundación de muestra en el portal relevAI. Se guarda en
// localStorage (demo) y se vuelve al portal. No crea una app real: la tarjeta
// nueva aparece como "Próximamente".
export default function AgregarFundacionPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [lugar, setLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    agregarFundacion({ nombre, lugar, descripcion });
    router.push("/");
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 sm:text-sm";

  return (
    <main className="flex min-h-svh flex-col bg-gradient-to-b from-slate-50 to-blue-50 text-slate-900">
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700"
          >
            <ArrowLeft className="size-4" />
            Volver al portal
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-xl flex-1 px-5 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Agregar fundación</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Sumá una organización al portal relevAI. En esta demo, la fundación aparece como perfil;
          su espacio de trabajo se habilita más adelante.
        </p>

        <form onSubmit={guardar} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label htmlFor="nombre" className="text-sm font-semibold text-slate-700">
              Nombre de la fundación
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Fundación Techo"
              autoComplete="off"
              required
              className={inputCls}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lugar" className="text-sm font-semibold text-slate-700">
              Lugar
            </label>
            <input
              id="lugar"
              type="text"
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="Ej.: Montevideo, Uruguay"
              autoComplete="off"
              className={inputCls}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="descripcion" className="text-sm font-semibold text-slate-700">
              Descripción
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="¿A qué se dedica la fundación?"
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 sm:text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
              disabled={!nombre.trim()}
            >
              Agregar al portal
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
