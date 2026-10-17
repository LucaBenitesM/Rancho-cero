import Image from "next/image";

// Pie de página con la identidad de Cireneos. Solo informativo.
export default function Footer() {
  return (
    <footer className="bg-oliva text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <div className="flex items-center gap-3">
          <Image
            src="/imagenes/logo-cireneos.png"
            alt="Logo de Cireneos"
            width={40}
            height={40}
            className="size-10 rounded-full"
          />
          <div>
            <p className="font-heading text-sm font-bold tracking-wide uppercase">Rancho Cero</p>
            <p className="text-xs text-white/75">Un programa de Cireneos · uso interno del equipo</p>
          </div>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-white/75">
          Por un Uruguay con Rancho Cero: un hogar digno para cada familia.
        </p>
      </div>
    </footer>
  );
}
