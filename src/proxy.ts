import { NextRequest, NextResponse } from "next/server";
import { currentUser, SESSION_COOKIE } from "@/server/auth";

export async function proxy(request: NextRequest) {
  const user = await currentUser(request.cookies.get(SESSION_COOKIE)?.value ?? null).catch(() => null);
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  if (!user.is_site_admin) return NextResponse.redirect(new URL("/plan", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
