"use client"

import Link from "next/link"
import { AlertTriangle, CalendarClock, Phone } from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { dashboardQuery } from "@/queries/dashboardQueries"
import { collectMonthlyInterestMutation } from "@/queries/loanQueries"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FullScreenLoader } from "@/components/ui/full-screen-loader"
import moment from "moment"
import { useMemo, useState } from "react"

type PaymentStatus = "due" | "overdue" | "paid"

function formatDisplayDate(dateIso: string) {
  const m = moment.utc(dateIso, "YYYY-MM-DD", true)
  if (!m.isValid()) return dateIso
  return m.format("MMM DD, YYYY")
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

const badgeStyles: Record<PaymentStatus, string> = {
  paid: "bg-green-50 text-green-700 border-green-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  due: "bg-amber-50 text-amber-700 border-amber-200",
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const labels: Record<PaymentStatus, string> = {
    paid: "Paid",
    overdue: "Overdue",
    due: "Due Today",
  }

  return (
    <span
      className={`inline-flex items-center absolute right-0 top-0 rounded-full border px-3 py-1 text-xs font-medium ${badgeStyles[status]}`}
    >
      {labels[status]}
    </span>
  )
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery(dashboardQuery())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null)
  const [selectedBorrowerName, setSelectedBorrowerName] = useState<string | null>(null)

  const baseCollectOptions = useMemo(
    () => collectMonthlyInterestMutation(queryClient),
    [queryClient]
  )
  const collectMutation = useMutation({
    ...baseCollectOptions,
    onSuccess: (...args) => {
      baseCollectOptions.onSuccess?.(...args)
      setConfirmOpen(false)
      setSelectedLoanId(null)
      setSelectedBorrowerName(null)
    },
  })

  const asOfDateIso = data?.as_of_date ?? new Date().toISOString().slice(0, 10)
  const todayDisplay = formatDisplayDate(asOfDateIso)

  const totals = {
    principal: data?.totals.total_principal ?? 0,
    monthlyInterest: data?.totals.total_monthly_interest ?? 0,
  }

  const needToCollect = data?.collection_focus.need_to_collect ?? 0
  const interestDueToday = data?.collection_focus.interest_due_today ?? 0
  const overdueInterest = data?.collection_focus.overdue_interest ?? 0
  const dueTodayCount = data?.collection_focus.due_today_count ?? 0
  const overdueCount = data?.collection_focus.overdue_count ?? 0

  const todaysDue =
    data?.todays_due.map((loan) => ({
      id: loan.id,
      borrower: loan.borrower_name,
      borrowerPhone: loan.borrower_phone,
      principal: loan.principal_amount,
      monthlyInterest: loan.monthly_interest_amount,
      dueDate: formatDisplayDate(loan.next_due_date),
      dueDateIso: loan.next_due_date,
      status: loan.payment_status as PaymentStatus,
    })) ?? []

  if (isLoading) {
    return <FullScreenLoader label="Loading dashboard…" variant="content" />
  }

  return (
    <MainLayout>
      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="collect-dialog-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200">
            <div className="border-b border-zinc-200 px-5 py-4">
              <p id="collect-dialog-title" className="text-sm font-semibold text-zinc-900">
                Confirm collection
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Mark interest as collected for{" "}
                <span className="font-semibold text-zinc-900">
                  {selectedBorrowerName ?? "this borrower"}
                </span>
                ?
              </p>
            </div>

            <div className="px-5 py-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                This will update the due record and schedule the next month payment.
              </div>
              {collectMutation.isError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  Failed to update. Please try again.
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-4">
              <button
                onClick={() => {
                  if (collectMutation.isPending) return
                  setConfirmOpen(false)
                  setSelectedLoanId(null)
                  setSelectedBorrowerName(null)
                }}
                disabled={collectMutation.isPending}
                className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedLoanId) return
                  collectMutation.mutate({ loanId: selectedLoanId, asOf: asOfDateIso })
                }}
                disabled={!selectedLoanId || collectMutation.isPending}
                className="inline-flex items-center rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {collectMutation.isPending ? "Updating…" : "Yes, mark collected"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-red-800">Couldn’t load dashboard</p>
          <p className="text-xs text-red-700">Please refresh and try again.</p>
        </div>
      ) : null}

      {/* Total Collection */}
      <section className="rounded-2xl bg-linear-to-r from-brand-50 via-white to-brand-50 p-6 shadow-sm ring-1 ring-brand-100">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
              Collection focus
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
              {currency.format(needToCollect)}
            </h1>
            <p className="text-sm text-zinc-700">
              Due today plus overdue interest waiting to be collected.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700 ring-1 ring-amber-100">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {dueTodayCount} due today
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700 ring-1 ring-red-100">
                <span className="h-2 w-2 rounded-full bg-red-600" />
                {overdueCount} overdue
              </span>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-inner">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Due today</p>
                <CalendarClock className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-1 text-xl font-semibold text-zinc-900">
                {currency.format(interestDueToday)}
              </p>
              <p className="text-xs text-zinc-600">Interest expected by {todayDisplay}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-inner">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Overdue</p>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <p className="mt-1 text-xl font-semibold text-red-700">
                {currency.format(overdueInterest)}
              </p>
              <p className="text-xs text-zinc-600">Waiting beyond due date</p>
            </div>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 grid-rows-2 gap-4">
        {[
          { label: "Total Principal Lent", value: totals.principal },
          { label: "Monthly Interest Expected", value: totals.monthlyInterest },
          { label: "Interest Due Today", value: interestDueToday },
          { label: "Overdue Interest Amount", value: overdueInterest },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-xs text-zinc-500 mb-2">{item.label}</p>
            <p className="text-xl font-semibold tracking-tight text-zinc-900">
              {currency.format(item.value)}
            </p>
          </div>
        ))}
      </section>

      <section className="sticky top-0 z-10 flex max-h-[calc(100vh-0.75rem)] min-h-[calc(100vh-0.75rem)] flex-col rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
          <div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-base font-semibold text-zinc-900">
                Today&apos;s Due - <span className="text-xs text-zinc-600">{todayDisplay}</span>
              </h2>
              <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-xs font-medium text-zinc-700 border border-zinc-200">
                {todaysDue.length} borrowers
              </span>
            </div>

            <p className="text-xs text-zinc-600">
              Borrowers who owe interest today or are already overdue.
            </p>
          </div>
        </div>

        <div className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4">
          {todaysDue.map((loan) => (
            <div
              key={loan.id}
              className={`flex flex-col gap-4 rounded-2xl border px-4 py-4 shadow-sm ${
                loan.status === "overdue"
                  ? "border-red-200 bg-red-50/70 ring-1 ring-red-100"
                  : "border-zinc-200 bg-white ring-1 ring-amber-100/60"
              }`}
            >
              <div className="relative">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900 mb-2">{loan.borrower}</p>
                  <div className="flex flex-row  gap-2 text-xs text-zinc-600">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 ${
                        loan.status === "overdue"
                          ? "bg-red-50 text-red-700 ring-red-100"
                          : "bg-amber-50 text-amber-700 ring-amber-100"
                      }`}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      Due {loan.dueDate}
                    </span>
                    {loan.status === "overdue" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-red-700 ring-1 ring-red-200">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Needs attention
                      </span>
                    )}
                  </div>
                </div>
                <StatusBadge status={loan.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Principal</p>
                  <p className="text-lg font-semibold text-zinc-900">
                    {currency.format(loan.principal)}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Monthly</p>
                  <p className="text-lg font-semibold text-zinc-900">
                    {currency.format(loan.monthlyInterest)}
                  </p>
                </div>
              </div>

              <div className="flex flex-row gap-2 text-xs text-zinc-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-zinc-200">
                  Interest cycle: monthly
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ring-1 ${
                    loan.status === "overdue"
                      ? "bg-red-50 text-red-700 ring-red-100"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  }`}
                >
                  {loan.status === "overdue" ? "Collection priority: high" : "On track"}
                </span>
              </div>

              <div className="flex flex-row gap-2">
                {loan.borrowerPhone ? (
                  <a
                    href={`tel:${loan.borrowerPhone}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                  >
                    <Phone size={14} /> Call
                  </a>
                ) : (
                  <button
                    disabled
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-zinc-300 px-3 py-2 text-xs font-semibold text-white shadow-sm"
                  >
                    <Phone size={14} /> No phone
                  </button>
                )}

                <Link
                  href={`/loans/${loan.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                >
                  View details
                </Link>

                <button
                  onClick={() => {
                    setSelectedLoanId(loan.id)
                    setSelectedBorrowerName(loan.borrower)
                    setConfirmOpen(true)
                  }}
                  disabled={collectMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark collected
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </MainLayout>
  )
}
