import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Rutas públicas del portal relevAI (la capa "madre"): no requieren sesión.
// El resto de la app (Cireneos / Rancho Cero) sí: sin sesión va al login.
const RUTAS_PUBLICAS = ["/", "/agregar-fundacion"];

// Sin sesión, las páginas protegidas redirigen al login (/dashboard). Solo mira
// si existe la cookie de sesión (chequeo rápido); el rol y la validez de la
// sesión los verifica Convex y el componente <Protegida>.
export function proxy(request: NextRequest) {
  if (RUTAS_PUBLICAS.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Todo menos el login, la API de auth, los archivos de Next y los estáticos.
  matcher: ["/((?!dashboard|api|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
