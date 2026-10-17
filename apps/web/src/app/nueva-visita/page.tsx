"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import type { Id } from "@rancho-cero/backend/convex/_generated/dataModel";
import {
  CAMPOS_FICHA,
  ETIQUETA_GRUPO,
  ORDEN_GRUPOS,
  clavesDudosas,
  type CampoFicha,
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
import { Camera, Mic, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import GrabadorAudio from "@/components/grabador-audio";
import { MAX_FOTOS, ZonaFotos } from "@/components/zona-fotos";
import { datosQueFaltan, mensajeFaltante, recomendacionGeneral } from "@/lib/pedido-datos";

// Mapa clave -> campo de la ficha, para editar la ficha devuelta por la IA.
type FichaEditable = Record<string, CampoFicha>;

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

// Etiqueta y color para la confianza de un campo (los dudosos van en ámbar).
function etiquetaConfianza(c: CampoFicha) {
  if (c.dudoso) return { texto: "Revisar", clase: "bg-amber-500/15 text-amber-700" };
  if (c.confianza === "alta") return { texto: "Confianza alta", clase: "bg-green-500/15 text-green-600" };
  if (c.confianza === "media") return { texto: "Confianza media", clase: "bg-blue-500/15 text-blue-600" };
  return { texto: "Confianza baja", clase: "bg-muted text-muted-foreground" };
}

// "faltan-datos": la IA dejó demasiados campos dudosos; se piden más audio o
// fotos y la ficha no se muestra hasta volver a procesar.
type Paso = "carga" | "procesando" | "faltan-datos" | "ficha";

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
  const agregarDatos = useMutation(api.casos.agregarDatos);

  const [paso, setPaso] = useState<Paso>("carga");
  const [consentimiento, setConsentimiento] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [audio, setAudio] = useState<File | null>(null);

  const [casoId, setCasoId] = useState<Id<"casos"> | null>(null);
  const [transcripcion, setTranscripcion] = useState("");
  const [transcripcionFallo, setTranscripcionFallo] = useState(false);
  const [ficha, setFicha] = useState<FichaEditable | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Cuando faltan datos: qué campos quedaron dudosos, el audio extra que se
  // está grabando y cuántos audios ya tiene el caso.
  const [clavesFaltantes, setClavesFaltantes] = useState<string[]>([]);
  const [audioExtra, setAudioExtra] = useState<File | null>(null);
  const [cantidadAudios, setCantidadAudios] = useState(0);
  const [intento, setIntento] = useState(0); // reinicia el grabador en cada intento

  // Fotos ya subidas (archivo original -> storageId), para no volver a subirlas.
  const fotosSubidas = useRef(new WeakMap<File, Id<"_storage">>());
  // Fotos con las que se procesó la última vez, para saber si cambiaron.
  const fotosProcesadas = useRef<File[]>([]);

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

  // Achica y sube solo las fotos nuevas; las ya subidas reusan su storageId.
  async function subirFotos(lista: File[]): Promise<Id<"_storage">[]> {
    return Promise.all(
      lista.map(async (foto) => {
        const previa = fotosSubidas.current.get(foto);
        if (previa) return previa;
        // Achica la foto antes de subirla (evita el límite de Claude).
        const id = await subirArchivo(await comprimirImagen(foto));
        fotosSubidas.current.set(foto, id);
        return id;
      })
    );
  }

  // Llama a la IA con todo lo que tiene el caso y decide qué pantalla mostrar.
  async function correrIA(id: Id<"casos">) {
    const res = await procesarVisita({ casoId: id });
    fotosProcesadas.current = fotos;
    setTranscripcion(res.transcripcion);
    setTranscripcionFallo(res.transcripcionFallo);

    // Demasiados campos dudosos: la ficha no se muestra, se piden más datos.
    if (res.faltanDatos) {
      setClavesFaltantes(clavesDudosas(res.campos as Record<string, CampoFicha>));
      setFicha(null);
      setPaso("faltan-datos");
      toast.warning("Faltan datos para completar la ficha.");
      return;
    }

    // La action devuelve la ficha ya completada por la IA.
    const inicial: FichaEditable = {};
    for (const def of CAMPOS_FICHA) {
      inicial[def.clave] = res.campos[def.clave] as CampoFicha;
    }
    setFicha(inicial);
    setPaso("ficha");
    if (res.transcripcionFallo) {
      toast.warning("No se pudo transcribir el audio; la ficha se completó sin ese audio.");
    } else {
      toast.success("Ficha generada. Revisá los campos señalados.");
    }
  }

  // Carga -> procesamiento: sube todo, crea el caso y llama a la IA.
  async function procesar() {
    if (!consentimiento) {
      toast.error("Falta marcar el consentimiento de la familia.");
      return;
    }
    if (fotos.length < 1 || fotos.length > MAX_FOTOS) {
      toast.error(`Subí entre 1 y ${MAX_FOTOS} fotos.`);
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
      const fotosIds = await subirFotos(fotos);
      const audioId = await subirArchivo(audio);

      const nuevoCasoId = await crearCaso({
        consentimiento,
        fotos: fotosIds,
        audioStorageId: audioId,
      });
      setCasoId(nuevoCasoId);
      setCantidadAudios(1);

      await correrIA(nuevoCasoId);
    } catch (err) {
      console.error(err);
      toast.error(mensajeAmigable(err));
      setPaso("carga");
    }
  }

  // Faltan datos -> procesamiento: suma el audio nuevo y las fotos al mismo
  // caso (sin borrar lo anterior) y vuelve a procesar con todo junto.
  async function reprocesar() {
    if (!casoId) return;
    if (fotos.length < 1 || fotos.length > MAX_FOTOS) {
      toast.error(`Tiene que haber entre 1 y ${MAX_FOTOS} fotos.`);
      return;
    }
    const fotosCambiaron =
      fotos.length !== fotosProcesadas.current.length ||
      fotos.some((f, i) => f !== fotosProcesadas.current[i]);
    if (!audioExtra && !fotosCambiaron) {
      toast.error("Grabá un audio nuevo o agregá fotos antes de volver a procesar.");
      return;
    }
    if (audioExtra && audioExtra.size > MAX_AUDIO_BYTES) {
      toast.error("El audio es muy pesado. Grabá hasta 2 minutos (máx 15 MB).");
      return;
    }

    setPaso("procesando");
    setTranscripcionFallo(false);
    try {
      const fotosIds = await subirFotos(fotos);
      const audioId = audioExtra ? await subirArchivo(audioExtra) : undefined;
      await agregarDatos({ casoId, fotos: fotosIds, audioStorageId: audioId });
      // El audio ya quedó guardado en el caso: el grabador vuelve a empezar.
      if (audioId) {
        setCantidadAudios((n) => n + 1);
        setAudioExtra(null);
        setIntento((n) => n + 1);
      }

      await correrIA(casoId);
    } catch (err) {
      console.error(err);
      toast.error(mensajeAmigable(err));
      setPaso("faltan-datos");
    }
  }

  // Cualquier edición del voluntario saca la señal de duda del campo.
  function actualizarCampo(clave: string, cambios: Partial<CampoFicha>) {
    setFicha((prev) =>
      prev
        ? { ...prev, [clave]: { ...prev[clave], ...cambios, dudoso: false, motivoDuda: "" } }
        : prev
    );
  }

  async function guardar() {
    if (!casoId || !ficha) return;
    setGuardando(true);
    try {
      await guardarCorreccion({ casoId, campos: ficha as any });
      toast.success("Ficha guardada. El caso entra al ranking.");
    } catch (err) {
      console.error(err);
      toast.error(mensajeAmigable(err));
    } finally {
      setGuardando(false);
    }
  }

  const dudosos = ficha ? CAMPOS_FICHA.filter((d) => ficha[d.clave]?.dudoso).length : 0;
  const faltan = datosQueFaltan(clavesFaltantes);

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-6 overflow-y-auto">
      <header>
        <h1 className="text-xl font-semibold">Nueva visita</h1>
        <p className="text-sm text-muted-foreground">
          Subí de 1 a 6 fotos y un audio. La IA transcribe el audio y completa la ficha; vos la revisás.
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
              <CardTitle>
                Fotos de la vivienda ({fotos.length}/{MAX_FOTOS})
              </CardTitle>
              <CardDescription>
                De 1 a {MAX_FOTOS} fotos, en cualquier orden. Sin personas ni datos identificables.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ZonaFotos fotos={fotos} onChange={setFotos} />
            </CardContent>
          </Card>

          {/* Audio */}
          <Card>
            <CardHeader>
              <CardTitle>Audio de la visita</CardTitle>
              <CardDescription>
                Grabá el audio en el momento (hasta 2 minutos). Lo transcribe ElevenLabs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GrabadorAudio onAudio={setAudio} maxSegundos={120} />
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

      {/* Sin botón para saltear: la ficha solo aparece cuando la IA tiene datos suficientes. */}
      {paso === "faltan-datos" && (
        <div className="space-y-6">
          <div className="space-y-2 rounded-none bg-amber-500/10 p-4 text-amber-800" role="alert">
            <p className="flex items-center gap-1.5 font-semibold">
              <TriangleAlert className="h-4 w-4" aria-hidden /> Necesitamos un poco más de información
            </p>
            <p className="text-sm">{mensajeFaltante(faltan)}</p>
            <p className="text-sm font-medium">{recomendacionGeneral(faltan)}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Qué conviene agregar</CardTitle>
              <CardDescription>
                No se borra nada de lo que ya cargaste: la IA va a usar todo junto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {faltan.map((f) => (
                  <li key={f.clave} className="flex items-start gap-2 text-sm">
                    {f.tipo === "foto" ? (
                      <Camera className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label="Foto" />
                    ) : (
                      <Mic className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label="Audio" />
                    )}
                    <span>{f.sugerencia}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audio nuevo</CardTitle>
              <CardDescription>
                {cantidadAudios === 1
                  ? "El audio que grabaste antes queda guardado."
                  : `Los ${cantidadAudios} audios que grabaste antes quedan guardados.`}{" "}
                Grabá otro contando lo que falta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GrabadorAudio key={intento} onAudio={setAudioExtra} maxSegundos={120} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Fotos de la vivienda ({fotos.length}/{MAX_FOTOS})
              </CardTitle>
              <CardDescription>
                Tus fotos quedan guardadas. Podés agregar más, o quitar alguna para cambiarla por
                una más clara.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ZonaFotos fotos={fotos} onChange={setFotos} />
            </CardContent>
          </Card>

          <Button type="button" size="lg" onClick={reprocesar}>
            Volver a procesar con todo junto
          </Button>
        </div>
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
            {dudosos > 0
              ? `La IA completó toda la ficha y señaló ${dudosos} campo(s) donde tiene dudas. Revisalos antes de guardar.`
              : "La IA completó toda la ficha. Revisala y guardala para que el caso entre al ranking."}
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
            <div
              key={def.clave}
              className={`space-y-1.5 border-b pb-4 last:border-b-0 last:pb-0 ${
                campo.dudoso ? "-mx-2 border-l-2 border-l-amber-500 bg-amber-500/5 px-2 pt-2" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 font-medium">
                  {campo.dudoso && (
                    <TriangleAlert className="h-4 w-4 text-amber-600" aria-label="Campo dudoso" />
                  )}
                  {def.etiqueta}
                </Label>
                <span className={`px-1.5 py-0.5 text-xs ${badge.clase}`}>{badge.texto}</span>
              </div>

              <select
                value={campo.valor}
                onChange={(e) => onCampo(def.clave, { valor: e.target.value })}
                className={`h-8 w-full border bg-background px-2 text-sm ${
                  campo.dudoso ? "border-amber-500" : "border-input"
                }`}
              >
                {def.opciones.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.descripcion}
                  </option>
                ))}
              </select>

              {campo.dudoso && (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-amber-700">La IA duda: {campo.motivoDuda}</p>
                  {/* Si el valor propuesto está bien, se acepta sin cambiarlo. */}
                  <button
                    type="button"
                    onClick={() => onCampo(def.clave, {})}
                    className="shrink-0 text-xs text-amber-700 underline"
                  >
                    Está bien así
                  </button>
                </div>
              )}

              {campo.evidencia && (
                <p className="text-xs text-muted-foreground">Evidencia: {campo.evidencia}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
