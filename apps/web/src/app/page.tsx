"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { buttonVariants } from "@rancho-cero/ui/components/button";
import { useQuery } from "convex/react";
import { BookOpen, Heart, House } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import Protegida from "@/components/protegida";

// Portada interna: presenta el programa y lleva a la acción principal del rol
// (voluntario -> Nueva visita, coordinador -> Ranking). Sin sesión, va al login.

const PASOS = [
  {
    icono: House,
    titulo: "Visitá",
    texto: "Sacá fotos de la vivienda y grabá un audio con la familia. La IA arma la ficha por vos.",
  },
  {
    icono: Heart,
    titulo: "Priorizá",
    texto: "Cada ficha suma puntaje con la tabla de Cireneos, para llegar primero a quien más lo necesita.",
  },
  {
    icono: BookOpen,
    titulo: "Contá su historia",
    texto: "Una historia anónima y cuidada de cada familia, lista para compartir con quienes donan.",
  },
];

function Inicio() {
  const rol = useQuery(api.roles.miRol);
  const esCoordinador = rol === "coordinador";
  const accion: { href: Route; label: string } = esCoordinador
    ? { href: "/ranking", label: "Ver ranking" }
    : { href: "/nueva-visita", label: "Cargar nueva visita" };

  return (
    <main className="flex-1">
      {/* Portada */}
      <section className="relative isolate flex min-h-[520px] items-end overflow-hidden sm:min-h-[600px] sm:items-center">
        <Image
          src="/imagenes/familia-1.jpg"
          alt="Una familia sonriente sentada en la puerta de su nueva casa de Rancho Cero"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[70%_center]"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/45 to-black/20 sm:bg-gradient-to-r sm:from-black/70 sm:via-black/40 sm:to-black/5"
          aria-hidden
        />
        <div className="mx-auto w-full max-w-6xl px-4 py-12 text-white sm:px-6">
          <div className="max-w-xl">
            <p className="font-heading text-xs font-semibold tracking-[0.25em] text-manteca uppercase">
              Un programa de Cireneos
            </p>
            <h1 className="mt-3 font-pincel text-6xl leading-[0.95] font-normal sm:text-7xl lg:text-8xl">
              Rancho Cero
            </h1>
            <p className="mt-4 font-heading text-xl font-bold sm:text-2xl">
              Por un Uruguay con Rancho Cero
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/90 sm:text-base">
              Acompañamos a cada familia desde la primera visita hasta su nuevo hogar.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href={accion.href} className={buttonVariants({ variant: "acento", size: "lg" })}>
                {accion.label}
              </Link>
              {esCoordinador && (
                <Link
                  href="/nueva-visita"
                  className="text-sm font-semibold text-white underline decoration-manteca decoration-2 underline-offset-4 hover:text-manteca"
                >
                  o cargá una nueva visita
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-oliva text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl">Cómo trabajamos</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-white/80 sm:text-base">
            Tres pasos para que ninguna familia quede esperando.
          </p>
          <ul className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {PASOS.map(({ icono: Icono, titulo, texto }) => (
              <li key={titulo} className="flex flex-col items-center text-center">
                <Icono className="size-16 text-manteca" strokeWidth={1.1} aria-hidden />
                <h3 className="mt-4 font-heading text-lg font-bold tracking-wide uppercase">{titulo}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/85">{texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Foto + frase */}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2 md:gap-12">
        <div className="relative aspect-[3/2] overflow-hidden rounded-3xl shadow-lg">
          <Image
            src="/imagenes/familia-2.jpg"
            alt="Dos niños abrazados y sonriendo frente a una casa de Rancho Cero recién instalada"
            fill
            sizes="(min-width: 768px) 560px, 100vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="font-heading text-xs font-semibold tracking-[0.25em] text-oliva uppercase">
            Cada visita cuenta
          </p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-oliva-oscuro sm:text-3xl">
            Detrás de cada ficha hay una familia
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Lo que cargás en la visita define a quién llegamos primero. Tomate tu tiempo, escuchá y
            registrá con cuidado: así decidimos con justicia.
          </p>
          <Link
            href={accion.href}
            className={`mt-6 ${buttonVariants({ variant: "acento", size: "lg" })}`}
          >
            {accion.label}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <Protegida>
      <Inicio />
    </Protegida>
  );
}
