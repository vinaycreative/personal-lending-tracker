import PublicLayout from "../components/layout/PublicLayout"

export default function Home() {
  return (
    <PublicLayout title="Login" subtitle="Ledger-friendly sign in for daily lending operations.">
      <div className="flex min-h-[70vh] items-center justify-center">
        <form className="w-full space-y-5">
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-zinc-800">Sign in to continue</p>
            <p className="text-xs text-zinc-500">Prefilled for quick access on your device.</p>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="text-zinc-700">Username</span>
            <input
              type="text"
              name="username"
              defaultValue="arush"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-zinc-700">PIN</span>
            <input
              type="password"
              name="pin"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue="0606"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm tracking-[0.2em] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
          >
            Sign in
          </button>

          <p className="text-xs text-center text-zinc-500">
            Secure on this device. Change PIN anytime from Settings.
          </p>
        </form>
      </div>
    </PublicLayout>
  )
}
