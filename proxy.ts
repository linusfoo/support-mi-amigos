import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: no cookie means "go log in". Real session checks
// happen on the server in requireUser()/requireAdmin().
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("sma_session");
  const onLogin = request.nextUrl.pathname === "/login";
  if (!hasSession && !onLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|ico|webp)$).*)"],
};
