import { NextResponse } from "next/server"

import { getAuthConfig, setAuthCookie } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { username?: string; pin?: string }
    const username = (body.username ?? "").trim()
    const pin = (body.pin ?? "").trim()

    const cfg = getAuthConfig()
    const ok = username === cfg.username && pin === cfg.pin

    if (!ok) {
      return NextResponse.json({ error: "Invalid username or PIN" }, { status: 401 })
    }

    await setAuthCookie()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

