import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/v1/")) {
    // The API sees this server's address, not the visitor's. Pass the visitor's IP along for
    // rate limiting, signed with a shared key so direct API callers cannot fake it.
    const headers = new Headers(request.headers);
    headers.set("x-kainna-client-ip", (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim());
    headers.set("x-kainna-proxy-key", process.env.PROXY_SHARED_KEY ?? "");
    return NextResponse.next({ request: { headers } });
  }
  if (!request.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();
  const cookie = request.headers.get("cookie") ?? "";
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/v1/auth/me`, { headers: { cookie }, cache: "no-store" }).catch(() => null);
  if (!response?.ok) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const result = await response.json() as { user: { is_site_admin: boolean } };
    if (!result.user.is_site_admin) return NextResponse.redirect(new URL("/plan", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/v1/:path*"] };
