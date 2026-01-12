type MobileShellProps = {
  children: React.ReactNode
}

/**
 * Mobile-first wrapper that constrains the UI to a 360px ledger view.
 */
export default function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-zinc-50 via-zinc-50 to-zinc-100 text-zinc-900">
      <div className="flex min-h-screen w-full max-w-[360px] flex-col px-4 py-8">
        {children}
      </div>
    </div>
  )
}
