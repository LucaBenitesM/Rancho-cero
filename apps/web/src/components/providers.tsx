"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Toaster } from "@rancho-cero/ui/components/sonner";
import { ConvexReactClient } from "convex/react";

import { authClient } from "@/lib/auth-client";

import { ENV } from "../env";
import { ThemeProvider } from "./theme-provider";

// Fallback a process.env cuando varlock no inyecta el ENV (ver auth-server.ts).
const convexUrl = ENV.NEXT_PUBLIC_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || "";

const convex = new ConvexReactClient(convexUrl);

export default function Providers({
  children,
  initialToken,
}: {
  children: React.ReactNode;
  initialToken?: string | null;
}) {
  return (
    // Solo modo claro: la paleta de Cireneos está pensada sobre fondo crema.
    <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
      <ConvexBetterAuthProvider client={convex} authClient={authClient} initialToken={initialToken}>
        {children}
      </ConvexBetterAuthProvider>
      <Toaster richColors theme="light" position="top-center" />
    </ThemeProvider>
  );
}
