"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const ROLES = [
  {
    href: "/dashboard",
    titulo: "Soy coordinador",
    desc: "Reviso el ranking, acepto ajustes y apruebo historias.",
  },
  {
    href: "/dashboard",
    titulo: "Soy voluntario",
    desc: "Cargo visitas con fotos y audio, y reviso lo que la IA marcó como dudoso.",
  },
  {
    href: "/ranking",
    titulo: "Ver el ranking",
    desc: "Las familias relevadas, priorizadas por urgencia según la tabla de Cireneos.",
  },
] as const;

const IMPACTO = [
  { valor: "1 de 2", detalle: "niños crecen en hogares con precariedad habitacional" },
  { valor: "18 campos", detalle: "evalúa la ficha para priorizar cada vivienda" },
  { valor: "100", detalle: "hogares como meta del programa Rancho Cero" },
] as const;

export default function Home() {
  const healthCheck = useQuery(api.healthCheck.get);
  const conectado = healthCheck === "OK";

  return (
    <div className="min-h-full bg-background">
      {/* Hero con imagen de fondo del rancho */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* Imagen de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-rancho.svg')" }}
          aria-hidden
        />
        {/* Velo verde para legibilidad del texto */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-green-950/85 via-green-900/70 to-green-800/55"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-5xl px-6 py-20 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-green-200">
            Cireneos · Uruguay
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
            Por un Uruguay con vivienda digna.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-green-50/90">
            El voluntario toma fotos y graba un audio de la visita; nuestra herramienta lo convierte
            en un caso completo, priorizado y listo para buscar financiamiento. La tecnología
            propone, las personas deciden.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-500"
            >
              Ingresar al equipo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/ranking"
              className="inline-flex items-center gap-2 rounded-md border border-white/40 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Ver el ranking de urgencia
            </Link>
          </div>
        </div>
      </section>

      {/* Franja de impacto */}
      <section className="border-b border-border/60 bg-green-50/40 dark:bg-transparent">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 divide-y divide-border/60 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {IMPACTO.map((it) => (
            <div key={it.detalle} className="py-8 sm:px-8 sm:first:pl-0 sm:last:pr-0">
              <div className="text-3xl font-semibold tracking-tight text-green-800 dark:text-green-400">
                {it.valor}
              </div>
              <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{it.detalle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Cómo participás
        </h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border/60 bg-border/60 sm:grid-cols-3">
          {ROLES.map(({ href, titulo, desc }) => (
            <Link
              key={titulo}
              href={href}
              className="group flex flex-col bg-card p-6 transition-colors hover:bg-green-50/60 dark:hover:bg-green-950/20"
            >
              <h3 className="flex items-center justify-between text-base font-medium">
                {titulo}
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-green-700" />
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>La IA propone, las personas deciden · datos simulados para la demo</span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                conectado
                  ? "bg-green-600"
                  : healthCheck === undefined
                    ? "animate-pulse bg-muted-foreground/50"
                    : "bg-red-500"
              }`}
            />
            {healthCheck === undefined ? "Conectando…" : conectado ? "Sistema conectado" : "Sin conexión"}
          </span>
        </div>
      </section>
    </div>
  );
}
