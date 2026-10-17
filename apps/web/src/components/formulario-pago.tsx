"use client";

import { CreditCard, Loader2, Lock, X } from "lucide-react";
import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────
// FORMULARIO DE PAGO — MODO DEMO
//
// ⚠️ IMPORTANTE (privacidad y seguridad):
// Los datos de tarjeta (número, vencimiento, CVC, nombre) se usan SOLO para
// validar el formato en el navegador. NUNCA se guardan, NUNCA se envían al
// backend y NUNCA quedan en logs. Al confirmar, lo único que sale de este
// componente es el MONTO donado (vía onConfirmar), igual que antes.
//
// 👉 Para conectar un medio de pago real (ej. Mercado Pago / Stripe):
//    reemplazar el cuerpo de `handleConfirmar` por la creación de la preferencia
//    de pago en el backend (una action de Convex que llame a la API del medio
//    de pago con las credenciales del servidor) y redirigir al checkout externo.
//    Los datos de tarjeta deben ir al proveedor de pago, NO a nuestro backend.
// ─────────────────────────────────────────────────────────────

function formatoPesos(n: number): string {
  return n.toLocaleString("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 });
}

// Luhn: valida que el número de tarjeta sea plausible (formato, no que exista).
function luhnValido(num: string): boolean {
  const digitos = num.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(digitos)) return false;
  let suma = 0;
  let alternar = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let d = parseInt(digitos[i], 10);
    if (alternar) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
    alternar = !alternar;
  }
  return suma % 10 === 0;
}

function formatearNumero(valor: string): string {
  return valor
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function formatearVencimiento(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function vencimientoValido(mmYY: string): boolean {
  const m = mmYY.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mes = parseInt(m[1], 10);
  const anio = 2000 + parseInt(m[2], 10);
  if (mes < 1 || mes > 12) return false;
  const ahora = new Date();
  const finDeMes = new Date(anio, mes, 0, 23, 59, 59);
  return finDeMes >= ahora;
}

export function FormularioPago({
  monto,
  onCerrar,
  onConfirmar,
}: {
  monto: number;
  onCerrar: () => void;
  // Solo recibe el monto: los datos de tarjeta jamás salen de este componente.
  onConfirmar: (monto: number) => Promise<void>;
}) {
  const [nombre, setNombre] = useState("");
  const [numero, setNumero] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [cvc, setCvc] = useState("");
  const [intentado, setIntentado] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onCerrar]);

  const errores = {
    numero: !luhnValido(numero) ? "Número de tarjeta inválido" : "",
    vencimiento: !vencimientoValido(vencimiento) ? "Vencimiento inválido (MM/AA)" : "",
    cvc: !/^\d{3,4}$/.test(cvc) ? "Código de 3 o 4 dígitos" : "",
  };
  const valido = !errores.numero && !errores.vencimiento && !errores.cvc;

  async function handleConfirmar() {
    setIntentado(true);
    if (!valido) return;
    setProcesando(true);
    try {
      // ⚠️ Solo se pasa el MONTO. nombre/numero/vencimiento/cvc NO se envían
      // ni se guardan: quedan en el estado local y se descartan al cerrar.
      // 👉 Punto de integración de pago real (Mercado Pago/Stripe) — ver cabecera.
      await onConfirmar(monto);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Formulario de donación (demo)"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-t-3xl border border-border/60 bg-card shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold">Donar {formatoPesos(monto)}</span>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Aviso de DEMO (bien visible) */}
        <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-50 px-5 py-2.5 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Modo demo:</strong> no se realiza ningún cobro. Los datos de la tarjeta no se
            guardan ni se envían a ningún servidor.
          </span>
        </div>

        {/* Formulario */}
        <div className="space-y-3 p-5">
          <Campo label="Nombre en la tarjeta (opcional)">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Como figura en la tarjeta"
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/40"
            />
          </Campo>

          <Campo label="Número de tarjeta" error={intentado ? errores.numero : ""}>
            <input
              inputMode="numeric"
              value={numero}
              onChange={(e) => setNumero(formatearNumero(e.target.value))}
              placeholder="4111 1111 1111 1111"
              autoComplete="off"
              className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm tabular-nums outline-none focus:ring-1 ${
                intentado && errores.numero
                  ? "border-red-400 focus:ring-red-400/40"
                  : "border-border focus:border-green-500 focus:ring-green-500/40"
              }`}
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Vencimiento" error={intentado ? errores.vencimiento : ""}>
              <input
                inputMode="numeric"
                value={vencimiento}
                onChange={(e) => setVencimiento(formatearVencimiento(e.target.value))}
                placeholder="MM/AA"
                autoComplete="off"
                className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm tabular-nums outline-none focus:ring-1 ${
                  intentado && errores.vencimiento
                    ? "border-red-400 focus:ring-red-400/40"
                    : "border-border focus:border-green-500 focus:ring-green-500/40"
                }`}
              />
            </Campo>
            <Campo label="Cód. seguridad" error={intentado ? errores.cvc : ""}>
              <input
                inputMode="numeric"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123"
                autoComplete="off"
                className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm tabular-nums outline-none focus:ring-1 ${
                  intentado && errores.cvc
                    ? "border-red-400 focus:ring-red-400/40"
                    : "border-border focus:border-green-500 focus:ring-green-500/40"
                }`}
              />
            </Campo>
          </div>

          <button
            type="button"
            onClick={handleConfirmar}
            disabled={procesando}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:pointer-events-none disabled:opacity-50"
          >
            {procesando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando…
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                Donar {formatoPesos(monto)} (demo)
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-muted-foreground">
            Probá con una tarjeta de prueba, ej. 4111 1111 1111 1111
          </p>
        </div>
      </div>
    </div>
  );
}

function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
      {children}
      {error ? <p className="mt-1 text-[10px] text-red-500">{error}</p> : null}
    </div>
  );
}
