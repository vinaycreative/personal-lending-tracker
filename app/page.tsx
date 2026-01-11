import PublicLayout from "../components/layout/PublicLayout"

export default function Home() {
  return (
    <PublicLayout title="Login" subtitle="Ledger-friendly sign in for daily lending operations.">
      <form className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700">Mobile number</span>
          <input
            type="tel"
            inputMode="tel"
            placeholder="10-digit number"
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-0"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700">PIN</span>
          <input
            type="password"
            placeholder="4-6 digit PIN"
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-0"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
        >
          Sign in
        </button>
      </form>
      <p className="mt-4 text-xs text-zinc-600">
        Note: This is a ledger-style tracker. No EMI schedules or compounding assumptions are
        applied.
      </p>
    </PublicLayout>
  )
}
