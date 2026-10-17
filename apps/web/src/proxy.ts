import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Sin sesión, cualquier página redirige al login (/dashboard). Solo mira si
// existe la cookie de sesión (chequeo rápido); el rol y la validez de la
// sesión los verifica Convex y el componente <Protegida>.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Todo menos el login, la API de auth, los archivos de Next y los estáticos.
  matcher: ["/((?!dashboard|api|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
