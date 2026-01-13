import { Loader2Icon } from "lucide-react"

type FullScreenLoaderProps = {
  label?: string
  variant?: "content" | "fullscreen"
}

export function FullScreenLoader({
  label = "Loading…",
  variant = "content",
}: FullScreenLoaderProps) {
  const wrapperClasses =
    variant === "fullscreen"
      ? "fixed inset-0 z-[100] flex items-center justify-center bg-white"
      : "flex h-full w-full items-center justify-center bg-white"

  return (
    <div className={wrapperClasses}>
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
        <Loader2Icon className="h-10 w-10 animate-spin text-brand-600" />
        <span className="text-sm font-medium text-zinc-600">{label}</span>
      </div>
    </div>
  )
}

