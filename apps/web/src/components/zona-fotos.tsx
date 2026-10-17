"use client";

import { Button } from "@rancho-cero/ui/components/button";
import { Camera, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

export const MAX_FOTOS = 6;

// Zona única de fotos: de 1 a 6, en cualquier orden, sin títulos ni categorías.
// Solo maneja la lista de archivos (fotos / onChange), así se puede reemplazar
// por el componente de cámara sin tocar la página.
export function ZonaFotos({
  fotos,
  onChange,
}: {
  fotos: File[];
  onChange: (fotos: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const nuevas = Array.from(e.target.files ?? []);
    onChange([...fotos, ...nuevas].slice(0, MAX_FOTOS));
    // Permite volver a elegir el mismo archivo después de quitarlo.
    e.target.value = "";
  }

  function quitar(i: number) {
    onChange(fotos.filter((_, idx) => idx !== i));
  }

  // Previsualizaciones: se crean una vez por lista y se revocan.
  const previews = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos]);
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onElegir}
      />
      {fotos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-salvia/60 bg-salvia-suave/40 px-4 py-8 text-center transition-colors hover:border-salvia hover:bg-salvia-suave"
        >
          <Camera className="size-9 text-oliva" strokeWidth={1.5} aria-hidden />
          <span className="font-heading text-sm font-bold text-oliva-oscuro">Agregar fotos</span>
          <span className="text-xs text-muted-foreground">Sacá una foto o elegila de la galería</span>
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => inputRef.current?.click()}
          disabled={fotos.length >= MAX_FOTOS}
        >
          <Camera /> Agregar fotos
        </Button>
      )}
      {fotos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {fotos.map((f, i) => (
            <li key={`${f.name}-${i}`} className="relative">
              <img
                src={previews[i]}
                alt={`Foto ${i + 1} de la vivienda`}
                className="aspect-square w-full rounded-xl object-cover shadow-sm ring-1 ring-foreground/10"
              />
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label="Quitar foto"
                className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-tinta/70 text-white shadow transition-colors hover:bg-urgencia-critica"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
