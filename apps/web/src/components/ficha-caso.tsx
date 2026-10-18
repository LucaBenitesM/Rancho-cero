"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Download, MapPin, PenLine, Phone, Sparkles, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Agrupación de campos por bloque de la tabla de Cireneos (FICHA.md).
const BLOQUES: { titulo: string; campos: string[] }[] = [
  { titulo: "Materialidad", campos: ["pared", "techo", "piso", "bano"] },
  { titulo: "Habitabilidad", campos: ["m2PorPersona", "ventanas", "separacionAmbientes"] },
  { titulo: "Seguridad y salubridad", campos: ["riesgoDerrumbe", "inundable"] },
  {
    titulo: "Salud y familia",
    campos: ["enfermedad", "menoresDe5", "menores5a12", "menores12a18", "monoparental"],
  },
  {
    titulo: "Dimensión social",
    campos: ["vinculoOrganizacion", "impresionPrimeraVisita", "desalojo", "adicionales"],
  },
];

// Nivel de carencia según la puntuación del campo (1 = mejor, 3 = peor).
// Se muestra como una etiqueta clara, no un punto de color suelto.
function nivelDe(puntos: number, pesoMax: number): {
  texto: string;
  punto: string;
  chip: string;
} {
  // Relativo al máximo del campo (algunos van 0..3, otros 1..3).
  if (puntos >= 3)
    return {
      texto: "Crítico",
      punto: "bg-urgencia-critica",
      chip: "bg-urgencia-critica/12 text-urgencia-critica-texto",
    };
  if (puntos === 2)
    return {
      texto: "Alto",
      punto: "bg-urgencia-alta",
      chip: "bg-urgencia-alta/15 text-urgencia-alta-texto",
    };
  if (puntos === 1)
    return {
      texto: "Medio",
      punto: "bg-urgencia-media",
      chip: "bg-urgencia-media/20 text-urgencia-media-texto",
    };
  return {
    texto: "Sin carencia",
    punto: "bg-urgencia-baja",
    chip: "bg-salvia-suave text-urgencia-baja-texto",
  };
}

interface Aporte {
  campo: string;
  etiqueta: string;
  textoValor: string;
  peso: number;
  puntos: number;
  aporte: number;
}

// Escapa texto para interpolar seguro dentro del HTML del documento A4.
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Arma un documento A4 autónomo con la ficha y lo abre en una ventana nueva
// lista para imprimir / "Guardar como PDF". Sin dependencias externas.
function descargarFichaA4(
  caso: NonNullable<ReturnType<typeof useQuery<typeof api.casos.obtener>>>
) {
  const r = caso.resultado;
  const aportes = r.aportes as Aporte[];
  const porCampo = new Map(aportes.map((a) => [a.campo, a]));
  const fecha = new Date(caso.relevadoEn).toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const nivelTexto = (puntos: number) =>
    puntos >= 3 ? "Crítico" : puntos === 2 ? "Alto" : puntos === 1 ? "Medio" : "Sin carencia";

  const bloquesHtml = BLOQUES.map((bloque) => {
    const filas = bloque.campos
      .map((c) => porCampo.get(c))
      .filter((a): a is Aporte => a !== undefined);
    if (filas.length === 0) return "";
    const subtotal = filas.reduce((acc, a) => acc + a.aporte, 0);
    const maxBloque = filas.reduce((acc, a) => acc + a.peso * 3, 0);
    const filasHtml = filas
      .map(
        (a) => `
        <tr>
          <td class="campo">${esc(a.etiqueta)}</td>
          <td class="valor">${esc(a.textoValor || "—")}</td>
          <td class="nivel">${esc(nivelTexto(a.puntos))}</td>
          <td class="pts">${esc(a.aporte)} / ${esc(a.peso * 3)}</td>
        </tr>`
      )
      .join("");
    return `
      <section class="bloque">
        <div class="bloque-head">
          <h3>${esc(bloque.titulo)}</h3>
          <span>${esc(subtotal)} / ${esc(maxBloque)} pts</span>
        </div>
        <table>
          <thead>
            <tr><th>Campo</th><th>Observación</th><th>Nivel</th><th>Puntaje</th></tr>
          </thead>
          <tbody>${filasHtml}</tbody>
        </table>
      </section>`;
  }).join("");

  const contacto = [
    caso.nombreRepresentante && `<div><span>Referente</span><strong>${esc(caso.nombreRepresentante)}</strong></div>`,
    caso.telefono && `<div><span>Teléfono</span><strong>${esc(caso.telefono)}</strong></div>`,
    caso.direccion && `<div><span>Dirección</span><strong>${esc(caso.direccion)}</strong></div>`,
    caso.barrio && caso.barrio !== "—" && `<div><span>Barrio</span><strong>${esc(caso.barrio)}</strong></div>`,
  ]
    .filter(Boolean)
    .join("");

  const ajusteHtml = caso.ajuste
    ? `<section class="ajuste">
         <h3>Ajuste sugerido por IA (${caso.ajuste.porcentaje > 0 ? "+" : ""}${esc(caso.ajuste.porcentaje)}%) · ${esc(caso.ajuste.estado)}</h3>
         <p>${esc(caso.ajuste.motivo)}</p>
         <p class="ev">${esc(caso.ajuste.evidencia)}</p>
       </section>`
    : "";

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<title>Ficha ${esc(caso.alias)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1F1F1A; margin: 0; }
  .doc { max-width: 180mm; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #545637; padding-bottom: 10px; margin-bottom: 14px; }
  header h1 { font-size: 22px; margin: 0; color: #3b3d26; }
  header .sub { color: #666; font-size: 12px; margin-top: 2px; }
  header .puntaje { text-align: right; }
  header .puntaje b { font-size: 34px; color: #545637; line-height: 1; }
  header .puntaje span { display: block; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #888; }
  .meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 11px; color: #444; margin-bottom: 14px; }
  .meta span { background: #f1efe6; border-radius: 999px; padding: 3px 9px; }
  .contacto { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 18px; background: #faf8f2; border: 1px solid #e4e0d2; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
  .contacto div { font-size: 12px; }
  .contacto span { display: block; color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
  .explicacion { background: #f3f4ea; border-left: 4px solid #8E9460; padding: 10px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 14px; }
  .ajuste { border: 1px solid #e4e0d2; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 12px; }
  .ajuste h3 { margin: 0 0 4px; font-size: 13px; }
  .ajuste .ev { color: #777; font-style: italic; }
  .bloque { margin-bottom: 12px; break-inside: avoid; }
  .bloque-head { display: flex; justify-content: space-between; background: #eef0e4; border-radius: 6px 6px 0 0; padding: 6px 10px; font-size: 12px; font-weight: 700; color: #3b3d26; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 5px 10px; border-bottom: 1px solid #ececec; }
  th { background: #fafafa; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #888; }
  td.pts, th:last-child { text-align: right; white-space: nowrap; }
  footer { margin-top: 16px; border-top: 1px solid #e4e0d2; padding-top: 8px; font-size: 10px; color: #999; text-align: center; }
  @media screen { body { background: #ddd; padding: 20px; } .doc { background: #fff; padding: 16mm; box-shadow: 0 2px 12px rgba(0,0,0,.15); } .print-hint { text-align:center; font-size:12px; color:#555; margin-bottom:12px; } }
  @media print { .print-hint { display: none; } }
</style></head>
<body>
  <div class="print-hint">Usá “Guardar como PDF” en el diálogo de impresión para descargar la ficha.</div>
  <div class="doc">
    <header>
      <div>
        <h1>${esc(caso.alias)}</h1>
        <div class="sub">Ficha de urgencia · Cireneos · Relevado el ${esc(fecha)}</div>
      </div>
      <div class="puntaje"><b>${esc(r.puntajeFinal)}</b><span>Puntaje final</span></div>
    </header>
    <div class="meta">
      <span>Tabla: ${esc(r.total)} / 135</span>
      <span>Base: ${esc(r.base)}</span>
      <span>Espera: +${esc(r.espera)} (${esc(r.mesesEspera)} ${r.mesesEspera === 1 ? "mes" : "meses"})</span>
      <span>Ajuste: ${r.ajusteAplicado === 0 ? "—" : `${r.ajusteAplicado > 0 ? "+" : ""}${Math.round(r.ajusteAplicado * 100)}%`}</span>
    </div>
    ${contacto ? `<div class="contacto">${contacto}</div>` : ""}
    <div class="explicacion"><strong>Explicación:</strong> ${esc(r.explicacion)}</div>
    ${ajusteHtml}
    ${bloquesHtml}
    <footer>Datos de uso interno de Cireneos. La fórmula de urgencia vive en código (FICHA.md), no la decide la IA.</footer>
  </div>
  <script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 300); });<\/script>
</body></html>`;

  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) {
    toast.error("El navegador bloqueó la ventana. Permití las ventanas emergentes para descargar.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/** Ficha de un caso. Carga desde Convex (api.casos.obtener). */
export function FichaCaso({ id, onClose }: { id: Id<"casos">; onClose: () => void }) {
  const caso = useQuery(api.casos.obtener, { id });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm duration-200 animate-in fade-in sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ficha de la familia"
    >
      <div
        className="max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border/60 bg-crema shadow-2xl duration-300 animate-in slide-in-from-bottom-4 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {caso === undefined ? (
          <div className="p-6">
            <div className="mb-4 h-16 animate-pulse rounded-xl bg-muted/50" />
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-muted/40" />
              ))}
            </div>
          </div>
        ) : caso === null ? (
          <div className="flex items-center justify-between gap-2 p-6">
            <p className="text-sm text-muted-foreground">No se encontró el caso.</p>
            <CerrarBtn onClose={onClose} />
          </div>
        ) : (
          <Contenido caso={caso} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function CerrarBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Cerrar"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-oliva-oscuro shadow-sm transition-colors hover:bg-manteca"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function Contenido({
  caso,
  onClose,
}: {
  caso: NonNullable<ReturnType<typeof useQuery<typeof api.casos.obtener>>>;
  onClose: () => void;
}) {
  const r = caso.resultado;
  const aportes = r.aportes as Aporte[];
  const porCampo = new Map(aportes.map((a) => [a.campo, a]));
  const decidirAjuste = useMutation(api.casos.decidirAjuste);
  const [decidiendo, setDecidiendo] = useState(false);

  // El coordinador acepta o rechaza el ajuste sugerido por la IA.
  async function decidir(decision: "aceptado" | "rechazado") {
    setDecidiendo(true);
    try {
      await decidirAjuste({ casoId: caso.id, decision });
      toast.success(decision === "aceptado" ? "Ajuste aceptado." : "Ajuste rechazado.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        /sesión/i.test(msg)
          ? "Necesitás iniciar sesión para decidir el ajuste."
          : "No se pudo guardar la decisión."
      );
    } finally {
      setDecidiendo(false);
    }
  }

  return (
    <>
      {/* Cabecera */}
      <div className="relative overflow-hidden rounded-t-3xl bg-oliva p-5 text-white sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">{caso.alias}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-white/85">
              <MapPin className="size-3.5" />
              {caso.barrio}
            </p>
          </div>
          <CerrarBtn onClose={onClose} />
        </div>

        <div className="mt-4 flex items-end gap-4">
          <div>
            <div className="font-heading text-5xl leading-none font-extrabold text-manteca tabular-nums">
              {r.puntajeFinal}
            </div>
            <div className="mt-1.5 text-[10px] font-semibold tracking-[0.15em] text-white/80 uppercase">
              puntaje final
            </div>
          </div>
          <div className="mb-0.5 flex flex-1 flex-wrap gap-1.5 text-[11px] font-medium">
            <span className="rounded-full bg-white/15 px-2.5 py-1">Tabla: {r.total}/135</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1">Base: {r.base}</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1">
              Espera: +{r.espera} ({r.mesesEspera} {r.mesesEspera === 1 ? "mes" : "meses"})
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-1">
              Ajuste:{" "}
              {r.ajusteAplicado === 0
                ? "—"
                : `${r.ajusteAplicado > 0 ? "+" : ""}${Math.round(r.ajusteAplicado * 100)}%`}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Datos de contacto (uso interno) + descarga */}
        {(caso.nombreRepresentante || caso.telefono || caso.direccion) && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 font-heading text-[11px] font-bold tracking-[0.12em] text-oliva uppercase">
              Datos de la familia
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {caso.nombreRepresentante && (
                <div className="flex items-center gap-2">
                  <User className="size-3.5 shrink-0 text-oliva" />
                  <span>{caso.nombreRepresentante}</span>
                </div>
              )}
              {caso.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0 text-oliva" />
                  <a href={`tel:${caso.telefono.replace(/\s+/g, "")}`} className="hover:underline">
                    {caso.telefono}
                  </a>
                </div>
              )}
              {caso.direccion && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <MapPin className="size-3.5 shrink-0 text-oliva" />
                  <span>{caso.direccion}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Descargar ficha como documento A4 (imprimir → Guardar como PDF) */}
        <button
          type="button"
          onClick={() => descargarFichaA4(caso)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-full border border-salvia/60 bg-card px-5 py-2.5 text-sm font-semibold text-oliva-oscuro transition-colors hover:bg-salvia-suave"
        >
          <Download className="size-4" />
          Descargar ficha (A4)
        </button>

        {/* Explicación */}
        <div className="mb-4 flex gap-3 rounded-2xl border border-salvia/30 bg-salvia-suave/70 p-4">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-oliva" />
          <div>
            <div className="mb-1 font-heading text-[11px] font-bold tracking-[0.12em] text-oliva uppercase">
              Explicación
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">{r.explicacion}</p>
          </div>
        </div>

        {/* Ajuste de la IA */}
        {caso.ajuste && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-semibold">
                Ajuste sugerido por IA {caso.ajuste.porcentaje > 0 ? "+" : ""}
                {caso.ajuste.porcentaje}%
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                  caso.ajuste.estado === "aceptado"
                    ? "bg-salvia-suave text-oliva-oscuro"
                    : caso.ajuste.estado === "rechazado"
                      ? "bg-urgencia-critica/12 text-urgencia-critica-texto"
                      : "bg-manteca/60 text-urgencia-media-texto"
                }`}
              >
                {caso.ajuste.estado}
              </span>
            </div>
            <p className="text-muted-foreground">{caso.ajuste.motivo}</p>
            <p className="mt-1 italic text-muted-foreground/80">{caso.ajuste.evidencia}</p>
            {caso.ajuste.estado === "sugerido" && caso.estado !== "relevado" && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => decidir("aceptado")}
                  disabled={decidiendo}
                  className="rounded-full bg-oliva px-4 py-2 text-xs font-semibold text-white hover:bg-oliva-oscuro disabled:opacity-50"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={() => decidir("rechazado")}
                  disabled={decidiendo}
                  className="rounded-full border border-salvia/60 bg-card px-4 py-2 text-xs font-semibold text-oliva-oscuro hover:bg-salvia-suave disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Historia para donantes: la escribe la IA y la aprueba el coordinador. */}
        {caso.estado !== "relevado" && (
          <Link
            href={`/historia/${caso.id}`}
            className="mb-5 flex h-12 items-center justify-center gap-2 rounded-full bg-manteca px-5 text-sm font-bold tracking-wide text-tinta uppercase shadow-sm transition-colors hover:bg-manteca-oscuro"
          >
            <PenLine className="size-4" />
            Escribir y aprobar historia
          </Link>
        )}

        {/* Desglose por bloque de la tabla de Cireneos */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-oliva-oscuro">Desglose de la evaluación</h3>
            <span className="text-xs text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{r.total}</span> / 135
            </span>
          </div>

          {BLOQUES.map((bloque) => {
            const filas = bloque.campos
              .map((c) => porCampo.get(c))
              .filter((a): a is Aporte => a !== undefined);
            if (filas.length === 0) return null;
            const subtotal = filas.reduce((acc, a) => acc + a.aporte, 0);
            const maxBloque = filas.reduce((acc, a) => acc + a.peso * 3, 0);
            return (
              <div
                key={bloque.titulo}
                className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
              >
                {/* Encabezado del bloque */}
                <div className="flex items-center justify-between border-b border-border/70 bg-salvia-suave/70 px-4 py-2.5">
                  <span className="font-heading text-xs font-bold text-oliva-oscuro">{bloque.titulo}</span>
                  <span className="text-[11px] font-semibold text-oliva">
                    {subtotal} / {maxBloque} pts
                  </span>
                </div>

                {/* Campos del bloque */}
                <div className="divide-y divide-border/60">
                  {filas.map((a) => {
                    const nivel = nivelDe(a.puntos, a.peso * 3);
                    return (
                      <div key={a.campo} className="flex items-center gap-3 px-4 py-3">
                        {/* Identidad del campo */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold">{a.etiqueta}</span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${nivel.chip}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${nivel.punto}`} />
                              {nivel.texto}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {a.textoValor}
                          </p>
                        </div>

                        {/* Aporte al puntaje */}
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold tabular-nums">{a.aporte}</div>
                          <div className="text-[10px] text-muted-foreground">
                            de {a.peso * 3} pts
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Leyenda de niveles */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-medium">Nivel de carencia:</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-urgencia-baja" /> Sin carencia</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-urgencia-media" /> Medio</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-urgencia-alta" /> Alto</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-urgencia-critica" /> Crítico</span>
        </div>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Datos simulados · la fórmula vive en código (FICHA.md), no la decide la IA
        </p>
      </div>
    </>
  );
}
