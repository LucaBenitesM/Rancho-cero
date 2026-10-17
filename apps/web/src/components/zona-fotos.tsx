"use client";

import { Button } from "@rancho-cero/ui/components/button";
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
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={fotos.length >= MAX_FOTOS}
      >
        Agregar fotos
      </Button>
      {fotos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {fotos.map((f, i) => (
            <li key={`${f.name}-${i}`} className="relative">
              <img
                src={previews[i]}
                alt=""
                className="h-24 w-full object-cover ring-1 ring-foreground/10"
              />
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label="Quitar foto"
                className="absolute right-1 top-1 bg-background/80 px-1 text-xs"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
