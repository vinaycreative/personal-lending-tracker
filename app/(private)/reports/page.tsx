"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"

type TimeRange = "thisMonth" | "lastMonth" | "quarter"
type MovementStatus = "settled" | "pending" | "overdue"

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

const timeframes: Record<
  TimeRange,
  {
    label: string
    inflow: number
    outflow: number
    principalOutstanding: number
    interestPipeline: number
    collectedInterest: number
    overdueInterest: number
    collectionRate: number
    onTimeRate: number
  }
> = {
  thisMonth: {
    label: "Jan 2026",
    inflow: 164000,
    outflow: 82000,
    principalOutstanding: 566000,
    interestPipeline: 8400,
    collectedInterest: 6400,
    overdueInterest: 2000,
    collectionRate: 0.86,
    onTimeRate: 0.78,
  },
  lastMonth: {
    label: "Dec 2025",
    inflow: 132000,
    outflow: 40000,
    principalOutstanding: 548000,
    interestPipeline: 8200,
    collectedInterest: 7820,
    overdueInterest: 380,
    collectionRate: 0.94,
    onTimeRate: 0.84,
  },
  quarter: {
    label: "Last 90 days",
    inflow: 392000,
    outflow: 198000,
    principalOutstanding: 566000,
    interestPipeline: 25200,
    collectedInterest: 21000,
    overdueInterest: 4200,
    collectionRate: 0.89,
    onTimeRate: 0.81,
  },
}

const weeklyPace: Record<
  TimeRange,
  { label: string; inflow: number; outflow: number; collected: number }[]
> = {
  thisMonth: [
    { label: "Week 1", inflow: 42000, outflow: 18000, collected: 1800 },
    { label: "Week 2", inflow: 36000, outflow: 22000, collected: 1500 },
    { label: "Week 3", inflow: 46000, outflow: 21000, collected: 1700 },
    { label: "Week 4", inflow: 40000, outflow: 21000, collected: 1400 },
  ],
  lastMonth: [
    { label: "Week 1", inflow: 32000, outflow: 12000, collected: 2000 },
    { label: "Week 2", inflow: 28000, outflow: 9000, collected: 1800 },
    { label: "Week 3", inflow: 36000, outflow: 11000, collected: 2100 },
    { label: "Week 4", inflow: 36000, outflow: 8000, collected: 1900 },
  ],
  quarter: [
    { label: "Month 1", inflow: 132000, outflow: 40000, collected: 7800 },
    { label: "Month 2", inflow: 96000, outflow: 62000, collected: 6600 },
    { label: "Month 3", inflow: 164000, outflow: 82000, collected: 6600 },
  ],
}

const topBorrowers = [
  { name: "Asha Traders", monthlyInterest: 1800, pendingInterest: 600, onTime: "92%" },
  { name: "Sharma Transports", monthlyInterest: 2400, pendingInterest: 900, onTime: "78%" },
  { name: "Ravi Metals", monthlyInterest: 1275, pendingInterest: 0, onTime: "100%" },
  { name: "Meena Kirana", monthlyInterest: 546, pendingInterest: 280, onTime: "88%" },
  { name: "Lal Farms", monthlyInterest: 900, pendingInterest: 220, onTime: "74%" },
]

const movements: {
  id: string
  title: string
  party: string
  amount: number
  date: string
  status: MovementStatus
}[] = [
  {
    id: "m1",
    title: "Interest collected",
    party: "Ravi Metals",
    amount: 1800,
    date: "Jan 11",
    status: "settled",
  },
  {
    id: "m2",
    title: "Interest collected",
    party: "Asha Traders",
    amount: 1800,
    date: "Jan 11",
    status: "settled",
  },
  {
    id: "m3",
    title: "Principal returned",
    party: "Kunal Exports",
    amount: 50000,
    date: "Jan 09",
    status: "settled",
  },
  {
    id: "m4",
    title: "New loan disbursed",
    party: "Meena Kirana",
    amount: 22000,
    date: "Jan 08",
    status: "settled",
  },
  {
    id: "m5",
    title: "Interest overdue",
    party: "Sharma Transports",
    amount: 900,
    date: "Jan 09",
    status: "overdue",
  },
  {
    id: "m6",
    title: "Interest pending",
    party: "Lal Farms",
    amount: 400,
    date: "Jan 07",
    status: "pending",
  },
]

const statusStyles: Record<MovementStatus, { label: string; classes: string }> = {
  settled: { label: "Settled", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "Pending", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  overdue: { label: "Overdue", classes: "bg-rose-50 text-rose-700 border-rose-200" },
}

export default function ReportsPage() {
  const [range, setRange] = useState<TimeRange>("thisMonth")
  const metrics = timeframes[range]

  const netFlow = useMemo(
    () => metrics.inflow - metrics.outflow,
    [metrics.inflow, metrics.outflow]
  )
  const weekly = weeklyPace[range]
  const maxFlow = Math.max(...weekly.map((item) => Math.max(item.inflow, item.outflow)))

  const netFlowStyle =
    netFlow >= 0
      ? {
          icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
          tone: "bg-emerald-50 text-emerald-800",
        }
      : {
          icon: <TrendingDown className="h-4 w-4 text-rose-600" />,
          tone: "bg-rose-50 text-rose-800",
        }

  return (
    <MainLayout>
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">Reports</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Analytics and money flow</h1>
        <p className="text-sm text-zinc-600">
          Stay on top of principal outstanding, inflows, and how collections are performing.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-2">
        {(["thisMonth", "lastMonth", "quarter"] as TimeRange[]).map((key) => {
          const isActive = range === key
          return (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "border-brand-200 bg-brand-50 text-brand-800 shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {timeframes[key].label}
            </button>
          )
        })}
      </section>

      <section className="rounded-2xl bg-linear-to-r from-brand-50 via-white to-brand-50 p-4 ring-1 ring-brand-100 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
              Net movement
            </p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-semibold text-brand-900">
                {currency.format(netFlow)}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${netFlowStyle.tone}`}
              >
                {netFlowStyle.icon}
                {netFlow >= 0 ? "Positive cash flow" : "Negative cash flow"}
              </span>
            </div>
            <p className="text-xs text-brand-800">
              Inflow {currency.format(metrics.inflow)} • Outflow {currency.format(metrics.outflow)}
            </p>
          </div>
          <div className="rounded-xl bg-white/90 px-4 py-3 text-right shadow-inner ring-1 ring-brand-100">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Collection rate</p>
            <p className="text-xl font-semibold text-zinc-900">
              {Math.round(metrics.collectionRate * 100)}%
            </p>
            <p className="text-xs text-zinc-600">
              On-time {Math.round(metrics.onTimeRate * 100)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Principal Outstanding
            </p>
            <p className="text-lg font-semibold text-zinc-900">
              {currency.format(metrics.principalOutstanding)}
            </p>
            <p className="text-[11px] text-zinc-500">Across active borrowers</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Interest Pipeline</p>
            <p className="text-lg font-semibold text-zinc-900">
              {currency.format(metrics.interestPipeline)}
            </p>
            <p className="text-[11px] text-zinc-500">Due in selected range</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Collected</p>
            <p className="text-lg font-semibold text-emerald-700">
              {currency.format(metrics.collectedInterest)}
            </p>
            <p className="text-[11px] text-zinc-500">Interest received</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Overdue Interest</p>
            <p className="text-lg font-semibold text-rose-700">
              {currency.format(metrics.overdueInterest)}
            </p>
            <p className="text-[11px] text-zinc-500">Needs follow up</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Cash movement
              </p>
              <p className="text-sm text-zinc-700">Inflow vs outflow</p>
            </div>
            <Wallet className="h-5 w-5 text-brand-700" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <ArrowDownRight className="h-4 w-4" />
                Inflow
              </div>
              <p className="text-2xl font-semibold text-emerald-900">
                {currency.format(metrics.inflow)}
              </p>
              <p className="text-xs text-emerald-700">Interest + principal returned</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                <ArrowUpRight className="h-4 w-4" />
                Outflow
              </div>
              <p className="text-2xl font-semibold text-rose-900">
                {currency.format(metrics.outflow)}
              </p>
              <p className="text-xs text-rose-700">New loans disbursed</p>
            </div>
          </div>
          <div className="space-y-2">
            {weekly.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <div className="flex items-center justify-between text-sm font-medium text-zinc-900">
                  <span>{item.label}</span>
                  <span className="text-xs text-zinc-500">
                    {currency.format(item.inflow - item.outflow)} net
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="h-2 rounded-full bg-emerald-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(6, (item.inflow / maxFlow) * 100)}%` }}
                      />
                    </div>
                    <div className="h-2 rounded-full bg-rose-100">
                      <div
                        className="h-2 rounded-full bg-rose-500"
                        style={{ width: `${Math.max(6, (item.outflow / maxFlow) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col text-[11px] text-zinc-600">
                    <span className="text-emerald-700">In {currency.format(item.inflow)}</span>
                    <span className="text-rose-700">Out {currency.format(item.outflow)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Collection performance
              </p>
              <p className="text-sm text-zinc-700">Health of current cycle</p>
            </div>
            <BarChart3 className="h-5 w-5 text-brand-700" />
          </div>
          <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
            <div className="flex items-center justify-between text-sm text-brand-900">
              <span>On-time</span>
              <span className="font-semibold">{Math.round(metrics.onTimeRate * 100)}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white">
              <div
                className="h-2 rounded-full bg-brand-600"
                style={{ width: `${Math.round(metrics.onTimeRate * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-brand-800">
              Borrowers paying on or before due date.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Collected
              </div>
              <p className="text-xl font-semibold text-emerald-900">
                {currency.format(metrics.collectedInterest)}
              </p>
              <p className="text-xs text-emerald-700">Interest received</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <Clock3 className="h-4 w-4" />
                Pending / Overdue
              </div>
              <p className="text-xl font-semibold text-amber-900">
                {currency.format(metrics.interestPipeline - metrics.collectedInterest)}
              </p>
              <p className="text-xs text-amber-700">Follow-ups needed</p>
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center justify-between text-sm font-medium text-zinc-900">
              <span>Overdue interest</span>
              <span className="text-rose-700">{currency.format(metrics.overdueInterest)}</span>
            </div>
            <p className="text-[11px] text-zinc-600">
              Prioritize calls for accounts slipping beyond the due date.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Top borrowers
              </p>
              <p className="text-sm text-zinc-700">Monthly interest and pending amounts</p>
            </div>
            <CalendarClock className="h-5 w-5 text-brand-700" />
          </div>
          <div className="flex flex-col gap-2">
            {topBorrowers.map((borrower) => (
              <div
                key={borrower.name}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{borrower.name}</p>
                  <p className="text-xs text-zinc-600">
                    Monthly {currency.format(borrower.monthlyInterest)} • Pending{" "}
                    {currency.format(borrower.pendingInterest)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-brand-800 ring-1 ring-brand-100">
                  On-time {borrower.onTime}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Recent movements
              </p>
              <p className="text-sm text-zinc-700">Latest inflow / outflow actions</p>
            </div>
            <CalendarClock className="h-5 w-5 text-brand-700" />
          </div>
          <div className="flex flex-col gap-2">
            {movements.map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-zinc-900">{movement.title}</p>
                  <p className="text-xs text-zinc-600">
                    {movement.party} • {movement.date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">
                    {currency.format(movement.amount)}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                      statusStyles[movement.status].classes
                    }`}
                  >
                    {statusStyles[movement.status].label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
