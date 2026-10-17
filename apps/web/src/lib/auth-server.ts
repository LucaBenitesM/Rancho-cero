import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

import { ENV } from "../env";

// Fallback a process.env cuando el ENV inyectado por varlock viene vacío
// (p. ej. en esta máquina, donde el wrapper de varlock falla por el espacio
// en la ruta del workspace). Cuando varlock funciona, ENV.* tiene prioridad.
const convexUrl = ENV.NEXT_PUBLIC_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || "";
const convexSiteUrl =
  ENV.NEXT_PUBLIC_CONVEX_SITE_URL || process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "";

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl,
  convexSiteUrl,
});
