import { NextResponse, type NextRequest } from "next/server"

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants"

const PRIVATE_PREFIXES = ["/dashboard", "/add-loan", "/loans", "/reports", "/settings"]

function isPrivatePath(pathname: string) {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAuthApi = pathname.startsWith("/api/auth/")
  const isApi = pathname.startsWith("/api/")

  const authed = req.cookies.get(AUTH_COOKIE_NAME)?.value === "1"

  // If already logged in, keep them out of the login page.
  if (pathname === "/" && authed) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // Allow login/logout endpoints.
  if (isAuthApi) return NextResponse.next()

  // Protect private pages and private APIs.
  if (!authed && (isPrivatePath(pathname) || (isApi && !isAuthApi))) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = req.nextUrl.clone()
    url.pathname = "/"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

