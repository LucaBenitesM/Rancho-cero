// ─────────────────────────────────────────────────────────────
// Build de la web para Vercel.
//
// - En producción (Vercel) hay una CONVEX_DEPLOY_KEY cargada como variable de
//   entorno. Entonces desplegamos las funciones de Convex a producción y, en el
//   mismo paso, corremos `next build` con la NEXT_PUBLIC_CONVEX_URL de producción
//   ya inyectada por Convex. Así el front queda apuntando al backend correcto.
//
// - En local (sin CONVEX_DEPLOY_KEY) hacemos un `next build` normal.
//
// Docs: https://docs.convex.dev/production/hosting/vercel
// ─────────────────────────────────────────────────────────────

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(aqui, "../../../packages/backend");

const tieneDeployKey = Boolean(process.env.CONVEX_DEPLOY_KEY);

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (tieneDeployKey) {
  // Despliega Convex a prod y corre el build de Next con la URL de prod inyectada
  // como NEXT_PUBLIC_CONVEX_URL. Se ejecuta desde el paquete backend.
  console.log("[build] CONVEX_DEPLOY_KEY presente → convex deploy + next build");
  run(
    "npx",
    [
      "convex",
      "deploy",
      "--cmd-url-env-var-name",
      "NEXT_PUBLIC_CONVEX_URL",
      "--cmd",
      // Se corre con la URL de prod inyectada. Buildea solo la web del monorepo.
      "npm --prefix ../../apps/web run build:next",
    ],
    backendDir,
  );
} else {
  // Local / preview sin deploy key: build normal del front.
  console.log("[build] sin CONVEX_DEPLOY_KEY → next build");
  run("npm", ["run", "build:next"], aqui + "/..");
}
