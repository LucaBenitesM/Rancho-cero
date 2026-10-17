"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import type { AlertaPrivacidad } from "@rancho-cero/backend/convex/historias";
import { Button } from "@rancho-cero/ui/components/button";
import { Checkbox } from "@rancho-cero/ui/components/checkbox";
import { Label } from "@rancho-cero/ui/components/label";
import { Textarea } from "@rancho-cero/ui/components/textarea";
import { Authenticated, AuthLoading, Unauthenticated, useAction, useMutation, useQuery } from "convex/react";
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
import { Fragment, useState } from "react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────
// Pantalla "Aprobar historia" (coordinadores, requiere sesión).
// La IA escribe la historia y revisa su privacidad; el coordinador la
// edita si hace falta y la aprueba. Recién ahí se publica en la campaña.
// ─────────────────────────────────────────────────────────────

type Accion = "generar" | "revisar" | "publicar";

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
          <mark key={i} className="rounded bg-amber-200 px-0.5 text-amber-950 dark:bg-amber-500/40 dark:text-amber-50">
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
  const aprobarYPublicar = useMutation(api.historias.aprobarYPublicar);

  const [textoOriginal, setTextoOriginal] = useState("");
  const [texto, setTexto] = useState("");
  // Texto tal como se revisó por última vez (para exigir revisar tras editar).
  const [textoRevisado, setTextoRevisado] = useState("");
  const [alertas, setAlertas] = useState<AlertaPrivacidad[]>([]);
  const [confirmoAlertas, setConfirmoAlertas] = useState(false);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [publicado, setPublicado] = useState(false);

  const hayHistoria = textoOriginal.length > 0;
  const editadoSinRevisar = texto.trim() !== textoRevisado.trim();
  const puedeAprobar =
    accion === null &&
    texto.trim().length > 0 &&
    !editadoSinRevisar &&
    (alertas.length === 0 || confirmoAlertas);

  async function onGenerar() {
    setAccion("generar");
    try {
      const r = await generar({ casoId });
      setTextoOriginal(r.texto);
      setTexto(r.texto);
      setTextoRevisado(r.texto);
      setAlertas(r.alertas);
      setConfirmoAlertas(false);
      setPublicado(false);
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
    setAccion("publicar");
    try {
      await aprobarYPublicar({ casoId, textoOriginal, texto, alertas });
      setPublicado(true);
      toast.success("Historia aprobada y campaña publicada.");
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
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
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
      <header className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Aprobar historia</h1>
        <p className="text-xs text-muted-foreground">
          {datos.alias} · {datos.barrio} · solo lo ve el equipo
        </p>
      </header>

      {datos.publicada && (
        <div className="mb-4 rounded-2xl border border-emerald-600/20 bg-emerald-50/70 p-3.5 text-xs dark:bg-emerald-950/20">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-500">
            <BadgeCheck className="h-3.5 w-3.5" />
            Historia publicada
            {datos.campana && (
              <span className="font-normal text-muted-foreground">
                · campaña {datos.campana.activa ? "activa" : "inactiva"}, US${" "}
                {datos.campana.recaudadoUsd.toLocaleString("es-UY")} de{" "}
                {datos.campana.metaUsd.toLocaleString("es-UY")}
              </span>
            )}
          </div>
          <p className="leading-relaxed text-foreground/80">{datos.publicada.texto}</p>
        </div>
      )}

      {!hayHistoria ? (
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            La IA escribe una historia anónima a partir de la ficha y revisa que no tenga datos que
            identifiquen a la familia. Nada se publica hasta que la apruebes.
          </p>
          <Button onClick={onGenerar} disabled={accion !== null}>
            {accion === "generar" ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {accion === "generar" ? "Generando…" : "Generar historia para donantes"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="historia" className="mb-1.5 block text-xs font-semibold">
              Historia (podés editarla)
            </Label>
            <Textarea
              id="historia"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={accion !== null}
              className="min-h-32 rounded-xl bg-card text-sm leading-relaxed md:text-sm"
            />
            {editadoSinRevisar && (
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-500">
                Editaste la historia: revisá la privacidad de nuevo antes de aprobar.
              </p>
            )}
          </div>

          {/* Alertas de privacidad */}
          {alertas.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-600/20 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Sin alertas de privacidad{editadoSinRevisar ? " (en la última revisión)" : ""}.
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/40 bg-amber-50/60 p-3.5 dark:bg-amber-950/20">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
                <ShieldAlert className="h-4 w-4" />
                {alertas.length} {alertas.length === 1 ? "alerta" : "alertas"} de privacidad
              </div>
              {!editadoSinRevisar && (
                <p className="mb-3 rounded-lg bg-card p-2.5 text-xs leading-relaxed text-foreground/80">
                  <TextoResaltado texto={texto} alertas={alertas} />
                </p>
              )}
              <ul className="space-y-2">
                {alertas.map((a, i) => (
                  <li key={i} className="rounded-lg bg-card p-2.5 text-xs">
                    <div>
                      <mark className="rounded bg-amber-200 px-0.5 text-amber-950 dark:bg-amber-500/40 dark:text-amber-50">
                        {a.texto}
                      </mark>{" "}
                      <span className="text-muted-foreground">· {a.motivo}</span>
                    </div>
                    {a.sugerencia && (
                      <div className="mt-1 flex items-center justify-between gap-2">
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
                <div className="mt-3 flex items-start gap-2">
                  <Checkbox
                    id="confirmo"
                    checked={confirmoAlertas}
                    onCheckedChange={(c) => setConfirmoAlertas(c === true)}
                  />
                  <Label htmlFor="confirmo" className="text-xs leading-snug font-normal">
                    Revisé las alertas y la historia no permite identificar a la familia.
                  </Label>
                </div>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap gap-2">
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
            <Button onClick={onAprobar} disabled={!puedeAprobar}>
              {accion === "publicar" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Aprobar y publicar
            </Button>
          </div>

          {publicado && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-600/20 bg-emerald-50/70 px-3 py-2 text-xs dark:bg-emerald-950/20">
              <span className="text-emerald-800 dark:text-emerald-400">
                Publicada. La campaña del caso tiene meta de US$ 15.000.
              </span>
              <Link href="/campana" className="font-semibold text-emerald-700 underline dark:text-emerald-400">
                Ver campaña
              </Link>
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-[10px] text-muted-foreground">
        La IA propone, el coordinador decide · nunca nombres, direcciones, caras ni diagnósticos
      </p>
    </>
  );
}

export default function AprobarHistoriaPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-full bg-emerald-50/30 dark:bg-transparent">
      <div className="mx-auto w-full max-w-xl px-4 py-6">
        <Link
          href="/ranking"
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al ranking
        </Link>
        <Authenticated>
          <AprobarHistoria casoId={id as Id<"casos">} />
        </Authenticated>
        <Unauthenticated>
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
            Esta pantalla es para coordinadores.
            <br />
            <Link href="/dashboard" className="font-semibold text-emerald-700 underline dark:text-emerald-400">
              Iniciá sesión
            </Link>{" "}
            para aprobar historias.
          </div>
        </Unauthenticated>
        <AuthLoading>
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
          </div>
        </AuthLoading>
      </div>
    </div>
  );
}
