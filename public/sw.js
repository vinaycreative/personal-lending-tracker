/* eslint-disable no-restricted-globals */

// Bump this to force-refresh cached app shell after deployments/updates.
const CACHE_VERSION = "pll-v2"
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`

// Keep this list small; Next.js will handle most caching at the HTTP layer.
const APP_SHELL_URLS = ["/", "/manifest.webmanifest", "/icon.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE)
      await cache.addAll(APP_SHELL_URLS)
      await self.skipWaiting()
    })()
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k.startsWith("app-shell-") && k !== APP_SHELL_CACHE)
          .map((k) => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  const url = new URL(req.url)

  // Don’t cache Supabase/API calls; keep data fresh.
  if (url.pathname.startsWith("/api/")) return

  // Navigation: network-first, fallback to cached "/"
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req)
        } catch {
          const cache = await caches.open(APP_SHELL_CACHE)
          const cached = await cache.match("/")
          return cached || new Response("Offline", { status: 503 })
        }
      })()
    )
    return
  }

  // Static-ish assets: cache-first, fallback to network.
  event.respondWith(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE)
      const cached = await cache.match(req)
      if (cached) return cached

      const res = await fetch(req)
      // Only cache successful same-origin responses.
      if (res && res.ok && url.origin === self.location.origin) {
        cache.put(req, res.clone()).catch(() => {})
      }
      return res
    })()
  )
})
