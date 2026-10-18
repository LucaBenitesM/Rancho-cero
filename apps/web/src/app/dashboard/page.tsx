"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { buttonVariants } from "@rancho-cero/ui/components/button";
import { cn } from "@rancho-cero/ui/lib/utils";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Cargando } from "@/components/protegida";
import SignInForm from "@/components/sign-in-form";
import UserMenu from "@/components/user-menu";

// Pantalla de sesión del equipo de Cireneos. Es el punto de entrada del login
// (necesario para cargar visitas). No tiene un "panel" de métricas: eso vive en
// el ranking y la campaña. No hay registro: las cuentas del equipo se crean a
// mano (ver PLAN.md).
function SesionIniciada() {
  const user = useQuery(api.auth.getCurrentUser);
  const rol = useQuery(api.roles.miRol);

  return (
    // Foto de fondo con velo oscuro y la tarjeta encima. familia-3.jpg es una
    // captura de la web con la barra de menú arriba: el contenedor arranca por
    // encima de la sección (-top-[18%]) para que esa barra quede afuera.
    <div className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:py-20">
      <div className="absolute inset-x-0 -top-[18%] bottom-0 -z-20">
        <Image
          src="/imagenes/familia-3.jpg"
          alt="Casa de Rancho Cero recién instalada, con niños saludando desde la puerta"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[85%_bottom]"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-black/50" aria-hidden />
      <div className="w-full max-w-md rounded-3xl border border-white/40 bg-card/95 p-7 text-center shadow-2xl backdrop-blur-sm sm:p-8">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-salvia-suave text-oliva">
          <CheckCircle2 className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-oliva-oscuro">Sesión iniciada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.email ? (
            <>Conectado como <span className="font-semibold text-foreground">{user.email}</span></>
          ) : (
            "Ya podés cargar visitas y revisar casos."
          )}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link href="/nueva-visita" className={buttonVariants({ variant: "acento", size: "lg" })}>
            Cargar nueva visita
          </Link>
          {rol === "coordinador" && (
            <Link href="/ranking" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Ver ranking
            </Link>
          )}
        </div>

        <div className="mt-6 border-t border-border/70 pt-5">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}

function Ingreso() {
  return (
    <div className="grid flex-1 md:grid-cols-2">
      {/* Foto: arriba y más chica en el celular, a la izquierda en la compu */}
      <div className="relative isolate h-56 overflow-hidden sm:h-72 md:h-auto md:min-h-[640px]">
        <Image
          src="/imagenes/barrio.jpg"
          alt="Vista aérea de un barrio de casas de Rancho Cero, con techos grises y paredes naranjas"
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="-z-20 object-cover"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/30 to-black/10"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8 md:p-10">
          <p className="font-pincel text-4xl leading-none sm:text-5xl md:text-6xl">Rancho Cero</p>
          <p className="mt-2 font-heading text-sm font-bold sm:text-base md:text-lg">
            Por un Uruguay con Rancho Cero
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8 md:py-16">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/imagenes/logo-cireneos.png"
              alt="Logo de Cireneos"
              width={96}
              height={96}
              className="size-20 rounded-full shadow-md sm:size-24"
            />
            <h1 className="mt-5 text-2xl font-bold text-oliva-oscuro">Te damos la bienvenida</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-oliva" aria-hidden />
              Acceso del equipo de Cireneos
            </p>
          </div>
          <SignInForm />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Authenticated>
        <SesionIniciada />
      </Authenticated>
      <Unauthenticated>
        <Ingreso />
      </Unauthenticated>
      <AuthLoading>
        <Cargando />
      </AuthLoading>
    </>
  );
}
