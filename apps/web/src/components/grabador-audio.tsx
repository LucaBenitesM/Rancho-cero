"use client";

import { Button } from "@rancho-cero/ui/components/button";
import { Mic, MicOff, Pause, Play, RotateCcw, Square, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Graba audio desde el navegador (compu y celular) y lo entrega como un File,
// igual que si se hubiera subido un archivo. ElevenLabs acepta webm y mp4.

type Estado =
  | "inicial"
  | "pidiendo-permiso"
  | "grabando"
  | "grabado"
  | "archivo"
  | "sin-permiso"
  | "no-disponible";

type Props = {
  /** Se llama con el audio listo, o con null cuando se descarta para volver a grabar. */
  onAudio: (file: File | null) => void;
  /** Duración máxima en segundos. Al llegar, la grabación se detiene sola. */
  maxSegundos?: number;
};

// iPhone/iPad (todos los navegadores usan WebKit) y Safari de escritorio graban mejor en mp4.
function esWebKitDeApple(): boolean {
  const ua = navigator.userAgent;
  const esIOS =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const esSafari = /^((?!chrome|chromium|crios|android|edg|firefox|fxios).)*safari/i.test(ua);
  return esIOS || esSafari;
}

function elegirFormato(): { mimeType: string; tipo: string; extension: string } | null {
  const webm = [
    { mimeType: "audio/webm;codecs=opus", tipo: "audio/webm", extension: "webm" },
    { mimeType: "audio/webm", tipo: "audio/webm", extension: "webm" },
  ];
  const mp4 = [
    { mimeType: "audio/mp4;codecs=mp4a.40.2", tipo: "audio/mp4", extension: "mp4" },
    { mimeType: "audio/mp4", tipo: "audio/mp4", extension: "mp4" },
  ];
  const candidatos = esWebKitDeApple() ? [...mp4, ...webm] : [...webm, ...mp4];
  return candidatos.find((c) => MediaRecorder.isTypeSupported(c.mimeType)) ?? null;
}

function formatoTiempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function nombreArchivo(extension: string): string {
  const d = new Date();
  const dos = (n: number) => n.toString().padStart(2, "0");
  return `visita-${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}-${dos(d.getHours())}${dos(d.getMinutes())}.${extension}`;
}

export default function GrabadorAudio({ onAudio, maxSegundos = 120 }: Props) {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [error, setError] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [archivoSubido, setArchivoSubido] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function liberarMicrofono() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Al desmontar: cortar la grabación y apagar el micrófono.
  useEffect(() => {
    return () => {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        rec.stop();
      }
      liberarMicrofono();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function grabar() {
    setError(null);
    setArchivoSubido(null);
    if (inputRef.current) inputRef.current.value = "";
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setEstado("no-disponible");
      setError(
        window.isSecureContext
          ? "Este navegador no permite grabar audio. Podés subir un archivo grabado con el celular."
          : "Para grabar, la página tiene que abrirse con https. Mientras tanto podés subir un archivo de audio."
      );
      return;
    }
    const formato = elegirFormato();
    if (!formato) {
      setEstado("no-disponible");
      setError("Este navegador no puede grabar en un formato compatible. Podés subir un archivo de audio.");
      return;
    }

    setEstado("pidiendo-permiso");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const nombre = e instanceof DOMException ? e.name : "";
      if (nombre === "NotFoundError" || nombre === "OverconstrainedError") {
        setEstado("no-disponible");
        setError("No encontramos un micrófono en este dispositivo. Podés subir un archivo de audio.");
      } else if (nombre === "NotReadableError") {
        setEstado("no-disponible");
        setError(
          "El micrófono está siendo usado por otra aplicación. Cerrala y probá de nuevo, o subí un archivo de audio."
        );
      } else {
        setEstado("sin-permiso");
        setError(
          "No tenemos permiso para usar el micrófono. Para grabar, habilitalo en la configuración del navegador (el ícono del candado junto a la dirección) y tocá «Probar de nuevo». Si no, podés subir un archivo de audio."
        );
      }
      return;
    }

    streamRef.current = stream;
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: formato.mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.onstop = () => {
      liberarMicrofono();
      const blob = new Blob(chunks, { type: formato.tipo });
      if (blob.size === 0) {
        setEstado("inicial");
        setError("La grabación quedó vacía. Probá grabar de nuevo.");
        return;
      }
      const file = new File([blob], nombreArchivo(formato.extension), { type: formato.tipo });
      setAudioUrl(URL.createObjectURL(blob));
      setEstado("grabado");
      onAudio(file);
    };

    const inicio = Date.now();
    setSegundos(0);
    timerRef.current = setInterval(() => {
      const transcurridos = Math.floor((Date.now() - inicio) / 1000);
      setSegundos(Math.min(transcurridos, maxSegundos));
      if (transcurridos >= maxSegundos) detener();
    }, 250);

    // timeslice: guarda pedazos cada segundo, así no se pierde todo si algo falla.
    recorder.start(1000);
    setEstado("grabando");
  }

  function detener() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  function escuchar() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }

  function volverAGrabar() {
    audioRef.current?.pause();
    setReproduciendo(false);
    setAudioUrl(null);
    setSegundos(0);
    onAudio(null);
    void grabar();
  }

  function elegirArchivo(file: File | null) {
    setArchivoSubido(file?.name ?? null);
    // Si venían de una grabación, la descartamos al subir un archivo.
    if (file) {
      audioRef.current?.pause();
      setReproduciendo(false);
      setAudioUrl(null);
      setSegundos(0);
      if (estado === "grabando") detener();
      setEstado("archivo");
    }
    onAudio(file);
  }

  function quitarArchivo() {
    setArchivoSubido(null);
    if (inputRef.current) inputRef.current.value = "";
    setEstado("inicial");
    onAudio(null);
  }

  const restante = maxSegundos - segundos;

  return (
    <div className="space-y-3">
      {estado === "inicial" && (
        <p className="text-sm text-muted-foreground">
          Grabá el audio de la visita en el momento, o subí un archivo de audio ya grabado. Podés
          grabar hasta {Math.round(maxSegundos / 60)} minutos.
        </p>
      )}

      {estado === "pidiendo-permiso" && (
        <p className="text-sm" role="status">
          Esperando permiso del micrófono… Tocá «Permitir» en el aviso del navegador.
        </p>
      )}

      {(estado === "grabando" || estado === "grabado") && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-2xl bg-salvia-suave/70 px-4 py-3"
          aria-live="polite"
        >
          {estado === "grabando" && (
            <span className="size-3.5 shrink-0 animate-pulse rounded-full bg-urgencia-critica" aria-hidden />
          )}
          <span className="font-heading text-3xl font-bold text-oliva-oscuro tabular-nums">
            {formatoTiempo(segundos)}
            <span className="text-base font-medium text-muted-foreground"> / {formatoTiempo(maxSegundos)}</span>
          </span>
          {estado === "grabando" && restante <= 15 && (
            <span className="text-sm font-semibold text-urgencia-critica-texto">Quedan {restante} s</span>
          )}
        </div>
      )}

      {error && (
        <p
          className="rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* El input de archivo está siempre disponible (las dos opciones). */}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
      />

      <div className="flex flex-wrap gap-3">
        {(estado === "inicial" || estado === "sin-permiso") && (
          <>
            <Button type="button" size="lg" onClick={grabar}>
              <Mic /> {estado === "sin-permiso" ? "Probar de nuevo" : "Grabar en el momento"}
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload /> Subir audio
            </Button>
          </>
        )}

        {estado === "pidiendo-permiso" && (
          <Button type="button" size="lg" disabled>
            <Mic /> Grabar
          </Button>
        )}

        {estado === "grabando" && (
          <Button
            type="button"
            size="lg"
            className="bg-urgencia-critica text-white hover:bg-urgencia-critica-texto"
            onClick={detener}
          >
            <Square /> Detener
          </Button>
        )}

        {estado === "grabado" && (
          <>
            <Button type="button" size="lg" onClick={escuchar}>
              {reproduciendo ? <Pause /> : <Play />} {reproduciendo ? "Pausar" : "Escuchar"}
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={volverAGrabar}>
              <RotateCcw /> Volver a grabar
            </Button>
          </>
        )}

        {estado === "archivo" && (
          <>
            <Button type="button" size="lg" variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload /> Cambiar archivo
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={quitarArchivo}>
              <RotateCcw /> Quitar
            </Button>
          </>
        )}

        {estado === "no-disponible" && (
          <Button type="button" size="lg" variant="outline" onClick={() => inputRef.current?.click()}>
            <MicOff /> {archivoSubido ? "Cambiar archivo" : "Subir audio"}
          </Button>
        )}
      </div>

      {archivoSubido && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="size-3.5 shrink-0 text-oliva" />
          Archivo: {archivoSubido}
        </p>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          className="hidden"
          onPlay={() => setReproduciendo(true)}
          onPause={() => setReproduciendo(false)}
          onEnded={() => setReproduciendo(false)}
        />
      )}
    </div>
  );
}
