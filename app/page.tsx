"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import PublicLayout from "@/components/layout/PublicLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Home() {
  const [isPinVisible, setIsPinVisible] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const form = new FormData(e.currentTarget)
      const username = String(form.get("username") ?? "")
      const pin = String(form.get("pin") ?? "")

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, pin }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "Login failed")
        return
      }

      const next = searchParams.get("next")
      router.replace(next && next.startsWith("/") ? next : "/dashboard")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PublicLayout title="Login" subtitle="Ledger-friendly sign in for daily lending operations.">
      <form className="w-full space-y-6" onSubmit={onSubmit}>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-zinc-900">Sign in to continue</p>
          <p className="text-xs text-zinc-500">Prefilled for quick access on your device.</p>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium text-zinc-800">
            Username
          </label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            defaultValue="arush"
            placeholder="Enter your username"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="pin" className="text-sm font-medium text-zinc-800">
            PIN
          </label>
          <div className="relative">
            <Input
              id="pin"
              name="pin"
              type={isPinVisible ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="current-password"
              defaultValue="0606"
              maxLength={8}
              className="pr-16 tracking-[0.28em]"
              aria-describedby="pin-help"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setIsPinVisible((v) => !v)}
              className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
              aria-label={isPinVisible ? "Hide PIN" : "Show PIN"}
              disabled={isSubmitting}
            >
              {isPinVisible ? "Hide" : "Show"}
            </button>
          </div>
          <p id="pin-help" className="text-xs text-zinc-500">
            Secure on this device. Change PIN anytime from Settings.
          </p>
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-lg text-sm font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </PublicLayout>
  )
}
