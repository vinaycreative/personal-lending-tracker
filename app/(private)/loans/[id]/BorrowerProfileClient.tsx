"use client"

import Link from "next/link"
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock4,
  MessageCircle,
  Phone,
  Receipt,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import MainLayout from "@/components/layout/MainLayout"
import { loanDetailQuery, type PaymentStatus } from "@/queries/loanQueries"
import { AxiosError } from "axios"

type Loan = {
  id: string
  borrower: string
  principal: number
  monthlyInterest: number
  nextDue: string
  status: PaymentStatus
  relationship: string
  interestDueDay: number
  startDate: string
  duration: string
}

type Payment = {
  id: string
  date: string
  amount: number
  type: "Interest" | "Principal"
  status: PaymentStatus
  note?: string
}

type BorrowerProfile = {
  id: string
  name: string
  phone: string | null
  relationship: string
  location: string
  notes?: string
  loans: Loan[]
  payments: Payment[]
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

function computePaymentStatus(dueDateIso: string, isPaid: boolean): PaymentStatus {
  if (isPaid) return "paid"
  const due = new Date(`${dueDateIso}T00:00:00Z`).getTime()
  return Date.now() > due ? "overdue" : "due"
}

function buildDueDateIso(dueDay: number, now = new Date()) {
  const safeDay = Math.min(30, Math.max(1, Math.trunc(dueDay || 1)))
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const day = Math.min(safeDay, daysInMonth)
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
}

const badgeStyles: Record<PaymentStatus, string> = {
  paid: "bg-green-50 text-green-700 border-green-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  due: "bg-amber-50 text-amber-700 border-amber-200",
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const labels: Record<PaymentStatus, string> = {
    paid: "Paid",
    overdue: "Overdue",
    due: "Due",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${badgeStyles[status]}`}
    >
      {labels[status]}
    </span>
  )
}

function durationLabel(months: number | null) {
  if (!months) return "—"
  if (months === 12) return "12 months"
  if (months === 1) return "1 month"
  return `${months} months`
}

export default function BorrowerProfileClient({ loanId }: { loanId: string }) {
  const detailQuery = useQuery(loanDetailQuery(loanId))

  if (detailQuery.isLoading) {
    return (
      <MainLayout>
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-600">Loading loan…</p>
        </section>
      </MainLayout>
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    const message =
      detailQuery.error instanceof AxiosError
        ? (detailQuery.error.response?.data as any)?.error || detailQuery.error.message
        : detailQuery.error instanceof Error
        ? detailQuery.error.message
        : "Failed to load loan"
    return (
      <MainLayout>
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-red-800">Loan not found</p>
          <p className="mt-1 text-xs text-red-700">{message}</p>
          <Link href="/loans" className="mt-2 inline-block text-sm font-medium text-red-800">
            Back to Loans
          </Link>
        </section>
      </MainLayout>
    )
  }

  const {
    loan: loanRow,
    borrower,
    monthly_interest_payments: interestPayments,
    interest_paid_total: interestPaidTotal,
  } = detailQuery.data

  const latestInterest = interestPayments[0]
  const dueDateIso = latestInterest?.due_date ?? buildDueDateIso(loanRow.interest_due_day)
  const isPaid =
    loanRow.status === "closed" ||
    latestInterest?.status === "paid" ||
    Boolean(latestInterest?.paid_at)
  const paymentStatus = computePaymentStatus(dueDateIso, isPaid)

  const profile: BorrowerProfile = {
    id: borrower?.id ?? loanRow.borrower_id,
    name: borrower?.name ?? "Borrower",
    phone: borrower?.phone ?? null,
    relationship: borrower?.relationship_type ?? "—",
    location: "—",
    notes: borrower?.notes ?? undefined,
    loans: [
      {
        id: loanRow.id,
        borrower: borrower?.name ?? "Borrower",
        principal: loanRow.principal_amount,
        monthlyInterest: loanRow.monthly_interest_amount,
        nextDue: formatIsoDate(dueDateIso),
        status: paymentStatus,
        relationship: borrower?.relationship_type ?? "—",
        interestDueDay: loanRow.interest_due_day,
        startDate: formatIsoDate(loanRow.loan_start_date),
        duration: durationLabel(loanRow.return_months),
      },
    ],
    payments: interestPayments.slice(0, 3).map((p) => ({
      id: p.id,
      date: formatIsoDate(p.due_date),
      amount: p.amount,
      type: "Interest",
      status: computePaymentStatus(p.due_date, p.status === "paid" || Boolean(p.paid_at)),
      note: p.status === "paid" ? "Collected" : "Pending collection",
    })),
  }

  const totals = profile.loans.reduce(
    (acc, loan) => {
      acc.principal += loan.principal
      acc.monthlyInterest += loan.monthlyInterest
      if (loan.status === "due" || loan.status === "overdue") {
        acc.activeStatuses.push(loan.status)
        if (!acc.nextDue) acc.nextDue = loan.nextDue
      }
      return acc
    },
    { principal: 0, monthlyInterest: 0, nextDue: "", activeStatuses: [] as PaymentStatus[] }
  )

  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <Link
          href="/loans"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Loans
        </Link>
        <span className="h-4 w-px bg-zinc-200" />
        <span className="text-xs text-zinc-500">Borrower profile</span>
      </div>

      <header className="rounded-2xl bg-linear-to-r from-brand-50 via-white to-brand-50 p-5 shadow-sm ring-1 ring-brand-100">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Borrower
            </p>
            <h1 className="text-2xl font-semibold text-zinc-900 capitalize">{profile.name}</h1>
            <p className="text-sm text-zinc-600 capitalize">
              {profile.relationship} • {profile.location}
            </p>
            <p className="text-xs text-zinc-500">{profile.notes}</p>
          </div>
          <div className="flex gap-2">
            <a
              href={profile.phone ? `tel:${profile.phone}` : undefined}
              aria-disabled={!profile.phone}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm transition ${
                profile.phone
                  ? "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                  : "border-zinc-200 bg-zinc-50 text-zinc-400 pointer-events-none"
              }`}
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
            <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Principal Lent</p>
          <p className="text-2xl font-semibold text-zinc-900">
            {currency.format(totals.principal)}
          </p>
        </div>
        <div className="rounded-2xl border = bg-orange-50 border-orange-200 p-4 shadow-sm">
          <p className="text-xs text-orange-700">Monthly Interest</p>
          <p className="text-xl font-semibold text-zinc-900">
            {currency.format(totals.monthlyInterest)}
          </p>
        </div>
        <div className="rounded-2xl border bg-blue-50 border-blue-200 p-4 shadow-sm">
          <p className="text-xs text-blue-700">Total Interest Paid</p>
          <p className="text-xl font-semibold text-zinc-900">
            {currency.format(Number.isFinite(interestPaidTotal) ? interestPaidTotal : 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Next Due</p>
          <p className="text-xl font-semibold text-zinc-900">
            {totals.nextDue || "No upcoming dues"}
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
              Loans
            </p>
            <p className="text-sm text-zinc-700">All active and closed loans for this borrower.</p>
          </div>
          <span className="rounded-full inline-block bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 border border-zinc-200">
            {profile.loans.length} loan{profile.loans.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {profile.loans.map((loan) => (
            <article
              key={loan.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {currency.format(loan.principal)} • {loan.duration}
                  </p>
                  <p className="text-xs text-zinc-600">
                    Started {loan.startDate} • Due every {loan.interestDueDay}th
                  </p>
                </div>
                {/* <StatusBadge status={loan.status} /> */}
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Monthly</p>
                  <p className="font-semibold text-zinc-900">
                    {currency.format(loan.monthlyInterest)}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Next Due</p>
                  <p className="font-semibold text-zinc-900">{loan.nextDue}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Relationship</p>
                  <p className="font-semibold text-zinc-900">{loan.relationship}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
              Payment History
            </p>
            <p className="text-sm text-zinc-700">Last three months of interest collection.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Paid
            </span>
            <span className="flex items-center gap-1">
              <Clock4 className="h-4 w-4 text-amber-600" />
              Pending
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {profile.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-zinc-200">
                  {payment.status === "paid" ? (
                    <Receipt className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <CalendarClock className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {payment.type} — {currency.format(payment.amount)}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {payment.date} • {payment.note}
                  </p>
                </div>
              </div>
              <StatusBadge status={payment.status} />
            </div>
          ))}
        </div>
      </section>
    </MainLayout>
  )
}
