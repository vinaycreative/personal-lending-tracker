"use client"

import { useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Wallet,
} from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { FullScreenLoader } from "@/components/ui/full-screen-loader"
import { useQuery } from "@tanstack/react-query"
import moment from "moment"
import {
  reportsQuery,
  type ReportsResponse,
  type ReportsTimeRange,
} from "@/queries/reportsQueries"

type MovementStatus = "settled" | "pending" | "overdue"

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

type TimeRange = ReportsTimeRange

function formatMovementDate(dateIso: string) {
  const m = moment.utc(dateIso, "YYYY-MM-DD", true)
  return m.isValid() ? m.format("MMM DD") : dateIso
}

const statusStyles: Record<MovementStatus, { label: string; classes: string }> = {
  settled: { label: "Settled", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "Pending", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  overdue: { label: "Overdue", classes: "bg-rose-50 text-rose-700 border-rose-200" },
}

export default function ReportsPage() {
  const [range, setRange] = useState<TimeRange>("thisMonth")
  const { data, isLoading, isError } = useQuery(reportsQuery(range))

  const report: ReportsResponse | null = data ?? null
  const metrics = report?.metrics ?? {
    inflow: 0,
    outflow: 0,
    principalOutstanding: 0,
    interestPipeline: 0,
    collectedInterest: 0,
    overdueInterest: 0,
    collectionRate: 0,
    onTimeRate: 0,
  }

  const weekly = report?.weeklyPace ?? []
  const maxFlow = weekly.length
    ? Math.max(...weekly.map((item) => Math.max(item.inflow, item.outflow)))
    : 1

  if (isLoading) {
    return <FullScreenLoader label="Loading reports…" variant="content" />
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

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-red-800">Couldn’t load reports</p>
          <p className="text-xs text-red-700">Please refresh and try again.</p>
        </div>
      ) : null}

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
              {key === "thisMonth"
                ? "This month"
                : key === "lastMonth"
                ? "Last month"
                : "Last 90 days"}
            </button>
          )
        })}
      </section>

      <section className="rounded-2xl bg-linear-to-r from-brand-50 via-white to-brand-50 p-4 ring-1 ring-brand-100 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
              Interest collected
            </p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-semibold text-brand-900">
                {currency.format(metrics.collectedInterest)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Collection rate {Math.round(metrics.collectionRate * 100)}%
              </span>
            </div>
            <p className="text-xs text-brand-800">
              Due {currency.format(metrics.interestPipeline)} • Overdue{" "}
              {currency.format(metrics.overdueInterest)}
            </p>
            <p className="text-[11px] text-brand-700/90">
              This report treats principal and interest separately. Principal outstanding does not
              change when interest is paid.
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
                Interest movement
              </p>
              <p className="text-sm text-zinc-700">Collected vs due (interest)</p>
            </div>
            <Wallet className="h-5 w-5 text-brand-700" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <ArrowDownRight className="h-4 w-4" />
                Collected
              </div>
              <p className="text-2xl font-semibold text-emerald-900">
                {currency.format(metrics.collectedInterest)}
              </p>
              <p className="text-xs text-emerald-700">Interest received</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                <ArrowUpRight className="h-4 w-4" />
                Due
              </div>
              <p className="text-2xl font-semibold text-rose-900">
                {currency.format(metrics.interestPipeline)}
              </p>
              <p className="text-xs text-rose-700">Scheduled interest in range</p>
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
                    Collected {currency.format(item.inflow)} • Due {currency.format(item.outflow)}
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
                    <span className="text-emerald-700">
                      Collected {currency.format(item.inflow)}
                    </span>
                    <span className="text-rose-700">Due {currency.format(item.outflow)}</span>
                  </div>
                </div>
              </div>
            ))}
            {!weekly.length && !isLoading ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-3 text-xs text-zinc-600">
                No movement data found for this range yet.
              </div>
            ) : null}
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
            {(report?.topBorrowers ?? []).map((borrower) => (
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
            {!(report?.topBorrowers ?? []).length && !isLoading ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-3 text-xs text-zinc-600">
                No borrower stats yet for this range.
              </div>
            ) : null}
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
            {(report?.movements ?? []).map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-zinc-900">{movement.title}</p>
                  <p className="text-xs text-zinc-600">
                    {movement.party} • {formatMovementDate(movement.date)}
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
            {!(report?.movements ?? []).length && !isLoading ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-3 text-xs text-zinc-600">
                No movements found for this range.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
