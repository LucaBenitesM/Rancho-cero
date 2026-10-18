"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Download, PenLine, X } from "lucide-react";
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

// Campos cuya escala de puntuación arranca en 0 (el resto arranca en 1).
// En los que arrancan en 1, puntuación 1 = mejor valor posible = "Sin carencia".
// Ver la tabla en packages/backend/convex/ficha.ts.
const PUNTOS_MINIMOS: Record<string, number> = {
  enfermedad: 0,
  menoresDe5: 0,
  menores5a12: 0,
  menores12a18: 0,
};

// Puntuación máxima de cualquier campo de la tabla de Cireneos.
const PUNTOS_MAXIMOS = 3;

// Nivel de carencia según la puntuación del campo, NORMALIZADA a su escala
// real: algunos campos van de 1 a 3 (1 = sin carencia) y otros de 0 a 3
// (0 = sin carencia). Sin esto, "pared revocada" (lo mejor, puntos=1) salía
// como "Medio". frac = (puntos - min) / (max - min).
function nivelDe(campoClave: string, puntos: number): {
  texto: string;
  punto: string;
  chip: string;
} {
  const min = PUNTOS_MINIMOS[campoClave] ?? 1;
  const rango = PUNTOS_MAXIMOS - min;
  const frac = rango > 0 ? (puntos - min) / rango : 0;

  if (frac >= 1)
    return {
      texto: "Crítico",
      punto: "bg-urgencia-critica",
      chip: "bg-urgencia-critica/12 text-urgencia-critica-texto",
    };
  if (frac >= 0.5)
    return {
      texto: "Alto",
      punto: "bg-urgencia-alta",
      chip: "bg-urgencia-alta/15 text-urgencia-alta-texto",
    };
  if (frac > 0)
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

  const nivelTexto = (campoClave: string, puntos: number) => nivelDe(campoClave, puntos).texto;
  const evidencias = caso.evidencias ?? {};
  const fotos = caso.fotos ?? [];

  const fotosHtml = fotos.length
    ? `<section class="fotos">
         <h2 class="seccion">Fotos de la vivienda (${fotos.length})</h2>
         <div class="galeria">
           ${fotos.map((u, i) => `<figure><img src="${esc(u)}" alt="Foto ${i + 1} de la vivienda" /><figcaption>Foto ${i + 1}</figcaption></figure>`).join("")}
         </div>
       </section>`
    : "";

  const bloquesHtml = BLOQUES.map((bloque) => {
    const filas = bloque.campos
      .map((c) => porCampo.get(c))
      .filter((a): a is Aporte => a !== undefined);
    if (filas.length === 0) return "";
    const subtotal = filas.reduce((acc, a) => acc + a.aporte, 0);
    const maxBloque = filas.reduce((acc, a) => acc + a.peso * 3, 0);
    const filasHtml = filas
      .map((a) => {
        const ev = evidencias[a.campo];
        return `
        <tr class="fila">
          <td class="campo">${esc(a.etiqueta)}</td>
          <td class="valor">${esc(a.textoValor || "Sin dato")}</td>
          <td class="nivel">${esc(nivelTexto(a.campo, a.puntos))}</td>
          <td class="pts">${esc(a.aporte)} / ${esc(a.peso * 3)}<span class="peso">peso ${esc(a.peso)}</span></td>
        </tr>
        ${ev ? `<tr class="fila-ev"><td></td><td colspan="3" class="ev">Fundamento: ${esc(ev)}</td></tr>` : ""}`;
      })
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
  .seccion { font-size: 13px; color: #3b3d26; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e4e0d2; }
  .ajuste { border: 1px solid #e4e0d2; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 12px; }
  .ajuste h3 { margin: 0 0 4px; font-size: 13px; }
  .ajuste .ev { color: #777; font-style: italic; }
  .bloque { margin-bottom: 12px; break-inside: avoid; }
  .bloque-head { display: flex; justify-content: space-between; background: #eef0e4; border-radius: 6px 6px 0 0; padding: 6px 10px; font-size: 12px; font-weight: 700; color: #3b3d26; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 5px 10px; border-bottom: 1px solid #ececec; vertical-align: top; }
  th { background: #fafafa; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #888; }
  td.pts, th:last-child { text-align: right; white-space: nowrap; }
  td.pts .peso { display: block; font-size: 9px; font-weight: 400; color: #aaa; }
  .fila td { border-bottom: none; }
  .fila-ev td { border-bottom: 1px solid #ececec; padding-top: 0; }
  .ev { font-size: 10px; color: #777; font-style: italic; line-height: 1.4; }
  .transcripcion { margin-top: 14px; border: 1px solid #e4e0d2; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #555; break-inside: avoid; }
  .transcripcion h3 { margin: 0 0 4px; font-size: 12px; color: #3b3d26; }
  .transcripcion p { margin: 0; white-space: pre-wrap; line-height: 1.5; }
  .fotos { margin-top: 6px; }
  .galeria { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .galeria figure { margin: 0; break-inside: avoid; }
  .galeria img { width: 100%; height: 150px; object-fit: cover; border-radius: 6px; border: 1px solid #e4e0d2; display: block; }
  .galeria figcaption { font-size: 10px; color: #888; margin-top: 3px; text-align: center; }
  footer { margin-top: 16px; border-top: 1px solid #e4e0d2; padding-top: 8px; font-size: 10px; color: #999; text-align: center; }
  @media screen { body { background: #ddd; padding: 20px; } .doc { background: #fff; padding: 16mm; box-shadow: 0 2px 12px rgba(0,0,0,.15); } .print-hint { text-align:center; font-size:12px; color:#555; margin-bottom:12px; } }
  @media print { .print-hint { display: none; } }
</style></head>
<body>
  <div class="print-hint">Usá “Guardar como PDF” en el diálogo de impresión para descargar el informe completo.</div>
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
    <h2 class="seccion">Informe completo — desglose fundamentado</h2>
    ${bloquesHtml}
    ${fotosHtml}
    ${
      caso.transcripcion
        ? `<div class="transcripcion"><h3>Transcripción del audio de la visita</h3><p>${esc(caso.transcripcion)}</p></div>`
        : ""
    }
    <footer>Datos de uso interno de Cireneos. El puntaje de urgencia se calcula con la tabla de criterios de Cireneos.</footer>
  </div>
  <script>
    window.addEventListener("load", function(){
      // Espera a que las imágenes terminen de cargar antes de imprimir,
      // para que las fotos aparezcan en el PDF.
      var imgs = Array.prototype.slice.call(document.images);
      var pendientes = imgs.filter(function(i){ return !i.complete; }).length;
      var impreso = false;
      function listo(){ if (impreso) return; impreso = true; setTimeout(function(){ window.print(); }, 300); }
      if (pendientes === 0) { listo(); return; }
      imgs.forEach(function(img){
        if (img.complete) return;
        img.addEventListener("load", function(){ if (--pendientes === 0) listo(); });
        img.addEventListener("error", function(){ if (--pendientes === 0) listo(); });
      });
      // Red de seguridad: imprime igual tras 5 s aunque alguna imagen no cargue.
      setTimeout(listo, 5000);
    });
  <\/script>
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

  const fecha = new Date(caso.relevadoEn).toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

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

  const contacto: { etiqueta: string; valor: string }[] = [
    caso.nombreRepresentante && { etiqueta: "Referente", valor: caso.nombreRepresentante },
    caso.telefono && { etiqueta: "Teléfono", valor: caso.telefono },
    caso.direccion && { etiqueta: "Dirección", valor: caso.direccion },
    caso.barrio && caso.barrio !== "—" && { etiqueta: "Barrio / localidad", valor: caso.barrio },
  ].filter(Boolean) as { etiqueta: string; valor: string }[];

  return (
    <>
      {/* Barra de acciones (no es parte del documento) */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/60 bg-crema/95 px-4 py-2.5 backdrop-blur print:hidden">
        <button
          type="button"
          onClick={() => descargarFichaA4(caso)}
          className="inline-flex items-center gap-2 rounded-full border border-salvia/60 bg-card px-4 py-1.5 text-xs font-semibold text-oliva-oscuro transition-colors hover:bg-salvia-suave"
        >
          <Download className="size-3.5" />
          Descargar informe completo
        </button>
        <CerrarBtn onClose={onClose} />
      </div>

      {/* El documento — se ve igual que el PDF descargable */}
      <div className="bg-[#ddd] p-4 sm:p-6">
        <article className="mx-auto max-w-[180mm] rounded-sm bg-white p-7 text-[#1F1F1A] shadow-[0_2px_16px_rgb(0_0_0/0.12)] sm:p-10">
          {/* Cabecera */}
          <header className="flex items-end justify-between gap-4 border-b-[3px] border-[#545637] pb-2.5">
            <div>
              <h1 className="text-[22px] font-bold text-[#3b3d26]">{caso.alias}</h1>
              <p className="mt-0.5 text-xs text-[#666]">
                Ficha de urgencia · Cireneos · Relevado el {fecha}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[34px] leading-none font-bold text-[#545637] tabular-nums">
                {r.puntajeFinal}
              </div>
              <div className="text-[10px] font-semibold tracking-[0.12em] text-[#888] uppercase">
                Puntaje final
              </div>
            </div>
          </header>

          {/* Meta */}
          <div className="mt-3.5 flex flex-wrap gap-2 text-[11px] text-[#444]">
            <span className="rounded-full bg-[#f1efe6] px-2.5 py-0.5">Tabla: {r.total} / 135</span>
            <span className="rounded-full bg-[#f1efe6] px-2.5 py-0.5">Base: {r.base}</span>
            <span className="rounded-full bg-[#f1efe6] px-2.5 py-0.5">
              Espera: +{r.espera} ({r.mesesEspera} {r.mesesEspera === 1 ? "mes" : "meses"})
            </span>
            <span className="rounded-full bg-[#f1efe6] px-2.5 py-0.5">
              Ajuste:{" "}
              {r.ajusteAplicado === 0
                ? "—"
                : `${r.ajusteAplicado > 0 ? "+" : ""}${Math.round(r.ajusteAplicado * 100)}%`}
            </span>
          </div>

          {/* Datos de la familia */}
          {contacto.length > 0 && (
            <div className="mt-3.5 grid grid-cols-2 gap-x-5 gap-y-1.5 rounded-[10px] border border-[#e4e0d2] bg-[#faf8f2] px-3.5 py-3">
              {contacto.map((c) => (
                <div key={c.etiqueta} className="text-xs">
                  <span className="block text-[10px] tracking-[0.08em] text-[#888] uppercase">
                    {c.etiqueta}
                  </span>
                  <strong className="font-semibold">{c.valor}</strong>
                </div>
              ))}
            </div>
          )}

          {/* Explicación */}
          <div className="mt-3.5 rounded-md border-l-4 border-[#8E9460] bg-[#f3f4ea] px-3 py-2.5 text-xs leading-relaxed">
            <strong>Explicación:</strong> {r.explicacion}
          </div>

          {/* Ajuste de la IA */}
          {caso.ajuste && (
            <div className="mt-3.5 rounded-lg border border-[#e4e0d2] px-3 py-2.5 text-xs">
              <h3 className="mb-1 font-bold">
                Ajuste sugerido por IA ({caso.ajuste.porcentaje > 0 ? "+" : ""}
                {caso.ajuste.porcentaje}%) · <span className="capitalize">{caso.ajuste.estado}</span>
              </h3>
              <p className="text-[#555]">{caso.ajuste.motivo}</p>
              <p className="mt-1 text-[#777] italic">{caso.ajuste.evidencia}</p>
              {/* Decisión del coordinador (interactivo, fuera del PDF) */}
              {caso.ajuste.estado === "sugerido" && caso.estado !== "relevado" && (
                <div className="mt-2.5 flex gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => decidir("aceptado")}
                    disabled={decidiendo}
                    className="rounded-full bg-oliva px-4 py-1.5 text-xs font-semibold text-white hover:bg-oliva-oscuro disabled:opacity-50"
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    onClick={() => decidir("rechazado")}
                    disabled={decidiendo}
                    className="rounded-full border border-salvia/60 bg-card px-4 py-1.5 text-xs font-semibold text-oliva-oscuro hover:bg-salvia-suave disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Desglose por bloque — tablas como en el documento */}
          {BLOQUES.map((bloque) => {
            const filas = bloque.campos
              .map((c) => porCampo.get(c))
              .filter((a): a is Aporte => a !== undefined);
            if (filas.length === 0) return null;
            const subtotal = filas.reduce((acc, a) => acc + a.aporte, 0);
            const maxBloque = filas.reduce((acc, a) => acc + a.peso * 3, 0);
            return (
              <section key={bloque.titulo} className="mt-3">
                <div className="flex items-center justify-between rounded-t-md bg-[#eef0e4] px-2.5 py-1.5 text-xs font-bold text-[#3b3d26]">
                  <span>{bloque.titulo}</span>
                  <span>
                    {subtotal} / {maxBloque} pts
                  </span>
                </div>
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#fafafa] text-[10px] tracking-[0.05em] text-[#888] uppercase">
                      <th className="border-b border-[#ececec] px-2.5 py-1.5 text-left">Campo</th>
                      <th className="border-b border-[#ececec] px-2.5 py-1.5 text-left">Observación</th>
                      <th className="border-b border-[#ececec] px-2.5 py-1.5 text-left">Nivel</th>
                      <th className="border-b border-[#ececec] px-2.5 py-1.5 text-right">Puntaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((a) => (
                      <tr key={a.campo}>
                        <td className="border-b border-[#ececec] px-2.5 py-1.5">{a.etiqueta}</td>
                        <td className="border-b border-[#ececec] px-2.5 py-1.5">
                          {a.textoValor || "—"}
                        </td>
                        <td className="border-b border-[#ececec] px-2.5 py-1.5">
                          {nivelDe(a.campo, a.puntos).texto}
                        </td>
                        <td className="border-b border-[#ececec] px-2.5 py-1.5 text-right whitespace-nowrap">
                          {a.aporte} / {a.peso * 3}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}

          {/* Historia (interactivo, fuera del PDF) */}
          {caso.estado !== "relevado" && (
            <Link
              href={`/historia/${caso.id}`}
              className="mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-manteca px-5 text-sm font-bold tracking-wide text-tinta uppercase shadow-sm transition-colors hover:bg-manteca-oscuro print:hidden"
            >
              <PenLine className="size-4" />
              Escribir y aprobar historia
            </Link>
          )}

          <footer className="mt-4 border-t border-[#e4e0d2] pt-2 text-center text-[10px] text-[#999]">
            Datos de uso interno de Cireneos. El puntaje de urgencia se calcula con la tabla de
            criterios de Cireneos.
          </footer>
        </article>
      </div>
    </>
  );
}
