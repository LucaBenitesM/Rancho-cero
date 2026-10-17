"use client";

// Página TEMPORAL para probar el grabador de audio. Borrar cuando se integre en Nueva visita.

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rancho-cero/ui/components/card";
import { useState } from "react";

import GrabadorAudio from "@/components/grabador-audio";

export default function PruebaCapturaPage() {
  const [audio, setAudio] = useState<File | null>(null);

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-6 overflow-y-auto">
      <header>
        <h1 className="text-xl font-semibold">Prueba de captura (temporal)</h1>
        <p className="text-sm text-muted-foreground">
          Página para probar el grabador de audio antes de integrarlo en Nueva visita.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Audio de la visita</CardTitle>
          <CardDescription>Máximo 2 minutos. Lo transcribe ElevenLabs.</CardDescription>
        </CardHeader>
        <CardContent>
          <GrabadorAudio onAudio={setAudio} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>File que recibiría Nueva visita</CardTitle>
        </CardHeader>
        <CardContent>
          {audio ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" data-testid="resultado">
              <dt className="text-muted-foreground">Nombre</dt>
              <dd>{audio.name}</dd>
              <dt className="text-muted-foreground">Tipo</dt>
              <dd>{audio.type || "(sin tipo)"}</dd>
              <dt className="text-muted-foreground">Tamaño</dt>
              <dd>{(audio.size / 1024).toFixed(1)} KB</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no hay audio.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
