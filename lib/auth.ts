import { cookies } from "next/headers"

import { AUTH_COOKIE_NAME, AUTH_ENV } from "@/lib/auth/constants"

export type AuthConfig = {
  username: string
  pin: string
}

export function getAuthConfig(): AuthConfig {
  return {
    username: process.env[AUTH_ENV.username] ?? "arush",
    pin: process.env[AUTH_ENV.pin] ?? "0606",
  }
}

export async function setAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

