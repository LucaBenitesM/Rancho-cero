"use client";

import { api } from "@rancho-cero/backend/convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Mic,
  RotateCcw,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

type Estado = "idle" | "subiendo" | "procesando" | "listo" | "error";

export default function CargarPage() {
  const generarUploadUrl = useMutation(api.visitas.generarUploadUrl);
  const procesarVisita = useAction(api.visitas.procesarVisita);

  const [alias, setAlias] = useState("");
  const [barrio, setBarrio] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [audio, setAudio] = useState<File | null>(null);
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState<string | null>(null);
  const [casoId, setCasoId] = useState<string | null>(null);

  const fotoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);

  const puedeProcesar =
    consentimiento && fotos.length > 0 && alias.trim() !== "" && estado !== "subiendo" && estado !== "procesando";

  async function subirArchivo(file: File): Promise<string> {
    const url = await generarUploadUrl();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("No se pudo subir un archivo.");
    const { storageId } = (await res.json()) as { storageId: string };
    return storageId;
  }

  async function handleProcesar() {
    setError(null);
    try {
      setEstado("subiendo");
      const idsFotos = await Promise.all(fotos.map(subirArchivo));
      const idAudio = audio ? await subirArchivo(audio) : undefined;

      setEstado("procesando");
      const { casoId } = await procesarVisita({
        alias: alias.trim(),
        barrio: barrio.trim() || "Sin barrio",
        consentimiento,
        fotos: idsFotos,
        audioStorageId: idAudio,
      });

      setCasoId(casoId);
      setEstado("listo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error al procesar.");
      setEstado("error");
    }
  }

  function reiniciar() {
    setEstado("idle");
    setError(null);
    setCasoId(null);
  }

  // Pantalla de éxito
  if (estado === "listo") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-3 text-lg font-semibold">Visita procesada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La IA completó la ficha. Revisá los campos marcados{" "}
          <span className="font-medium">a confirmar</span> y resolvelos para que el caso entre al
          ranking.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/ranking"
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Ir al ranking
          </Link>
          <button
            type="button"
            onClick={() => {
              setAlias("");
              setBarrio("");
              setConsentimiento(false);
              setFotos([]);
              setAudio(null);
              reiniciar();
            }}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Cargar otra visita
          </button>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">caso {casoId}</p>
      </div>
    );
  }

  const procesando = estado === "subiendo" || estado === "procesando";

  return (
    <div className="min-h-full bg-emerald-50/30 dark:bg-transparent">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <header className="mb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Cargar visita</h1>
              <p className="text-xs text-muted-foreground">
                Fotos + audio → ficha automática
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          {/* Identidad anónima */}
          <div className="space-y-2">
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Alias anónimo (ej. Familia I)"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
            />
            <input
              type="text"
              value={barrio}
              onChange={(e) => setBarrio(e.target.value)}
              placeholder="Barrio"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>

          {/* Fotos */}
          <button
            type="button"
            onClick={() => fotoInput.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4 text-left transition-colors hover:border-emerald-500/50"
          >
            <ImagePlus className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <div className="text-sm font-medium">Fotos de la vivienda</div>
              <div className="text-xs text-muted-foreground">
                {fotos.length > 0 ? `${fotos.length} foto(s) seleccionada(s)` : "5–6 fotos, sin personas"}
              </div>
            </div>
          </button>
          <input
            ref={fotoInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
          />

          {/* Audio */}
          <button
            type="button"
            onClick={() => audioInput.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4 text-left transition-colors hover:border-emerald-500/50"
          >
            <Mic className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <div className="text-sm font-medium">Audio de la visita</div>
              <div className="text-xs text-muted-foreground">
                {audio ? audio.name : "máximo 2 minutos (opcional en la demo)"}
              </div>
            </div>
          </button>
          <input
            ref={audioInput}
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
          />

          {/* Consentimiento (obligatorio) */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-card p-3.5">
            <input
              type="checkbox"
              checked={consentimiento}
              onChange={(e) => setConsentimiento(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span className="text-xs leading-relaxed">
              La familia dio su <span className="font-medium">consentimiento</span> para cargar sus
              datos. (obligatorio)
            </span>
          </label>

          {/* Error */}
          {estado === "error" && error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={handleProcesar}
                  className="mt-1.5 inline-flex items-center gap-1 font-medium underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reintentar (no se pierden las fotos ni el audio)
                </button>
              </div>
            </div>
          )}

          {/* Procesar */}
          <button
            type="button"
            disabled={!puedeProcesar}
            onClick={handleProcesar}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-40"
          >
            {procesando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {estado === "subiendo" ? "Subiendo archivos…" : "Analizando con IA…"}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Procesar visita
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-muted-foreground">
            Datos simulados · la IA completa la ficha y marca lo dudoso "a confirmar"
          </p>
        </div>
      </div>
    </div>
  );
}
