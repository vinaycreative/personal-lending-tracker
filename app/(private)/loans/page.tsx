"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Eye, Filter, Phone, Search } from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"

type PaymentStatus = "due" | "overdue" | "paid"

type Loan = {
  id: number
  borrower: string
  principal: number
  monthlyInterest: number
  nextDue: string
  status: PaymentStatus
  relationship: string
  interestDueDay: number
  lastPayment: string
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

const loans: Loan[] = [
  {
    id: 1,
    borrower: "Asha Traders",
    principal: 120000,
    monthlyInterest: 1800,
    nextDue: "Jan 11, 2026",
    status: "due",
    relationship: "Business",
    interestDueDay: 11,
    lastPayment: "Paid Dec 11",
  },
  {
    id: 2,
    borrower: "Ravi Metals",
    principal: 85000,
    monthlyInterest: 1275,
    nextDue: "Jan 11, 2026",
    status: "due",
    relationship: "Business",
    interestDueDay: 11,
    lastPayment: "Paid Dec 11",
  },
  {
    id: 3,
    borrower: "Sharma Transports",
    principal: 150000,
    monthlyInterest: 2400,
    nextDue: "Jan 09, 2026",
    status: "overdue",
    relationship: "Logistics",
    interestDueDay: 9,
    lastPayment: "Paid Nov 09",
  },
  {
    id: 4,
    borrower: "Meena Kirana",
    principal: 42000,
    monthlyInterest: 546,
    nextDue: "Jan 13, 2026",
    status: "due",
    relationship: "Retail",
    interestDueDay: 13,
    lastPayment: "Paid Dec 13",
  },
  {
    id: 5,
    borrower: "Lal Farms",
    principal: 69000,
    monthlyInterest: 900,
    nextDue: "Jan 07, 2026",
    status: "overdue",
    relationship: "Agri",
    interestDueDay: 7,
    lastPayment: "Paid Nov 07",
  },
  {
    id: 6,
    borrower: "Kunal Exports",
    principal: 98000,
    monthlyInterest: 1500,
    nextDue: "Jan 21, 2026",
    status: "paid",
    relationship: "Business",
    interestDueDay: 21,
    lastPayment: "Paid Jan 21",
  },
]

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
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${badgeStyles[status]}`}
    >
      {labels[status]}
    </span>
  )
}

export default function LoansPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all")
  const [query, setQuery] = useState("")

  const totals = useMemo(
    () =>
      loans.reduce(
        (acc, loan) => {
          acc.principal += loan.principal
          acc.monthlyInterest += loan.monthlyInterest
          if (loan.status === "due" || loan.status === "overdue") acc.active += 1
          return acc
        },
        { principal: 0, monthlyInterest: 0, active: 0 }
      ),
    []
  )

  const filteredLoans = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim()

    return loans
      .filter((loan) => (statusFilter === "all" ? true : loan.status === statusFilter))
      .filter((loan) =>
        normalizedQuery
          ? loan.borrower.toLowerCase().includes(normalizedQuery) ||
            loan.relationship.toLowerCase().includes(normalizedQuery)
          : true
      )
      .sort((a, b) => {
        const weight: Record<PaymentStatus, number> = { overdue: 0, due: 1, paid: 2 }
        return weight[a.status] - weight[b.status]
      })
  }, [query, statusFilter])

  const statusChips: { key: PaymentStatus | "all"; label: string; count: number }[] = [
    { key: "all", label: "All", count: loans.length },
    { key: "due", label: "Due", count: loans.filter((loan) => loan.status === "due").length },
    {
      key: "overdue",
      label: "Overdue",
      count: loans.filter((loan) => loan.status === "overdue").length,
    },
    { key: "paid", label: "Paid", count: loans.filter((loan) => loan.status === "paid").length },
  ]

  return (
    <MainLayout>
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">Loans</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Track every borrower in one place</h1>
        <p className="text-sm text-zinc-600">Clear totals, quick filters, actions within reach.</p>
      </header>

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
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Due
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              Overdue
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-600" />
              Paid
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {filteredLoans.map((loan) => (
            <article
              key={loan.id}
              className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{loan.borrower}</p>
                  <p className="text-xs text-zinc-600">
                    {loan.relationship} • Due on {loan.nextDue}
                  </p>
                </div>
                <StatusBadge status={loan.status} />
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
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Last payment: {loan.lastPayment}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50">
                    <Phone size={14} /> Call
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/loans/${loan.id}`)}
                    className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                  >
                    <Eye size={14} /> View Profile
                  </button>
                  <button className="rounded-md border border-zinc-200 bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800">
                    Mark Paid
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
