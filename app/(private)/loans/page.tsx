"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, Filter, Phone, Search } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import MainLayout from "@/components/layout/MainLayout"
import { loansListQuery, type LoanStatus } from "@/queries/loanQueries"

type Loan = {
  id: string
  borrower: string
  principal: number
  monthlyInterest: number
  loanStatus: LoanStatus
  relationship: string
  interestDueDay: number
  phone: string | null
  startDate: string
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

function formatIsoDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return dateFormatter.format(date)
}

const badgeStyles: Record<"active" | "closed", string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-zinc-100 text-zinc-700 border-zinc-200",
}

function normalizeLoanStatus(status: LoanStatus): "active" | "closed" {
  return status === "closed" ? "closed" : "active"
}

function StatusBadge({ status }: { status: LoanStatus }) {
  const normalized = normalizeLoanStatus(status)
  const labels: Record<"active" | "closed", string> = {
    active: "Active",
    closed: "Closed",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${badgeStyles[normalized]}`}
    >
      {labels[normalized]}
    </span>
  )
}

export default function LoansPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all")
  const [query, setQuery] = useState("")

  const loansQuery = useQuery(loansListQuery())

  const loans = useMemo<Loan[]>(
    () =>
      (loansQuery.data ?? []).map((item) => ({
        id: item.id,
        borrower: item.borrower_name,
        principal: item.principal_amount,
        monthlyInterest: item.monthly_interest_amount,
        loanStatus: item.loan_status,
        relationship: item.relationship_type ?? "—",
        interestDueDay: item.interest_due_day,
        phone: item.borrower_phone,
        startDate: formatIsoDate(item.loan_start_date),
      })),
    [loansQuery.data]
  )

  const totals = useMemo(
    () =>
      loans.reduce(
        (acc, loan) => {
          if (normalizeLoanStatus(loan.loanStatus) === "active") {
            acc.principal += loan.principal
            acc.monthlyInterest += loan.monthlyInterest
            acc.active += 1
          }
          return acc
        },
        { principal: 0, monthlyInterest: 0, active: 0 }
      ),
    [loans]
  )

  const filteredLoans = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim()

    return loans
      .filter((loan) =>
        statusFilter === "all" ? true : normalizeLoanStatus(loan.loanStatus) === statusFilter
      )
      .filter((loan) =>
        normalizedQuery
          ? loan.borrower.toLowerCase().includes(normalizedQuery) ||
            loan.relationship.toLowerCase().includes(normalizedQuery)
          : true
      )
      .sort((a, b) => {
        const weight: Record<"active" | "closed", number> = { active: 0, closed: 1 }
        return (
          weight[normalizeLoanStatus(a.loanStatus)] - weight[normalizeLoanStatus(b.loanStatus)]
        )
      })
  }, [loans, query, statusFilter])

  const statusChips: { key: "all" | "active" | "closed"; label: string; count: number }[] = [
    { key: "all", label: "All", count: loans.length },
    {
      key: "active",
      label: "Active",
      count: loans.filter((l) => normalizeLoanStatus(l.loanStatus) === "active").length,
    },
    {
      key: "closed",
      label: "Closed",
      count: loans.filter((l) => normalizeLoanStatus(l.loanStatus) === "closed").length,
    },
  ]

  return (
    <MainLayout>
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">Loans</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Track every borrower in one place</h1>
        <p className="text-sm text-zinc-600">Clear totals, quick filters, actions within reach.</p>
      </header>

      {loansQuery.isLoading && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-600">Loading loans…</p>
        </section>
      )}

      {loansQuery.isError && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-800">Failed to load loans</p>
          <p className="text-xs text-red-700">Please refresh and try again.</p>
        </section>
      )}

      <section className="rounded-2xl bg-linear-to-r from-brand-50 via-white to-brand-50 p-4 shadow-sm ring-1 ring-brand-100">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
              Active Portfolio
            </p>
            <p className="text-3xl font-semibold leading-tight text-brand-900">
              {currency.format(totals.principal)}
            </p>
            <p className="text-sm text-brand-800">
              {totals.active} borrowers paying monthly interest.
            </p>
          </div>
          <div className="rounded-xl bg-white/90 px-3 py-2 text-right shadow-inner ring-1 ring-brand-100">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Monthly Interest</p>
            <p className="text-lg font-semibold text-zinc-900">
              {currency.format(totals.monthlyInterest)}
            </p>
            <p className="text-[11px] text-zinc-500">Expected every month</p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search borrower or relationship"
              className="h-11 w-full rounded-lg border border-zinc-200 pl-9 pr-3 text-sm text-zinc-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <button className="flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusChips.map((chip) => {
            const isActive = statusFilter === chip.key
            return (
              <button
                key={chip.key}
                onClick={() => setStatusFilter(chip.key)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? "border-brand-200 bg-brand-50 text-brand-800"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {chip.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    isActive ? "bg-brand-100 text-brand-800" : "bg-white text-zinc-600"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
            {filteredLoans.length} loans
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {filteredLoans.map((loan) => (
            <article
              key={loan.id}
              className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 capitalize">{loan.borrower}</p>
                  <p className="text-xs text-zinc-600">
                    {loan.relationship} • Started {loan.startDate}
                  </p>
                </div>
                <StatusBadge status={loan.loanStatus} />
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Principal</p>
                  <p className="font-semibold text-zinc-900">{currency.format(loan.principal)}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Monthly</p>
                  <p className="font-semibold text-zinc-900">
                    {currency.format(loan.monthlyInterest)}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Due Day</p>
                  <p className="font-semibold text-zinc-900">Every {loan.interestDueDay}th</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-dashed border-zinc-200 pt-2 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-600">
                  Interest is collected monthly. Use profile to manage payments.
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={loan.phone ? `tel:${loan.phone}` : undefined}
                    aria-disabled={!loan.phone}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium shadow-sm transition ${
                      loan.phone
                        ? "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                        : "border-zinc-200 bg-zinc-50 text-zinc-400 pointer-events-none"
                    }`}
                  >
                    <Phone size={14} /> Call
                  </a>
                  <button
                    type="button"
                    onClick={() => router.push(`/loans/${loan.id}`)}
                    className="rounded-md border border-zinc-200 bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Eye size={14} /> View Profile
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filteredLoans.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center">
              <p className="text-sm font-semibold text-zinc-900">No loans found</p>
              <p className="text-xs text-zinc-600">
                Adjust filters or clear the search to see all borrowers.
              </p>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  )
}
