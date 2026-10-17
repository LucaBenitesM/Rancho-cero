"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const ROLES = [
  {
    href: "/dashboard",
    titulo: "Soy coordinador",
    desc: "Reviso el ranking, acepto ajustes y apruebo historias y campañas.",
  },
  {
    href: "/dashboard",
    titulo: "Soy voluntario",
    desc: "Cargo visitas con fotos y audio, y reviso lo que la IA marcó como dudoso.",
  },
  {
    href: "/campana",
    titulo: "Quiero donar",
    desc: "Conocé las campañas, el impacto y colaborá. No necesitás iniciar sesión.",
  },
] as const;

const IMPACTO = [
  { valor: "1 de 2", detalle: "niños crecen en hogares con precariedad habitacional" },
  { valor: "US$ 15.000", detalle: "cuesta reemplazar una vivienda por una casa digna" },
  { valor: "100", detalle: "hogares como meta del programa Rancho Cero" },
] as const;

export default function Home() {
  const healthCheck = useQuery(api.healthCheck.get);
  const conectado = healthCheck === "OK";

  return (
    <div className="min-h-full bg-background">
      {/* Hero */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-700 dark:text-teal-500">
            Cireneos · Uruguay
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Por un Uruguay con vivienda digna.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            El voluntario toma fotos y graba un audio de la visita; nuestra herramienta lo convierte
            en un caso completo, priorizado y listo para buscar financiamiento. La tecnología
            propone, las personas deciden.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/campana"
              className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-800"
            >
              Quiero colaborar
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/ranking"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Ver el ranking de urgencia
            </Link>
          </div>
        </div>
      </section>

      {/* Franja de impacto */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 divide-y divide-border/60 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {IMPACTO.map((it) => (
            <div key={it.detalle} className="py-8 sm:px-8 sm:first:pl-0 sm:last:pr-0">
              <div className="text-3xl font-semibold tracking-tight text-teal-800 dark:text-teal-400">
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
              className="group flex flex-col bg-card p-6 transition-colors hover:bg-muted/40"
            >
              <h3 className="flex items-center justify-between text-base font-medium">
                {titulo}
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-teal-700" />
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
                  ? "bg-teal-600"
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
