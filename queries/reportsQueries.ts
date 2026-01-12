import axios from "axios"

export type ReportsTimeRange = "thisMonth" | "lastMonth" | "quarter"
export type MovementStatus = "settled" | "pending" | "overdue"

export type ReportsResponse = {
  range: ReportsTimeRange
  label: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  as_of_date: string // YYYY-MM-DD
  metrics: {
    inflow: number
    outflow: number
    principalOutstanding: number
    interestPipeline: number
    collectedInterest: number
    overdueInterest: number
    collectionRate: number // 0..1
    onTimeRate: number // 0..1
  }
  weeklyPace: { label: string; inflow: number; outflow: number; collected: number }[]
  topBorrowers: { name: string; monthlyInterest: number; pendingInterest: number; onTime: string }[]
  movements: {
    id: string
    title: string
    party: string
    amount: number
    date: string // YYYY-MM-DD
    status: MovementStatus
  }[]
}

async function getReports(range: ReportsTimeRange, asOf?: string) {
  const { data } = await axios.get<ReportsResponse>("/api/reports", {
    params: { range, ...(asOf ? { asOf } : {}) },
  })
  return data
}

export function reportsQuery(range: ReportsTimeRange, asOf?: string) {
  return {
    queryKey: ["reports", { range, asOf: asOf ?? null }] as const,
    queryFn: () => getReports(range, asOf),
  }
}

