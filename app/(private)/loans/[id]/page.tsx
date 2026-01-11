import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock4,
  MessageCircle,
  Phone,
  Receipt,
} from "lucide-react"

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
  id: number
  name: string
  phone: string
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

const baseLoans: Loan[] = [
  {
    id: 1,
    borrower: "Asha Traders",
    principal: 120000,
    monthlyInterest: 1800,
    nextDue: "Jan 11, 2026",
    status: "due",
    relationship: "Business",
    interestDueDay: 11,
    startDate: "Sep 11, 2025",
    duration: "12 months",
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
    startDate: "Oct 11, 2025",
    duration: "10 months",
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
    startDate: "Aug 09, 2025",
    duration: "12 months",
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
    startDate: "Nov 13, 2025",
    duration: "8 months",
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
    startDate: "Jul 07, 2025",
    duration: "12 months",
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
    startDate: "Jan 21, 2025",
    duration: "12 months",
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

function buildPayments(loan: Loan): Payment[] {
  return [
    {
      id: `${loan.id}-p3`,
      date: "Jan 2026",
      amount: loan.monthlyInterest,
      type: "Interest",
      status: loan.status === "paid" ? "paid" : loan.status,
      note: loan.status === "overdue" ? "Pending collection" : "Collected on due date",
    },
    {
      id: `${loan.id}-p2`,
      date: "Dec 2025",
      amount: loan.monthlyInterest,
      type: "Interest",
      status: "paid",
      note: "On time",
    },
    {
      id: `${loan.id}-p1`,
      date: "Nov 2025",
      amount: loan.monthlyInterest,
      type: "Interest",
      status: "paid",
      note: "On time",
    },
  ]
}

const borrowerProfiles: Record<string, BorrowerProfile> = baseLoans.reduce((acc, loan, idx) => {
  const phone = `+91 98${70 + idx}${30 + idx}${40 + idx}${50 + idx}`
  const location = ["Pune, MH", "Indore, MP", "Nagpur, MH", "Bhopal, MP", "Nashik, MH", "Delhi"][
    idx % 6
  ]

  acc[String(loan.id)] = {
    id: loan.id,
    name: loan.borrower,
    phone,
    relationship: loan.relationship,
    location,
    notes: "Keeps a steady payment cadence; prefers monthly reminders via WhatsApp.",
    loans: [loan],
    payments: buildPayments(loan),
  }

  return acc
}, {} as Record<string, BorrowerProfile>)

export default async function BorrowerProfilePage({
  params,
}: {
  params: Promise<{ id?: string }>
}) {
  const { id } = await params
  const profile = id ? borrowerProfiles[id] : null

  if (!profile) {
    return notFound()
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
    <main className="relative w-full overflow-auto px-4 pb-28 pt-6 space-y-5">
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
            <h1 className="text-2xl font-semibold text-zinc-900">{profile.name}</h1>
            <p className="text-sm text-zinc-600">
              {profile.relationship} • {profile.location}
            </p>
            <p className="text-xs text-zinc-500">{profile.notes}</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50">
              <Phone className="h-4 w-4" />
              Call
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl col-span-2 border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Principal Lent</p>
          <p className="text-2xl font-semibold text-zinc-900">
            {currency.format(totals.principal)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-zinc-500">Monthly Interest</p>
          <p className="text-xl font-semibold text-zinc-900">
            {currency.format(totals.monthlyInterest)}
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
                <StatusBadge status={loan.status} />
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
    </main>
  )
}
