"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModeToggle } from "./mode-toggle";

const LINKS = [
  { to: "/", label: "Inicio" },
  { to: "/nueva-visita", label: "Nueva visita" },
  { to: "/ranking", label: "Ranking" },
  { to: "/campana", label: "Campaña" },
] as const;

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
        {/* Wordmark */}
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="text-base font-semibold tracking-tight text-foreground">Rancho Cero</span>
          <span className="h-1.5 w-1.5 rounded-full bg-teal-700 dark:bg-teal-500" aria-hidden />
        </Link>

        {/* Navegación */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {LINKS.map(({ to, label }) => {
            const activo = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                href={to}
                className={`relative px-2.5 py-1.5 text-[13px] font-medium transition-colors sm:px-3 ${
                  activo
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {activo && (
                  <span className="absolute inset-x-2.5 -bottom-[1px] h-[2px] rounded-full bg-teal-700 dark:bg-teal-500 sm:inset-x-3" />
                )}
              </Link>
            );
          })}
          <div className="ml-1 sm:ml-2">
            <ModeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
