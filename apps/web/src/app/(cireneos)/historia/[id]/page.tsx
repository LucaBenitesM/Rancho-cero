"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import type { AlertaPrivacidad } from "@rancho-cero/backend/convex/historias";
import { Button } from "@rancho-cero/ui/components/button";
import { Checkbox } from "@rancho-cero/ui/components/checkbox";
import { Label } from "@rancho-cero/ui/components/label";
import { Textarea } from "@rancho-cero/ui/components/textarea";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";

import Protegida from "@/components/protegida";

// ─────────────────────────────────────────────────────────────
// Pantalla "Aprobar historia" (coordinadores, requiere sesión).
// La IA escribe la historia y revisa su privacidad; queda como borrador.
// El coordinador la edita si hace falta y la aprueba: se guarda en la app y
// aparece en /historias. No se publica en ningún lado.
// TODO(roles): cuando esté la función de rol, mostrar esta pantalla solo a
// coordinadores (el servidor ya chequea en requerirCoordinador).
// ─────────────────────────────────────────────────────────────

type Accion = "generar" | "revisar" | "aprobar";

// Errores técnicos de la API -> mensaje presentable.
function mensajeAmigable(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  if (/tiempo límite|timeout|abort/i.test(raw)) return "La IA tardó demasiado. Probá de nuevo.";
  if (/iniciar sesión/i.test(raw)) return "Necesitás iniciar sesión.";
  if (/ANTHROPIC_/.test(raw)) return "Falta configurar la IA en Convex (ANTHROPIC_API_KEY / ANTHROPIC_MODEL).";
  if (/anthropic|\b\d{3}\b|json/i.test(raw)) return "La IA no respondió bien. Reintentá en unos segundos.";
  const limpio = raw.match(/Uncaught Error: (.*?)(\n|$)/)?.[1];
  return limpio || raw || "Algo falló. Reintentá.";
}

// Texto con los fragmentos de las alertas resaltados.
function TextoResaltado({ texto, alertas }: { texto: string; alertas: AlertaPrivacidad[] }) {
  const fragmentos = alertas
    .map((a) => a.texto)
    .filter((f) => f && texto.includes(f))
    .map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (fragmentos.length === 0) return <>{texto}</>;
  const partes = texto.split(new RegExp(`(${fragmentos.join("|")})`, "g"));
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-manteca px-0.5 text-tinta">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function AprobarHistoria({ casoId }: { casoId: Id<"casos"> }) {
  const datos = useQuery(api.historias.obtenerParaAprobar, { casoId });
  const generar = useAction(api.historias.generar);
  const revisarPrivacidad = useAction(api.historias.revisarPrivacidad);
  const aprobar = useMutation(api.historias.aprobar);

  // Borrador que se está editando (cada "Generar" guarda uno nuevo).
  const [historiaId, setHistoriaId] = useState<Id<"historias"> | null>(null);
  const [textoOriginal, setTextoOriginal] = useState("");
  const [texto, setTexto] = useState("");
  // Texto tal como se revisó por última vez (para exigir revisar tras editar).
  const [textoRevisado, setTextoRevisado] = useState("");
  const [alertas, setAlertas] = useState<AlertaPrivacidad[]>([]);
  const [confirmoAlertas, setConfirmoAlertas] = useState(false);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [aprobado, setAprobado] = useState(false);

  // Si quedó un borrador sin aprobar, se retoma al entrar.
  const borrador = datos?.borrador;
  useEffect(() => {
    if (!borrador || historiaId) return;
    setHistoriaId(borrador.historiaId);
    setTextoOriginal(borrador.texto);
    setTexto(borrador.texto);
    setTextoRevisado(borrador.texto);
    setAlertas(borrador.alertas);
  }, [borrador, historiaId]);

  const hayHistoria = textoOriginal.length > 0;
  const editadoSinRevisar = texto.trim() !== textoRevisado.trim();
  const puedeAprobar =
    accion === null &&
    historiaId !== null &&
    !aprobado &&
    texto.trim().length > 0 &&
    !editadoSinRevisar &&
    (alertas.length === 0 || confirmoAlertas);

  async function onGenerar() {
    setAccion("generar");
    try {
      const r = await generar({ casoId });
      setHistoriaId(r.historiaId);
      setTextoOriginal(r.texto);
      setTexto(r.texto);
      setTextoRevisado(r.texto);
      setAlertas(r.alertas);
      setConfirmoAlertas(false);
      setAprobado(false);
    } catch (err) {
      toast.error(mensajeAmigable(err));
    } finally {
      setAccion(null);
    }
  }

  async function onRevisar() {
    setAccion("revisar");
    try {
      const r = await revisarPrivacidad({ texto });
      setTextoRevisado(texto);
      setAlertas(r.alertas);
      setConfirmoAlertas(false);
      if (r.alertas.length === 0) toast.success("Sin alertas de privacidad.");
    } catch (err) {
      toast.error(mensajeAmigable(err));
    } finally {
      setAccion(null);
    }
  }

  async function onAprobar() {
    if (!historiaId) return;
    setAccion("aprobar");
    try {
      await aprobar({ historiaId, texto, alertas });
      setAprobado(true);
      toast.success("Historia aprobada y guardada.");
    } catch (err) {
      toast.error(mensajeAmigable(err));
    } finally {
      setAccion(null);
    }
  }

  // Aplica la sugerencia de una alerta en el texto (después hay que revisar de nuevo).
  function reemplazar(a: AlertaPrivacidad) {
    setTexto((t) => t.replace(a.texto, a.sugerencia));
  }

  if (datos === undefined) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-salvia" />
      </div>
    );
  }
  if (datos === null) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No se encontró el caso.</p>;
  }
  if (datos.estado === "relevado") {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Primero hay que revisar y guardar la ficha de este caso.
      </p>
    );
  }

  return (
    <>
      <header className="mb-5">
        <p className="font-heading text-xs font-semibold tracking-[0.2em] text-oliva uppercase">
          Contá su historia
        </p>
        <h1 className="mt-1 text-3xl font-bold text-oliva-oscuro">Aprobar historia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {datos.alias} · {datos.barrio} · solo lo ve el equipo
        </p>
      </header>

      {datos.aprobada && (
        <div className="mb-5 rounded-2xl border border-salvia/30 bg-salvia-suave/70 p-4 text-sm">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5 font-semibold text-oliva-oscuro">
            <BadgeCheck className="size-4" />
            Última historia aprobada
            {datos.aprobada.aprobadaEn && (
              <span className="font-normal text-muted-foreground">
                · {new Date(datos.aprobada.aprobadaEn).toLocaleDateString("es-UY")}
              </span>
            )}
          </div>
          <p className="leading-relaxed text-foreground/80">{datos.aprobada.texto}</p>
        </div>
      )}

      {!hayHistoria ? (
        <div className="rounded-2xl border border-border/80 bg-card p-7 text-center shadow-[0_1px_2px_rgb(31_31_26/0.04),0_4px_16px_-6px_rgb(84_86_55/0.12)]">
          <p className="mb-5 text-base leading-relaxed text-muted-foreground">
            La IA escribe una historia anónima a partir de la ficha y revisa que no tenga datos que
            identifiquen a la familia. Queda como borrador hasta que la apruebes.
          </p>
          <Button variant="acento" size="lg" onClick={onGenerar} disabled={accion !== null}>
            {accion === "generar" ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {accion === "generar" ? "Generando…" : "Generar historia"}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <Label htmlFor="historia" className="mb-2 block text-sm font-semibold">
              Historia (podés editarla)
            </Label>
            <Textarea
              id="historia"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={accion !== null || aprobado}
              className="min-h-40 rounded-2xl bg-card p-4 text-base leading-relaxed shadow-sm md:text-[15px]"
            />
            {editadoSinRevisar && (
              <p className="mt-1.5 text-xs font-medium text-urgencia-alta-texto">
                Editaste la historia: revisá la privacidad de nuevo antes de aprobar.
              </p>
            )}
          </div>

          {/* Alertas de privacidad */}
          {alertas.length === 0 ? (
            <div className="flex items-center gap-2 rounded-2xl border border-salvia/30 bg-salvia-suave/70 px-4 py-3 text-sm text-oliva-oscuro">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Sin alertas de privacidad{editadoSinRevisar ? " (en la última revisión)" : ""}.
            </div>
          ) : (
            <div className="rounded-2xl border border-manteca-oscuro bg-manteca/35 p-4">
              <div className="mb-3 flex items-center gap-1.5 font-heading text-sm font-bold text-oliva-oscuro">
                <ShieldAlert className="h-4 w-4" />
                {alertas.length} {alertas.length === 1 ? "alerta" : "alertas"} de privacidad
              </div>
              {!editadoSinRevisar && (
                <p className="mb-3 rounded-xl bg-card p-3 text-sm leading-relaxed text-foreground/85">
                  <TextoResaltado texto={texto} alertas={alertas} />
                </p>
              )}
              <ul className="space-y-2">
                {alertas.map((a, i) => (
                  <li key={i} className="rounded-xl bg-card p-3 text-sm">
                    <div>
                      <mark className="rounded bg-manteca px-0.5 text-tinta">
                        {a.texto}
                      </mark>{" "}
                      <span className="text-muted-foreground">· {a.motivo}</span>
                    </div>
                    {a.sugerencia && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          Sugerencia: <span className="text-foreground">“{a.sugerencia}”</span>
                        </span>
                        {texto.includes(a.texto) && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => reemplazar(a)}
                            disabled={accion !== null}
                          >
                            Reemplazar
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {!editadoSinRevisar && (
                <div className="mt-4 flex items-start gap-2.5">
                  <Checkbox
                    id="confirmo"
                    checked={confirmoAlertas}
                    onCheckedChange={(c) => setConfirmoAlertas(c === true)}
                  />
                  <Label htmlFor="confirmo" className="text-sm leading-snug font-normal">
                    Revisé las alertas y la historia no permite identificar a la familia.
                  </Label>
                </div>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button variant="outline" onClick={onGenerar} disabled={accion !== null}>
              {accion === "generar" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Regenerar
            </Button>
            <Button
              variant="outline"
              onClick={onRevisar}
              disabled={accion !== null || !editadoSinRevisar || !texto.trim()}
            >
              {accion === "revisar" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Revisar privacidad de nuevo
            </Button>
            <Button variant="acento" onClick={onAprobar} disabled={!puedeAprobar}>
              {accion === "aprobar" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Aprobar historia
            </Button>
          </div>

          {aprobado && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-salvia/30 bg-salvia-suave/70 px-4 py-3 text-sm">
              <span className="text-oliva-oscuro">
                Aprobada y guardada. Desde Historias se puede copiar o descargar.
              </span>
              <Link href="/historias" className="font-semibold text-oliva underline decoration-manteca decoration-2 underline-offset-4">
                Ver historias
              </Link>
            </div>
          )}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        La IA propone, el coordinador decide · nunca nombres, direcciones, caras ni diagnósticos
      </p>
    </>
  );
}

export default function AprobarHistoriaPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/ranking"
          className="mb-5 inline-flex items-center gap-1.5 rounded-full py-1.5 text-sm font-semibold text-oliva hover:text-oliva-oscuro"
        >
          <ArrowLeft className="size-4" />
          Volver al ranking
        </Link>
        <Protegida soloCoordinador>
          <AprobarHistoria casoId={id as Id<"casos">} />
        </Protegida>
      </div>
    </div>
  );
}
