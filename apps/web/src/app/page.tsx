"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Heart,
  HandHeart,
  Home as HomeIcon,
  ListOrdered,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const ROLES = [
  {
    href: "/dashboard",
    icon: ShieldCheck,
    titulo: "Soy coordinador",
    desc: "Reviso el ranking, acepto ajustes y apruebo historias y campañas.",
  },
  {
    href: "/dashboard",
    icon: HandHeart,
    titulo: "Soy voluntario",
    desc: "Cargo visitas con fotos y audio, y reviso lo que la IA marcó como dudoso.",
  },
  {
    href: "/campana",
    icon: Heart,
    titulo: "Quiero donar",
    desc: "Veo campañas e impacto y colaboro. No necesitás iniciar sesión.",
  },
] as const;

export default function Home() {
  const healthCheck = useQuery(api.healthCheck.get);
  const conectado = healthCheck === "OK";

  return (
    <div className="min-h-full bg-emerald-50/30 dark:bg-transparent">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        {/* Hero */}
        <section className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-600/10 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Cireneos · Uruguay · hackathon de IA
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            De una visita a un{" "}
            <span className="text-emerald-700 dark:text-emerald-500">hogar digno</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            El voluntario saca fotos y graba un audio; la IA lo convierte en un caso completo,
            priorizado y listo para buscar financiamiento. Reemplazamos viviendas precarias por
            casas container de <span className="font-semibold text-foreground">US$ 15.000</span>.
          </p>

          {/* Accesos principales */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/ranking"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <ListOrdered className="h-4 w-4" />
              Ver ranking de urgencia
            </Link>
            <Link
              href="/campana"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
            >
              <Heart className="h-4 w-4 text-emerald-600" />
              Ver campaña
            </Link>
          </div>
        </section>

        {/* Tarjetas de rol */}
        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {ROLES.map(({ href, icon: Icon, titulo, desc }) => (
            <Link
              key={titulo}
              href={href}
              className="group flex flex-col rounded-2xl border border-border/60 bg-card p-4 transition-all hover:border-emerald-500/40 hover:shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 flex items-center gap-1 text-sm font-semibold">
                {titulo}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </section>

        {/* Pie: principio + estado */}
        <section className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HomeIcon className="h-3.5 w-3.5 text-emerald-600" />
            La IA propone, las personas deciden · datos simulados
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full ${
                conectado
                  ? "bg-emerald-500"
                  : healthCheck === undefined
                    ? "animate-pulse bg-muted-foreground/50"
                    : "bg-red-500"
              }`}
            />
            {healthCheck === undefined ? "Conectando…" : conectado ? "Backend conectado" : "Sin backend"}
          </span>
        </section>
      </div>
    </div>
  );
}
