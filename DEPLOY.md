# Deploy a producción (Vercel + Convex)

Guía para dejar Rancho Cero funcionando en Vercel con un backend de Convex en la
nube. Los pasos marcados **(vos)** necesitan tu login y hay que hacerlos a mano;
el código ya está configurado para soportar este flujo.

---

## Cómo funciona el build

`apps/web` tiene un build que detecta el entorno (`apps/web/scripts/build.mjs`):

- **En Vercel (producción):** si existe la variable `CONVEX_DEPLOY_KEY`, corre
  `convex deploy` (despliega las funciones de Convex a producción) y, en el mismo
  paso, hace `next build` inyectando la `NEXT_PUBLIC_CONVEX_URL` de producción.
- **En local:** sin `CONVEX_DEPLOY_KEY`, hace un `next build` normal.

Así, **Vercel despliega también Convex** en cada deploy de producción.

---

## Paso 1 — Deploy key de producción de Convex **(vos)**

En el dashboard de Convex (https://dashboard.convex.dev) → proyecto Rancho Cero →
**Settings → Deploy keys → Generate Production Deploy Key**. Copiá la key
(empieza con `prod:`).

> Nota: hoy el backend corre en un deployment **local** (`127.0.0.1:3210`). Para
> producción hay que tener un deployment en Convex Cloud. Si no existe, se crea
> con `npx convex deploy` una vez (pide login) o desde el dashboard.

---

## Paso 2 — Variables de entorno

### 2a. En **Vercel** (Project → Settings → Environment Variables, entorno *Production*)

| Variable | Valor | Para qué |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | la key `prod:...` del paso 1 | que el build despliegue Convex |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://<tu-deployment>.convex.site` | URL de HTTP actions (Better Auth en el front) |

> `NEXT_PUBLIC_CONVEX_URL` **no** hace falta cargarla a mano: la inyecta
> `convex deploy` durante el build. `NEXT_PUBLIC_CONVEX_SITE_URL` sí, porque es
> la variante `.site` del mismo deployment.

### 2b. En **Convex** (producción) — las carga el equipo

Estas se cargan en el deployment de producción de Convex, no en Vercel. Con la
deploy key:

```bash
# desde packages/backend, apuntando a producción:
npx convex env set ANTHROPIC_API_KEY   "sk-ant-..."        --prod
npx convex env set ELEVENLABS_API_KEY  "..."               --prod
npx convex env set SITE_URL            "https://<app>.vercel.app" --prod
# opcionales (tienen default en el código):
npx convex env set ANTHROPIC_MODEL     "claude-sonnet-5-5" --prod
npx convex env set ELEVENLABS_STT_MODEL "scribe_v1"        --prod
```

| Variable | Obligatoria | Default en código | Para qué |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | **Sí** | — | Claude (ficha + ajuste + explicación) |
| `ELEVENLABS_API_KEY` | **Sí** | — | ElevenLabs (audio → transcripción) |
| `SITE_URL` | **Sí** | — | Better Auth (`baseURL` y `trustedOrigins`) = la URL pública de Vercel |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-5-5` | fijar/cambiar modelo de Claude |
| `ELEVENLABS_STT_MODEL` | No | `scribe_v1` | modelo de transcripción |

> `SITE_URL` es circular con Vercel: necesitás la URL del proyecto. Para el primer
> deploy podés usar el dominio `*.vercel.app` que te asigna Vercel, y si después
> ponés un dominio propio, actualizás `SITE_URL`.

---

## Paso 3 — Linkear y desplegar **(vos)**

```bash
npm run deploy:setup     # vercel link (pide login)
npm run deploy:prod      # deploy a producción
```

El build en Vercel va a: desplegar Convex → `next build` con la URL de prod → publicar.

---

## Checklist de verificación

- [ ] `CONVEX_DEPLOY_KEY` y `NEXT_PUBLIC_CONVEX_SITE_URL` en Vercel (Production).
- [ ] `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `SITE_URL` en Convex prod.
- [ ] `npm run deploy:prod` termina sin errores.
- [ ] Abre el link de Vercel: Inicio, Nueva visita, Ranking e Historias.
- [ ] En producción, cargar los datos de ejemplo una vez si la base está vacía:
      `npx convex run casos:seed --prod`.
