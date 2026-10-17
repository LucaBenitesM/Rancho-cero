// ─────────────────────────────────────────────────────────────
// RANCHO CERO — Campaña pública (meta US$ 15.000, pagos SIMULADOS)
//
// - seed:         crea una historia anónima aprobada + su campaña para el
//                 caso de mayor urgencia, si no existe ninguna campaña.
// - obtenerActiva: la campaña pública con su historia y lo recaudado.
// - donar:        suma una donación simulada (sin pagos reales) y actualiza
//                 el recaudado; marca el caso como financiado al llegar a la meta.
// ─────────────────────────────────────────────────────────────

import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { META_CASA_USD } from "./urgencia";

const HISTORIA_TEXTO =
  "Son siete personas bajo un techo de nylon que se llueve con cada tormenta. " +
  "El piso es de tierra y el agua se acarrea desde lejos. Hay chicos y una persona " +
  "que necesita una vivienda accesible. Una casa container de material firme cambia " +
  "por completo el día a día: un techo que no gotea, un piso seco, un baño propio. " +
  "Con tu aporte, esta familia pasa de sobrevivir a tener un hogar.";

/** Crea la campaña de ejemplo (historia aprobada + campaña) si no hay ninguna. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existente = await ctx.db.query("campanas").take(1);
    if (existente.length > 0) {
      return { creada: false, mensaje: "Ya había una campaña." };
    }

    // Elegir el caso de mayor urgencia entre los que ya están confirmados
    // (incluye en campaña / financiados, por si se re-corre).
    const estados = ["confirmado", "en_campana", "financiado"] as const;
    const grupos = await Promise.all(
      estados.map((e) =>
        ctx.db.query("casos").withIndex("por_estado", (q) => q.eq("estado", e)).collect(),
      ),
    );
    const casos = grupos.flat();
    if (casos.length === 0) {
      return { creada: false, mensaje: "No hay casos; corré casos.seed primero." };
    }
    casos.sort((a, b) => (b.puntajeFinal ?? 0) - (a.puntajeFinal ?? 0));
    const caso = casos[0];

    const historiaId = await ctx.db.insert("historias", {
      casoId: caso._id,
      textoOriginal: HISTORIA_TEXTO,
      textoRevisado: HISTORIA_TEXTO,
      aprobada: true,
    });

    await ctx.db.insert("campanas", {
      casoId: caso._id,
      historiaId,
      metaUsd: META_CASA_USD,
      recaudadoUsd: 6200, // monto inicial simulado
      activa: true,
    });

    await ctx.db.patch(caso._id, { estado: "en_campana" });

    return { creada: true, mensaje: "Campaña de ejemplo creada." };
  },
});

/** La campaña pública activa con su historia y lo recaudado. */
export const obtenerActiva = query({
  args: {},
  handler: async (ctx) => {
    const campana = await ctx.db
      .query("campanas")
      .filter((q) => q.eq(q.field("activa"), true))
      .first();
    if (!campana) return null;

    const historia = await ctx.db.get(campana.historiaId);
    const caso = await ctx.db.get(campana.casoId);

    return {
      id: campana._id,
      metaUsd: campana.metaUsd,
      recaudadoUsd: campana.recaudadoUsd,
      financiado: campana.recaudadoUsd >= campana.metaUsd,
      titulo: `Una casa firme para ${caso?.alias ?? "esta familia"}`,
      barrio: caso?.barrio ?? "—",
      historia: historia?.textoRevisado ?? historia?.textoOriginal ?? "",
      historiaAprobada: historia?.aprobada ?? false,
    };
  },
});

/** Suma una donación simulada y avanza el recaudado (sin pagos reales). */
export const donar = mutation({
  args: { campanaId: v.id("campanas"), montoUsd: v.number() },
  handler: async (ctx, { campanaId, montoUsd }) => {
    if (montoUsd <= 0) throw new Error("El monto debe ser positivo.");

    const campana = await ctx.db.get(campanaId);
    if (!campana) throw new Error("Campaña no encontrada.");

    const nuevoRecaudado = Math.min(campana.metaUsd, campana.recaudadoUsd + montoUsd);

    await ctx.db.insert("donaciones", {
      campanaId,
      montoUsd,
      creadoEn: Date.now(),
    });

    await ctx.db.patch(campanaId, { recaudadoUsd: nuevoRecaudado });

    const financiado = nuevoRecaudado >= campana.metaUsd;
    if (financiado) {
      // Al llegar a la meta, el caso pasa a "financiado".
      await ctx.db.patch(campana.casoId, { estado: "financiado" });
      await ctx.db.patch(campanaId, { activa: true });
    }

    return { recaudadoUsd: nuevoRecaudado, financiado };
  },
});

/** Reinicia la demo: vuelve el recaudado al monto inicial y reactiva la campaña.
 *  Tolera que el caso ligado ya no exista (no rompe). */
export const reiniciarDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const campana = await ctx.db.query("campanas").first();
    if (!campana) return { ok: false, mensaje: "No hay campaña." };

    // Borrar donaciones registradas de esta campaña.
    const donaciones = await ctx.db
      .query("donaciones")
      .withIndex("por_campana", (q) => q.eq("campanaId", campana._id))
      .collect();
    for (const d of donaciones) await ctx.db.delete(d._id);

    await ctx.db.patch(campana._id, { recaudadoUsd: 6200, activa: true });

    // Solo tocar el caso si todavía existe (puede haber quedado huérfano tras recargar).
    const caso = await ctx.db.get(campana.casoId);
    if (caso) {
      await ctx.db.patch(campana.casoId, { estado: "en_campana" });
    }

    return { ok: true, mensaje: "Campaña reiniciada a US$ 6.200." };
  },
});

/** Borra campaña, historias y donaciones. Deja la base lista para re-sembrar. */
export const limpiar = mutation({
  args: {},
  handler: async (ctx) => {
    for (const tabla of ["campanas", "historias", "donaciones"] as const) {
      const docs = await ctx.db.query(tabla).collect();
      for (const d of docs) await ctx.db.delete(d._id);
    }
    return { ok: true, mensaje: "Campaña, historias y donaciones borradas." };
  },
});
