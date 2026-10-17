"use client";

import { Home as HomeIcon, Heart, ListOrdered, LayoutDashboard, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModeToggle } from "./mode-toggle";

const LINKS = [
  { to: "/", label: "Inicio", icon: HomeIcon },
  { to: "/cargar", label: "Cargar", icon: Upload },
  { to: "/ranking", label: "Ranking", icon: ListOrdered },
  { to: "/campana", label: "Campaña", icon: Heart },
  { to: "/dashboard", label: "Panel", icon: LayoutDashboard },
] as const;

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <HomeIcon className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Rancho <span className="text-emerald-700 dark:text-emerald-500">Cero</span>
          </span>
        </Link>

        {/* Navegación */}
        <nav className="flex items-center gap-1">
          {LINKS.map(({ to, label, icon: Icon }) => {
            const activo = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                href={to}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activo
                    ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <div className="ml-1">
            <ModeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
