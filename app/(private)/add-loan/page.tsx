"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { createLoanMutation, type CreateLoanInput } from "@/queries/loanQueries"
import MainLayout from "@/components/layout/MainLayout"

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

const today = new Date()
const defaultStartDate = today.toISOString().slice(0, 10)
const defaultInterestDay = Math.min(30, today.getDate())

const durationLabels: Record<string, string> = {
  "1m": "1 month",
  "4m": "4 months",
  "6m": "6 months",
  "12m": "1 year",
}

const durationToMonths: Record<string, number> = { "1m": 1, "4m": 4, "6m": 6, "12m": 12 }

export default function AddLoanPage() {
  const formId = "add-loan-form"
  const [borrowerName, setBorrowerName] = useState("")
  const [phone, setPhone] = useState("")
  const [relationship, setRelationship] = useState("friend")
  const [amount, setAmount] = useState<string>("")
  const [interestPercent, setInterestPercent] = useState<string>("")
  const [interestDueDay, setInterestDueDay] = useState<number>(defaultInterestDay)
  const [startDate, setStartDate] = useState<string>(defaultStartDate)
  const [returnDuration, setReturnDuration] = useState<string>("4m")
  const [error, setError] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const createLoan = useMutation(createLoanMutation(queryClient))

  const monthlyInterest = useMemo(() => {
    const principal = Number(amount)
    const rate = Number(interestPercent)
    if (!principal || !rate) return 0
    return principal * (rate / 100)
  }, [amount, interestPercent])

  const expectedReturnDate = useMemo(() => {
    if (!startDate) return ""
    const monthsMap: Record<string, number> = { "1m": 1, "4m": 4, "6m": 6, "12m": 12 }
    const monthsToAdd = monthsMap[returnDuration] ?? 0
    const base = new Date(`${startDate}T00:00:00`)
    base.setMonth(base.getMonth() + monthsToAdd)
    return base.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }, [returnDuration, startDate])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError(null)

    const payload: CreateLoanInput = {
      borrower: {
        name: borrowerName.trim(),
        phone: phone || undefined,
        relationship_type: relationship || undefined,
      },
      loan: {
        principal_amount: Number(amount) || 0,
        interest_percentage: Number(interestPercent) || 0,
        interest_due_day: interestDueDay,
        loan_start_date: startDate,
        return_months: durationToMonths[returnDuration] ?? null,
      },
    }

    try {
      await createLoan.mutateAsync(payload)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create loan"
      setError(message)
    }
  }

  return (
    <MainLayout>
      <div className="mb-5 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
          Add Loan
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">Create a new loan</h1>
        <p className="text-sm text-zinc-600">
          Clean inputs, clear totals, action anchored at bottom.
        </p>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-4 rounded-2xl bg-linear-to-r from-brand-50 via-white to-brand-50 p-4 ring-1 ring-brand-100 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-brand-700">
              Monthly
            </p>
            <p className="text-3xl font-semibold text-brand-900 leading-tight">
              {monthlyInterest ? currency.format(monthlyInterest) : "₹0"}
            </p>
            <p className="text-xs text-brand-800">
              Interest is paid monthly until principal is returned.
            </p>
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-2 text-right shadow-inner ring-1 ring-brand-100">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Return target</p>
            <p className="text-sm font-semibold text-zinc-900">
              {expectedReturnDate || "Select start + duration"}
            </p>
            <p className="text-[11px] text-zinc-500">Due day: {interestDueDay}</p>
          </div>
        </div>
      </div>

      <form id={formId} onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Borrower
              </p>
              <p className="text-sm text-zinc-700">Who are you lending to?</p>
            </div>
          </header>

          <div className="space-y-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-900">Borrower Name</span>
              <input
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                placeholder="e.g. Asha Traders"
                className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm text-zinc-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                required
              />
            </label>

            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-900">Phone</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile"
                  className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm text-zinc-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-900">Relationship Type</span>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="family">Family</option>
                  <option value="friend">Friend</option>
                  <option value="business">Business</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Loan
              </p>
              <p className="text-sm text-zinc-700">Principal and rate</p>
            </div>
          </header>

          <div className="space-y-3">
            <label className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-900">Loan Amount</span>
                {amount && (
                  <span className="text-xs font-semibold text-brand-700">
                    {currency.format(Number(amount))}
                  </span>
                )}
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ amount"
                className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm text-zinc-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-900">
                Interest Percentage (per month)
              </span>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  value={interestPercent}
                  onChange={(e) => setInterestPercent(e.target.value)}
                  placeholder="e.g. 1.5%"
                  className="h-11 w-full rounded-lg border border-zinc-200 px-3 pr-10 text-sm text-zinc-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  required
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-500">
                  %
                </span>
              </div>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-900">Monthly Interest</span>
                <input
                  value={monthlyInterest ? currency.format(monthlyInterest) : ""}
                  placeholder="Auto calculated"
                  readOnly
                  className="h-11 w-full rounded-lg border border-brand-100 bg-brand-50 px-3 text-sm font-semibold text-brand-900 shadow-sm"
                />
              </label>

              <div className="space-y-1 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900 ring-1 ring-brand-100">
                <p className="text-[11px] uppercase tracking-wide text-brand-800">Helper</p>
                <p>Interest is collected every month until you receive the principal back.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Schedule
              </p>
              <p className="text-sm text-zinc-700">Due dates and duration</p>
            </div>
          </header>

          <div className="space-y-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-900">Interest Due Day (1–30)</span>
              <input
                type="number"
                min={1}
                max={30}
                value={interestDueDay}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setInterestDueDay(Math.min(30, Math.max(1, next || 1)))
                }}
                className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm text-zinc-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <p className="text-xs text-zinc-600">
                Defaults to today&apos;s date for this month.
              </p>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-900">Loan Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm text-zinc-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-900">Loan Return Duration</span>
                <select
                  value={returnDuration}
                  onChange={(e) => setReturnDuration(e.target.value)}
                  className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="1m">1 month</option>
                  <option value="4m">4 months</option>
                  <option value="6m">6 months</option>
                  <option value="12m">1 year</option>
                </select>
                {expectedReturnDate && (
                  <p className="text-xs text-zinc-600">
                    Expected return by{" "}
                    <span className="font-semibold text-zinc-900">{expectedReturnDate}</span>
                  </p>
                )}
              </label>
            </div>
          </div>
        </section>
      </form>

      <div className="pointer-events-none fixed inset-x-0 bottom-[88px] z-30 px-4">
        <div className="pointer-events-auto rounded-2xl bg-white p-3 shadow-lg ring-1 ring-brand-100">
          <button
            type="submit"
            form={formId}
            disabled={createLoan.isPending}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {createLoan.isPending ? "Creating..." : "Create Loan"}
          </button>
        </div>
      </div>
    </MainLayout>
  )
}
