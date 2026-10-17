import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";

// Roles del equipo de Cireneos. Todo usuario con sesión es voluntario, salvo
// los emails de la variable de entorno COORDINADORES (separados por coma).
// Se carga con: npx convex env set COORDINADORES "a@x.org,b@x.org"

export type Rol = "coordinador" | "voluntario";

type Ctx = QueryCtx | MutationCtx | ActionCtx;

function emailsCoordinadores(): Set<string> {
  const lista = process.env.COORDINADORES ?? "";
  return new Set(
    lista
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Rol del usuario actual, o null si no hay sesión. Sirve en queries,
 *  mutations y actions (el email viene en el token de Better Auth). */
export async function obtenerRol(ctx: Ctx): Promise<Rol | null> {
  const identidad = await ctx.auth.getUserIdentity();
  if (!identidad) return null;
  const email = (identidad.email ?? "").trim().toLowerCase();
  return email && emailsCoordinadores().has(email) ? "coordinador" : "voluntario";
}

/** Exige sesión (cualquier rol). Devuelve el rol. */
export async function requerirSesion(ctx: Ctx): Promise<Rol> {
  const rol = await obtenerRol(ctx);
  if (!rol) throw new Error("Necesitás iniciar sesión.");
  return rol;
}

/** Exige rol coordinador. `mensaje` explica qué se intentó hacer. */
export async function requerirCoordinador(
  ctx: Ctx,
  mensaje = "Solo los coordinadores pueden hacer esto.",
): Promise<void> {
  const rol = await requerirSesion(ctx);
  if (rol !== "coordinador") throw new Error(mensaje);
}

/** Rol del usuario logueado: "coordinador", "voluntario" o null sin sesión. */
export const miRol = query({
  args: {},
  handler: async (ctx) => await obtenerRol(ctx),
});
