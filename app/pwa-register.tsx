"use client"

import { useEffect } from "react"

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    const register = async () => {
      try {
        // `sw.js` must be at the site root to control all routes.
        await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      } catch {
        // no-op: PWA is optional; don't break the app if registration fails
      }
    }

    void register()
  }, [])

  return null
}

