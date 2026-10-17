import { v } from "convex/values";

import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { createAuth } from "./auth";

// ─────────────────────────────────────────────────────────────
// CREAR CUENTAS — la app no tiene registro público (es interna de Cireneos).
// Las cuentas del equipo se crean desde la terminal:
//
//   npx convex run usuarios:crearCuenta '{"nombre":"...","email":"...","password":"..."}' --prod
//
// Es una internalAction: no se puede llamar desde la web, solo desde la
// terminal (con acceso al deployment) o desde otras funciones de Convex.
// La contraseña nunca se escribe en los logs ni se devuelve.
// ─────────────────────────────────────────────────────────────

const LARGO_MINIMO_PASSWORD = 8;

export const crearCuenta = internalAction({
  args: {
    nombre: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const nombre = args.nombre.trim();
    const email = args.email.trim().toLowerCase();

    if (!nombre) {
      return { ok: false, mensaje: "Falta el nombre." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, mensaje: `El email "${email}" no parece válido.` };
    }
    if (args.password.length < LARGO_MINIMO_PASSWORD) {
      return {
        ok: false,
        mensaje: `La contraseña tiene que tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`,
      };
    }

    const existente = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", value: email }],
    });
    if (existente) {
      return { ok: false, mensaje: `Ya existe un usuario con el email ${email}. No se creó otro.` };
    }

    try {
      const auth = createAuth(ctx);
      const resultado = await auth.api.signUpEmail({
        body: { name: nombre, email, password: args.password },
      });
      console.log(`Cuenta creada: ${email}`);
      return {
        ok: true,
        mensaje: `Cuenta creada para ${nombre} (${email}).`,
        userId: resultado.user.id,
      };
    } catch (err) {
      // Solo el mensaje del error: nunca los argumentos (tienen la contraseña).
      const detalle = err instanceof Error ? err.message : "error desconocido";
      console.error(`No se pudo crear la cuenta ${email}: ${detalle}`);
      return { ok: false, mensaje: `No se pudo crear la cuenta: ${detalle}` };
    }
  },
});
