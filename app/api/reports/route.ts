import { supabase } from "@/lib/supabase/client"
import moment from "moment"

type TimeRange = "thisMonth" | "lastMonth" | "quarter"

function parseIsoDateOnly(dateIso: string) {
  const m = moment.utc(dateIso, "YYYY-MM-DD", true)
  return m.isValid() ? m.toDate() : null
}

function toIsoDate(date: Date) {
  return moment.utc(date).format("YYYY-MM-DD")
}

function clampRange(range: string | null): TimeRange {
  if (range === "thisMonth" || range === "lastMonth" || range === "quarter") return range
  return "thisMonth"
}

function buildRangeWindow(range: TimeRange, asOfUtc: Date) {
  const asOf = moment.utc(asOfUtc)

  if (range === "thisMonth") {
    const start = asOf.clone().startOf("month")
    const end = asOf.clone().endOf("day")
    return { label: asOf.format("MMM YYYY"), start, end }
  }

  if (range === "lastMonth") {
    const prev = asOf.clone().subtract(1, "month")
    const start = prev.clone().startOf("month")
    const end = prev.clone().endOf("month")
    return { label: prev.format("MMM YYYY"), start, end }
  }

  // "quarter" = last 90 days, but bucketed as 3 calendar months ending in the current month.
  const start = asOf.clone().subtract(89, "days").startOf("day")
  const end = asOf.clone().endOf("day")
  return { label: "Last 90 days", start, end }
}

function borrowerNameFromBorrowers(borrowers: unknown): string | null {
  if (!borrowers) return null
  if (Array.isArray(borrowers)) {
    const first = borrowers[0]
    if (!first || typeof first !== "object") return null
    const name = (first as Record<string, unknown>).name
    return typeof name === "string" && name.trim() ? name.trim() : null
  }
  if (typeof borrowers !== "object") return null
  const name = (borrowers as Record<string, unknown>).name
  return typeof name === "string" && name.trim() ? name.trim() : null
}

function asBorrowerName(row: unknown) {
  if (!row || typeof row !== "object") return "Unknown"
  const loans = (row as Record<string, unknown>).loans
  if (!loans || typeof loans !== "object") return "Unknown"
  const borrowers = (loans as Record<string, unknown>).borrowers
  return borrowerNameFromBorrowers(borrowers) ?? "Unknown"
}

function isInterestPaid(row: { status: string | null; paid_at: string | null }) {
  return row.status === "paid" || Boolean(row.paid_at)
}

function paidOnTime(dueDateIso: string, paidAtIso: string | null) {
  if (!paidAtIso) return false
  const paidDateIso = moment.utc(paidAtIso).format("YYYY-MM-DD")
  return !moment.utc(paidDateIso, "YYYY-MM-DD").isAfter(moment.utc(dueDateIso, "YYYY-MM-DD"), "day")
}

type MovementStatus = "settled" | "pending" | "overdue"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const range = clampRange(url.searchParams.get("range")?.trim() ?? null)
  const asOfParam = url.searchParams.get("asOf")?.trim() ?? null

  const asOfDate = asOfParam ? parseIsoDateOnly(asOfParam) : null
  const asOfUtc = asOfDate ?? new Date()
  const asOfDateIso = toIsoDate(asOfUtc)

  const window = buildRangeWindow(range, asOfUtc)
  const startDateIso = window.start.format("YYYY-MM-DD")
  const endDateIso = window.end.format("YYYY-MM-DD")
  const startTs = window.start.clone().startOf("day").toISOString()
  const endTs = window.end.clone().endOf("day").toISOString()

  // Outflow: new loans disbursed within window (loan_start_date).
  const { data: loansDisbursed, error: loansDisbursedError } = await supabase
    .from("loans")
    .select(
      `
      id,
      principal_amount,
      loan_start_date,
      borrowers (
        name
      )
    `
    )
    .gte("loan_start_date", startDateIso)
    .lte("loan_start_date", endDateIso)
    .order("loan_start_date", { ascending: false })
    .limit(5000)

  if (loansDisbursedError) {
    return Response.json({ error: loansDisbursedError.message }, { status: 500 })
  }

  // Interest pipeline / borrower stats: interest due within window.
  const { data: paymentsDueInWindow, error: paymentsDueError } = await supabase
    .from("monthly_interest_payments")
    .select(
      `
      id,
      loan_id,
      amount,
      due_date,
      status,
      paid_at,
      loans (
        borrower_id,
        borrowers (
          name
        )
      )
    `
    )
    .gte("due_date", startDateIso)
    .lte("due_date", endDateIso)
    .order("due_date", { ascending: true })
    .limit(10000)

  if (paymentsDueError) {
    return Response.json({ error: paymentsDueError.message }, { status: 500 })
  }

  // Inflow: interest collected within window (paid_at).
  const { data: interestCollectedRows, error: interestCollectedError } = await supabase
    .from("monthly_interest_payments")
    .select(
      `
      id,
      loan_id,
      amount,
      due_date,
      status,
      paid_at,
      loans (
        borrower_id,
        borrowers (
          name
        )
      )
    `
    )
    .not("paid_at", "is", null)
    .gte("paid_at", startTs)
    .lte("paid_at", endTs)
    .order("paid_at", { ascending: false })
    .limit(5000)

  if (interestCollectedError) {
    return Response.json({ error: interestCollectedError.message }, { status: 500 })
  }

  // Inflow: principal returned within window (paid_at).
  const { data: principalPaidRows, error: principalPaidError } = await supabase
    .from("principal_payments")
    .select(
      `
      id,
      loan_id,
      amount,
      paid_at,
      notes,
      loans (
        borrower_id,
        borrowers (
          name
        )
      )
    `
    )
    .gte("paid_at", startTs)
    .lte("paid_at", endTs)
    .order("paid_at", { ascending: false })
    .limit(5000)

  if (principalPaidError) {
    return Response.json({ error: principalPaidError.message }, { status: 500 })
  }

  // Principal outstanding: active principals minus principal paid to date for those loans.
  const { data: activeLoans, error: activeLoansError } = await supabase
    .from("loans")
    .select("id, principal_amount, status")
    .neq("status", "closed")
    .limit(10000)

  if (activeLoansError) {
    return Response.json({ error: activeLoansError.message }, { status: 500 })
  }

  const activeLoanIds = (activeLoans ?? []).map((l) => String(l.id))
  const { data: activeLoanPrincipalPayments, error: activeLoanPrincipalPaymentsError } = activeLoanIds.length
    ? await supabase
        .from("principal_payments")
        .select("loan_id, amount, notes")
        .in("loan_id", activeLoanIds)
        .limit(20000)
    : { data: [], error: null }

  if (activeLoanPrincipalPaymentsError) {
    return Response.json({ error: activeLoanPrincipalPaymentsError.message }, { status: 500 })
  }

  const principalPaidByLoanId = new Map<string, number>()
  for (const row of activeLoanPrincipalPayments ?? []) {
    const id = String(row.loan_id)
    const amount = Number(row.amount) || 0
    if (amount <= 0) continue
    const notes = typeof row.notes === "string" ? row.notes : ""
    const isTopUp = notes.toLowerCase().startsWith("top-up")
    if (isTopUp) continue
    principalPaidByLoanId.set(id, (principalPaidByLoanId.get(id) ?? 0) + amount)
  }

  const activeLoanRows = (activeLoans ?? []) as unknown as { id: string; principal_amount: number | null }[]

  const principalOutstanding = activeLoanRows.reduce((sum, loan) => {
    const principal = Number(loan.principal_amount) || 0
    const paid = principalPaidByLoanId.get(String(loan.id)) ?? 0
    return sum + Math.max(0, principal - paid)
  }, 0)

  const collectedInterest = (interestCollectedRows ?? []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const principalReturned = (principalPaidRows ?? []).reduce((sum, r) => {
    const amount = Number(r.amount) || 0
    const notes = typeof (r as { notes?: unknown }).notes === "string" ? String((r as { notes?: unknown }).notes) : ""
    const isTopUp = notes.toLowerCase().startsWith("top-up")
    if (isTopUp) return sum
    return amount > 0 ? sum + amount : sum
  }, 0)
  const loansDisbursedRows = (loansDisbursed ?? []) as unknown as { principal_amount: number | null }[]
  const principalDisbursed = loansDisbursedRows.reduce((sum, l) => sum + (Number(l.principal_amount) || 0), 0)

  const interestPipeline = (paymentsDueInWindow ?? []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  // IMPORTANT: This app treats principal and interest as separate streams.
  // For Reports, "inflow/outflow" are INTEREST-only (collected vs due),
  // so we never show disbursed principal as a "negative cash flow".
  const inflow = collectedInterest
  const outflow = interestPipeline

  const overdueInterest = (paymentsDueInWindow ?? []).reduce((sum, r) => {
    const due = String(r.due_date ?? "")
    const unpaid = !isInterestPaid({ status: r.status ?? null, paid_at: r.paid_at ?? null })
    if (!unpaid) return sum
    if (!due) return sum
    return moment.utc(asOfDateIso, "YYYY-MM-DD").isAfter(moment.utc(due, "YYYY-MM-DD"), "day")
      ? sum + (Number(r.amount) || 0)
      : sum
  }, 0)

  const totalDueAmount = interestPipeline
  const totalPaidAmount = (paymentsDueInWindow ?? []).reduce((sum, r) => {
    const paid = isInterestPaid({ status: r.status ?? null, paid_at: r.paid_at ?? null })
    return sum + (paid ? Number(r.amount) || 0 : 0)
  }, 0)
  const totalPaidOnTimeAmount = (paymentsDueInWindow ?? []).reduce((sum, r) => {
    const paid = isInterestPaid({ status: r.status ?? null, paid_at: r.paid_at ?? null })
    if (!paid) return sum
    return sum + (paidOnTime(String(r.due_date), r.paid_at ?? null) ? Number(r.amount) || 0 : 0)
  }, 0)

  const collectionRate = totalDueAmount > 0 ? totalPaidAmount / totalDueAmount : 0
  const onTimeRate = totalPaidAmount > 0 ? totalPaidOnTimeAmount / totalPaidAmount : 0

  // Weekly/monthly buckets for the chart.
  const bucketSpecs =
    range === "quarter"
      ? [2, 1, 0].map((monthsAgo) => {
          const m = moment.utc(asOfUtc).subtract(monthsAgo, "month")
          const start = m.clone().startOf("month")
          const end = monthsAgo === 0 ? moment.utc(asOfUtc).endOf("day") : m.clone().endOf("month")
          return { label: `Month ${3 - monthsAgo}`, start, end }
        })
      : [
          { label: "Week 1", startDay: 1, endDay: 7 },
          { label: "Week 2", startDay: 8, endDay: 14 },
          { label: "Week 3", startDay: 15, endDay: 21 },
          { label: "Week 4", startDay: 22, endDay: 31 },
        ].map((w) => {
          const base =
            range === "lastMonth"
              ? moment.utc(asOfUtc).subtract(1, "month").startOf("month")
              : moment.utc(asOfUtc).startOf("month")
          const daysInMonth = base.daysInMonth()
          const start = base
            .clone()
            .date(Math.min(Math.max(1, w.startDay), daysInMonth))
            .startOf("day")
          const end = base
            .clone()
            .date(Math.min(Math.max(1, w.endDay), daysInMonth))
            .endOf("day")
          const endCapped = range === "thisMonth" ? moment.min(end, moment.utc(asOfUtc).endOf("day")) : end
          return { label: w.label, start, end: endCapped }
        })

  function inBucket(tsIso: string, bucket: { start: moment.Moment; end: moment.Moment }) {
    const t = moment.utc(tsIso)
    return t.isSameOrAfter(bucket.start) && t.isSameOrBefore(bucket.end)
  }

  const weeklyPace = bucketSpecs.map((bucket) => {
    const inflowBucket = (interestCollectedRows ?? []).reduce((sum, r) => {
      const paidAt = r.paid_at ? String(r.paid_at) : null
      if (!paidAt) return sum
      return inBucket(paidAt, bucket) ? sum + (Number(r.amount) || 0) : sum
    }, 0)

    const outflowBucket = (paymentsDueInWindow ?? []).reduce((sum, r) => {
      const dueDateIso = String(r.due_date ?? "")
      if (!dueDateIso) return sum
      const dueTs = moment.utc(dueDateIso, "YYYY-MM-DD").startOf("day").toISOString()
      return inBucket(dueTs, bucket) ? sum + (Number(r.amount) || 0) : sum
    }, 0)

    const collectedBucket = inflowBucket

    return {
      label: bucket.label,
      inflow: inflowBucket,
      outflow: outflowBucket,
      collected: collectedBucket,
    }
  })

  // Top borrowers (by total interest due in window).
  const borrowerAgg = new Map<
    string,
    { borrower: string; due: number; unpaid: number; paid: number; paidOnTime: number }
  >()

  for (const row of paymentsDueInWindow ?? []) {
    const borrower = asBorrowerName(row)
    const amount = Number(row.amount) || 0
    const paid = isInterestPaid({ status: row.status ?? null, paid_at: row.paid_at ?? null })
    const dueDate = String(row.due_date ?? "")

    const acc = borrowerAgg.get(borrower) ?? { borrower, due: 0, unpaid: 0, paid: 0, paidOnTime: 0 }
    acc.due += amount
    if (paid) {
      acc.paid += amount
      if (dueDate && paidOnTime(dueDate, row.paid_at ?? null)) acc.paidOnTime += amount
    } else {
      acc.unpaid += amount
    }
    borrowerAgg.set(borrower, acc)
  }

  const topBorrowers = Array.from(borrowerAgg.values())
    .sort((a, b) => b.due - a.due)
    .slice(0, 5)
    .map((b) => {
      const onTime = b.paid > 0 ? Math.round((b.paidOnTime / b.paid) * 100) : 0
      return {
        name: b.borrower,
        monthlyInterest: Math.round(b.due),
        pendingInterest: Math.round(b.unpaid),
        onTime: `${onTime}%`,
      }
    })

  // Movements: merge recent actions (limit to 6).
  const movements: {
    id: string
    title: string
    party: string
    amount: number
    date: string // ISO date-only
    status: MovementStatus
    sortTs: string
  }[] = []

  for (const row of (interestCollectedRows ?? []).slice(0, 10)) {
    if (!row.paid_at) continue
    movements.push({
      id: `interest-${row.id}`,
      title: "Interest collected",
      party: asBorrowerName(row),
      amount: Math.round(Number(row.amount) || 0),
      date: moment.utc(String(row.paid_at)).format("YYYY-MM-DD"),
      status: "settled",
      sortTs: String(row.paid_at),
    })
  }

  for (const row of (principalPaidRows ?? []).slice(0, 10)) {
    movements.push({
      id: `principal-${row.id}`,
      title: "Principal returned",
      party: asBorrowerName(row),
      amount: Math.round(Number(row.amount) || 0),
      date: moment.utc(String(row.paid_at)).format("YYYY-MM-DD"),
      status: "settled",
      sortTs: String(row.paid_at),
    })
  }

  type LoanDisbursedRow = {
    id: string
    principal_amount: number | null
    loan_start_date: string | null
    borrowers?: { name?: string | null } | { name?: string | null }[] | null
  }

  const loansDisbursedTop = (loansDisbursed ?? []) as unknown as LoanDisbursedRow[]

  for (const loan of loansDisbursedTop.slice(0, 10)) {
    const date = String(loan.loan_start_date ?? "")
    movements.push({
      id: `loan-${loan.id}`,
      title: "New loan disbursed",
      party: borrowerNameFromBorrowers(loan.borrowers) ?? "Unknown",
      amount: Math.round(Number(loan.principal_amount) || 0),
      date,
      status: "settled",
      sortTs: moment.utc(date, "YYYY-MM-DD").startOf("day").toISOString(),
    })
  }

  for (const row of (paymentsDueInWindow ?? []).slice(0, 50)) {
    const paid = isInterestPaid({ status: row.status ?? null, paid_at: row.paid_at ?? null })
    if (paid) continue
    const dueDateIso = String(row.due_date ?? "")
    if (!dueDateIso) continue
    const overdue = moment.utc(asOfDateIso, "YYYY-MM-DD").isAfter(moment.utc(dueDateIso, "YYYY-MM-DD"), "day")
    movements.push({
      id: `due-${row.id}`,
      title: overdue ? "Interest overdue" : "Interest pending",
      party: asBorrowerName(row),
      amount: Math.round(Number(row.amount) || 0),
      date: dueDateIso,
      status: overdue ? "overdue" : "pending",
      sortTs: moment.utc(dueDateIso, "YYYY-MM-DD").startOf("day").toISOString(),
    })
  }

  const movementsTop = movements
    .sort((a, b) => (a.sortTs < b.sortTs ? 1 : a.sortTs > b.sortTs ? -1 : 0))
    .slice(0, 6)
    .map(({ sortTs, ...rest }) => rest)

  return Response.json(
    {
      range,
      label: window.label,
      start_date: startDateIso,
      end_date: endDateIso,
      as_of_date: asOfDateIso,
      metrics: {
        inflow: Math.round(inflow),
        outflow: Math.round(outflow),
        principalOutstanding: Math.round(principalOutstanding),
        interestPipeline: Math.round(interestPipeline),
        collectedInterest: Math.round(collectedInterest),
        overdueInterest: Math.round(overdueInterest),
        collectionRate,
        onTimeRate,
      },
      weeklyPace: weeklyPace.map((w) => ({
        label: w.label,
        inflow: Math.round(w.inflow),
        outflow: Math.round(w.outflow),
        collected: Math.round(w.collected),
      })),
      topBorrowers,
      movements: movementsTop,
    },
    { status: 200 }
  )
}

