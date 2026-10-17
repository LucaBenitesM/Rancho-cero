"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import UserMenu from "@/components/user-menu";

// Pantalla de sesión del equipo de Cireneos. Es el punto de entrada del login
// (necesario para cargar visitas). No tiene un "panel" de métricas: eso vive en
// el ranking y la campaña.
function SesionIniciada() {
  const user = useQuery(api.auth.getCurrentUser);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700/10 text-teal-700">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h1 className="mt-3 text-lg font-semibold">Sesión iniciada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.email ? (
            <>Conectado como <span className="font-medium">{user.email}</span></>
          ) : (
            "Ya podés cargar visitas y revisar casos."
          )}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/nueva-visita"
            className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800"
          >
            Cargar nueva visita
          </Link>
          <Link
            href="/ranking"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Ver ranking
          </Link>
        </div>

        <div className="mt-5 border-t border-border/60 pt-4">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [showSignIn, setShowSignIn] = useState(true);

  return (
    <>
      <Authenticated>
        <SesionIniciada />
      </Authenticated>
      <Unauthenticated>
        <div className="mx-auto w-full max-w-md px-4 py-10">
          <div className="mb-4 flex items-center justify-center gap-2 text-teal-700 dark:text-teal-400">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-medium">Acceso del equipo de Cireneos</span>
          </div>
          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-700" />
          <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
        </div>
      </AuthLoading>
    </>
  );
}
