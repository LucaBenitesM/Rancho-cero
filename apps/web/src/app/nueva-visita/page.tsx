"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import {
  CAMPOS_FICHA,
  ETIQUETA_GRUPO,
  ORDEN_GRUPOS,
  type CampoFicha,
  type Confianza,
  type GrupoFicha,
} from "@rancho-cero/backend/convex/ficha";
import { Button } from "@rancho-cero/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rancho-cero/ui/components/card";
import { Checkbox } from "@rancho-cero/ui/components/checkbox";
import { Label } from "@rancho-cero/ui/components/label";
import { useAction, useMutation } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Mapa clave -> campo de la ficha, para editar la ficha devuelta por la IA.
type FichaEditable = Record<string, CampoFicha>;

const CONFIANZAS: Confianza[] = ["alta", "media", "baja"];

// Límites de carga.
const MAX_LADO_FOTO = 1600; // px del lado mayor tras achicar
const CALIDAD_JPEG = 0.8;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB

// Achica y comprime una imagen a JPEG antes de subirla, para no pasar los
// límites de la API de Claude (hasta ~5 MB por imagen). Si algo falla,
// devuelve el archivo original.
async function comprimirImagen(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, MAX_LADO_FOTO / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPEG)
    );
    bitmap.close();
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

// Etiqueta y color para el estado de confianza / a confirmar.
function etiquetaConfianza(c: CampoFicha) {
  if (c.aConfirmar) return { texto: "A confirmar", clase: "bg-amber-500/15 text-amber-600" };
  if (c.confianza === "alta") return { texto: "Confianza alta", clase: "bg-green-500/15 text-green-600" };
  if (c.confianza === "media") return { texto: "Confianza media", clase: "bg-blue-500/15 text-blue-600" };
  return { texto: "Confianza baja", clase: "bg-muted text-muted-foreground" };
}

type Paso = "carga" | "procesando" | "ficha";

// Convierte errores técnicos (p. ej. "Anthropic devolvió 400: {...}") en un
// mensaje presentable para la demo, sin volcar el detalle de la API.
function mensajeAmigable(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  if (/tiempo límite|timeout|abort/i.test(raw)) {
    return "El procesamiento tardó demasiado. Probá de nuevo.";
  }
  if (/iniciar sesión|sesión/i.test(raw)) {
    return "Necesitás iniciar sesión para procesar una visita.";
  }
  if (/anthropic|elevenlabs|\b\d{3}\b|json/i.test(raw)) {
    return "La IA no pudo completar la ficha. Reintentá en unos segundos.";
  }
  return raw || "Falló el procesamiento. Reintentá.";
}

export default function NuevaVisitaPage() {
  const generarUrlDeSubida = useMutation(api.casos.generarUrlDeSubida);
  const crearCaso = useMutation(api.casos.crearCaso);
  const procesarVisita = useAction(api.procesarVisita.procesarVisita);
  const guardarCorreccion = useMutation(api.casos.guardarCorreccion);

  const [paso, setPaso] = useState<Paso>("carga");
  const [consentimiento, setConsentimiento] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [audio, setAudio] = useState<File | null>(null);

  const [casoId, setCasoId] = useState<Id<"casos"> | null>(null);
  const [transcripcion, setTranscripcion] = useState("");
  const [transcripcionFallo, setTranscripcionFallo] = useState(false);
  const [ficha, setFicha] = useState<FichaEditable | null>(null);
  const [guardando, setGuardando] = useState(false);

  const fotosInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Sube un archivo al storage de Convex y devuelve su storageId tipado.
  async function subirArchivo(file: File): Promise<Id<"_storage">> {
    const url = await generarUrlDeSubida();
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!resp.ok) throw new Error("Falló la subida de un archivo.");
    const { storageId } = (await resp.json()) as { storageId: Id<"_storage"> };
    return storageId;
  }

  function onElegirFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const nuevos = Array.from(e.target.files ?? []);
    setFotos((prev) => [...prev, ...nuevos].slice(0, 6));
  }

  function quitarFoto(i: number) {
    setFotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Carga -> procesamiento: sube todo, crea el caso y llama a la IA.
  async function procesar() {
    if (!consentimiento) {
      toast.error("Falta marcar el consentimiento de la familia.");
      return;
    }
    if (fotos.length < 5 || fotos.length > 6) {
      toast.error("Subí entre 5 y 6 fotos.");
      return;
    }
    if (!audio) {
      toast.error("Subí el audio de la visita.");
      return;
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      toast.error("El audio es muy pesado. Grabá hasta 2 minutos (máx 15 MB).");
      return;
    }

    setPaso("procesando");
    setTranscripcionFallo(false);
    try {
      // Achica las fotos antes de subirlas (evita el límite de Claude).
      const fotosComprimidas = await Promise.all(fotos.map(comprimirImagen));
      const fotosIds = await Promise.all(fotosComprimidas.map(subirArchivo));
      const audioId = await subirArchivo(audio);

      const nuevoCasoId = await crearCaso({
        consentimiento,
        fotos: fotosIds,
        audioStorageId: audioId,
      });
      setCasoId(nuevoCasoId);

      const res = await procesarVisita({
        casoId: nuevoCasoId,
        fotos: fotosIds,
        audioStorageId: audioId,
      });
      setTranscripcion(res.transcripcion);
      setTranscripcionFallo(res.transcripcionFallo);

      // La action devuelve la ficha ya completada por la IA.
      const inicial: FichaEditable = {};
      for (const def of CAMPOS_FICHA) {
        inicial[def.clave] = res.campos[def.clave] as CampoFicha;
      }
      setFicha(inicial);
      setPaso("ficha");
      if (res.transcripcionFallo) {
        toast.warning("No se pudo transcribir el audio; la ficha se completó solo con las fotos.");
      } else {
        toast.success("Ficha generada. Revisá los campos marcados 'a confirmar'.");
      }
    } catch (err) {
      console.error(err);
      toast.error(mensajeAmigable(err));
      setPaso("carga");
    }
  }

  function actualizarCampo(clave: string, cambios: Partial<CampoFicha>) {
    setFicha((prev) => (prev ? { ...prev, [clave]: { ...prev[clave], ...cambios } } : prev));
  }

  async function guardar() {
    if (!casoId || !ficha) return;
    setGuardando(true);
    try {
      const res = await guardarCorreccion({ casoId, campos: ficha as any });
      if (res.confirmado) {
        toast.success("Caso confirmado: no quedan campos a confirmar. Entra al ranking.");
      } else {
        toast.success("Ficha guardada. Todavía quedan campos a confirmar.");
      }
    } catch (err) {
      console.error(err);
      toast.error(mensajeAmigable(err));
    } finally {
      setGuardando(false);
    }
  }

  const quedanAConfirmar = ficha
    ? CAMPOS_FICHA.filter((d) => ficha[d.clave]?.aConfirmar).length
    : 0;

  // Previsualizaciones de fotos: se crean una vez por archivo y se revocan.
  const previews = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos]);
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-6 overflow-y-auto">
      <header>
        <h1 className="text-xl font-semibold">Nueva visita</h1>
        <p className="text-sm text-muted-foreground">
          Subí 5–6 fotos y un audio. La IA transcribe el audio y completa la ficha; vos la revisás.
        </p>
      </header>

      {paso === "carga" && (
        <div className="space-y-6">
          {/* Consentimiento */}
          <Card>
            <CardHeader>
              <CardTitle>Consentimiento</CardTitle>
              <CardDescription>Nada se carga sin el consentimiento de la familia.</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={consentimiento}
                  onCheckedChange={(v) => setConsentimiento(Boolean(v))}
                />
                <span className="text-sm">La familia dio su consentimiento.</span>
              </label>
            </CardContent>
          </Card>

          {/* Fotos */}
          <Card>
            <CardHeader>
              <CardTitle>Fotos de la vivienda ({fotos.length}/6)</CardTitle>
              <CardDescription>Entre 5 y 6 fotos. Sin personas ni datos identificables.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={fotosInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onElegirFotos}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fotosInputRef.current?.click()}
                disabled={fotos.length >= 6}
              >
                Agregar fotos
              </Button>
              {fotos.length > 0 && (
                <ul className="grid grid-cols-3 gap-2">
                  {fotos.map((_, i) => (
                    <li key={i} className="relative">
                      <img
                        src={previews[i]}
                        alt={`foto ${i + 1}`}
                        className="h-24 w-full object-cover ring-1 ring-foreground/10"
                      />
                      <button
                        type="button"
                        onClick={() => quitarFoto(i)}
                        className="absolute right-1 top-1 bg-background/80 px-1 text-xs"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Audio */}
          <Card>
            <CardHeader>
              <CardTitle>Audio de la visita</CardTitle>
              <CardDescription>Máximo 2 minutos. Lo transcribe ElevenLabs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" onClick={() => audioInputRef.current?.click()}>
                {audio ? "Cambiar audio" : "Elegir audio"}
              </Button>
              {audio && <p className="text-sm text-muted-foreground">{audio.name}</p>}
            </CardContent>
          </Card>

          <Button type="button" size="lg" onClick={procesar}>
            Procesar visita con IA
          </Button>
        </div>
      )}

      {paso === "procesando" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Transcribiendo el audio y completando la ficha…
            </p>
          </CardContent>
        </Card>
      )}

      {paso === "ficha" && ficha && (
        <div className="space-y-6">
          {transcripcionFallo && (
            <div className="rounded-none bg-red-500/10 p-3 text-sm text-red-700">
              No se pudo transcribir el audio. La ficha se completó solo con las fotos; revisá con
              cuidado los campos de familia y salud.
            </div>
          )}
          {transcripcion && (
            <Card>
              <CardHeader>
                <CardTitle>Transcripción del audio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{transcripcion}</p>
              </CardContent>
            </Card>
          )}

          <div className="rounded-none bg-amber-500/10 p-3 text-sm text-amber-700">
            {quedanAConfirmar > 0
              ? `Hay ${quedanAConfirmar} campo(s) a confirmar. Resolvelos para que el caso entre al ranking.`
              : "No quedan campos a confirmar. Al guardar, el caso queda confirmado."}
          </div>

          {ORDEN_GRUPOS.map((grupo) => (
            <FichaEditor key={grupo} grupo={grupo} ficha={ficha} onCampo={actualizarCampo} />
          ))}

          <div className="flex gap-2">
            <Button type="button" size="lg" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar ficha"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setPaso("carga")}>
              Volver
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

// Editor de un bloque de campos (uno de los 5 grupos de la tabla).
function FichaEditor({
  grupo,
  ficha,
  onCampo,
}: {
  grupo: GrupoFicha;
  ficha: FichaEditable;
  onCampo: (clave: string, cambios: Partial<CampoFicha>) => void;
}) {
  const defs = CAMPOS_FICHA.filter((d) => d.grupo === grupo);
  const esSoloAudio = defs.every((d) => d.fuente.startsWith("audio"));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{ETIQUETA_GRUPO[grupo]}</CardTitle>
        <CardDescription>
          {esSoloAudio
            ? "Estos campos salen del audio."
            : "Lo que se ve en las fotos y complementa el audio."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {defs.map((def) => {
          const campo = ficha[def.clave];
          if (!campo) return null;
          const badge = etiquetaConfianza(campo);
          return (
            <div key={def.clave} className="space-y-1.5 border-b pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between">
                <Label className="font-medium">{def.etiqueta}</Label>
                <span className={`px-1.5 py-0.5 text-xs ${badge.clase}`}>{badge.texto}</span>
              </div>

              <select
                value={campo.valor}
                onChange={(e) => onCampo(def.clave, { valor: e.target.value })}
                className="h-8 w-full border border-input bg-background px-2 text-sm"
              >
                {def.opciones.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.descripcion}
                  </option>
                ))}
              </select>

              {campo.evidencia && (
                <p className="text-xs text-muted-foreground">Evidencia: {campo.evidencia}</p>
              )}

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={campo.aConfirmar}
                    onCheckedChange={(v) => onCampo(def.clave, { aConfirmar: Boolean(v) })}
                  />
                  <span>A confirmar</span>
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">Confianza:</span>
                  <select
                    value={campo.confianza}
                    onChange={(e) => onCampo(def.clave, { confianza: e.target.value as Confianza })}
                    className="h-6 border border-input bg-background px-1 text-xs"
                  >
                    {CONFIANZAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
