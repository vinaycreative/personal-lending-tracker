import { supabase } from "@/lib/supabase/client"
import moment from "moment"

type Params = { id?: string }

type CollectInterestRequest = {
  // Optional ISO date-only string to choose which month to mark as paid (defaults to "today")
  as_of?: string
  // Optional ISO timestamp; defaults to now
  paid_at?: string
}

function parseIsoDateOnly(dateIso: string) {
  const m = moment.utc(dateIso, "YYYY-MM-DD", true)
  return m.isValid() ? m.toDate() : null
}

function toIsoDate(date: Date) {
  return moment.utc(date).format("YYYY-MM-DD")
}

function currentMonthYear(now = new Date()) {
  return moment.utc(now).format("YYYY-MM")
}

function clampDueDay(day: number) {
  if (!Number.isFinite(day)) return 1
  return Math.min(30, Math.max(1, Math.trunc(day)))
}

function buildDueDateIsoForMonth(dueDay: number, monthRefUtc: Date) {
  const safeDay = clampDueDay(dueDay)
  const m = moment.utc(monthRefUtc)
  const year = m.year()
  const month = m.month()
  const daysInMonth = moment.utc({ year, month, day: 1 }).daysInMonth()
  const day = Math.min(safeDay, daysInMonth)
  return moment.utc({ year, month, day }).format("YYYY-MM-DD")
}

async function ensureNextMonthPendingPayment(params: {
  loanId: string
  interestDueDay: number
  amount: number
  baseDueDateIso: string
}) {
  const { loanId, interestDueDay, amount, baseDueDateIso } = params

  const base = moment.utc(baseDueDateIso, "YYYY-MM-DD", true)
  if (!base.isValid()) {
    return { ok: false as const, error: "Invalid base due date" }
  }

  const nextMonth = base.clone().add(1, "month").startOf("month")
  const nextMonthYear = nextMonth.format("YYYY-MM")
  const nextDueDateIso = buildDueDateIsoForMonth(interestDueDay, nextMonth.toDate())

  const { data: existingNext, error: existingNextError } = await supabase
    .from("monthly_interest_payments")
    .select("id")
    .eq("loan_id", loanId)
    .eq("month_year", nextMonthYear)
    .maybeSingle()

  if (existingNextError) {
    return { ok: false as const, error: existingNextError.message }
  }

  if (existingNext?.id) {
    return { ok: true as const, created: false, month_year: nextMonthYear, due_date: nextDueDateIso }
  }

  const { error: insertNextError } = await supabase.from("monthly_interest_payments").insert({
    loan_id: loanId,
    month_year: nextMonthYear,
    due_date: nextDueDateIso,
    amount: Number.isFinite(amount) ? amount : 0,
    status: "pending",
    paid_at: null,
  })

  if (insertNextError) {
    return { ok: false as const, error: insertNextError.message }
  }

  return { ok: true as const, created: true, month_year: nextMonthYear, due_date: nextDueDateIso }
}

export async function POST(request: Request, context: { params: Params | Promise<Params> }) {
  const { id } = await Promise.resolve(context.params)
  const loanId = id?.trim()

  if (!loanId) {
    return Response.json({ error: "Loan id is required" }, { status: 400 })
  }

  let body: CollectInterestRequest = {}
  try {
    body = (await request.json()) as CollectInterestRequest
  } catch {
    body = {}
  }

  const asOfDate = body.as_of ? parseIsoDateOnly(body.as_of) : null
  const asOfUtc = asOfDate ?? new Date()
  const asOfDateIso = toIsoDate(asOfUtc)
  const asOfMonthYear = currentMonthYear(asOfUtc)

  const paidAtDate = body.paid_at ? new Date(body.paid_at) : new Date()
  if (Number.isNaN(paidAtDate.getTime())) {
    return Response.json({ error: "Invalid paid_at" }, { status: 400 })
  }
  const paidAtIso = paidAtDate.toISOString()

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select("id, status, interest_due_day, monthly_interest_amount")
    .eq("id", loanId)
    .single()

  if (loanError) {
    const status = loanError.code === "PGRST116" ? 404 : 500
    return Response.json({ error: loanError.message }, { status })
  }

  if (loan.status === "closed") {
    return Response.json({ error: "Loan is closed" }, { status: 400 })
  }

  // Mark the earliest unpaid payment that is due as-of today (supports overdue catch-up).
  const { data: duePayment, error: duePaymentError } = await supabase
    .from("monthly_interest_payments")
    .select("id, due_date, month_year, status, paid_at")
    .eq("loan_id", loanId)
    .is("paid_at", null)
    .neq("status", "paid")
    .lte("due_date", asOfDateIso)
    .order("due_date", { ascending: true })
    .maybeSingle()

  if (duePaymentError) {
    return Response.json({ error: duePaymentError.message }, { status: 500 })
  }

  // If there is nothing due yet (e.g. we only have a UI fallback for "due today"), create a paid row for today.
  if (!duePayment?.id) {
    const dueDateIso = buildDueDateIsoForMonth(Number(loan.interest_due_day), asOfUtc)
    const amount = Number(loan.monthly_interest_amount)

    const { error: insertPaidError } = await supabase.from("monthly_interest_payments").insert({
      loan_id: loanId,
      month_year: asOfMonthYear,
      due_date: dueDateIso,
      amount: Number.isFinite(amount) ? amount : 0,
      status: "paid",
      paid_at: paidAtIso,
    })

    if (insertPaidError) {
      return Response.json({ error: insertPaidError.message }, { status: 500 })
    }

    const next = await ensureNextMonthPendingPayment({
      loanId,
      interestDueDay: Number(loan.interest_due_day),
      amount,
      baseDueDateIso: dueDateIso,
    })
    if (!next.ok) {
      return Response.json({ error: next.error }, { status: 500 })
    }

    return Response.json(
      { ok: true, loan_id: loanId, month_year: asOfMonthYear, created: true, next_month_payment: next },
      { status: 201 }
    )
  }

  // Otherwise: mark the actual due/overdue row as paid, then schedule the next month relative to that due date.
  if (duePayment?.id) {
    const { error: updateError } = await supabase
      .from("monthly_interest_payments")
      .update({ status: "paid", paid_at: paidAtIso })
      .eq("id", duePayment.id)

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    const amount = Number(loan.monthly_interest_amount)
    const next = await ensureNextMonthPendingPayment({
      loanId,
      interestDueDay: Number(loan.interest_due_day),
      amount,
      baseDueDateIso: duePayment.due_date,
    })
    if (!next.ok) {
      return Response.json({ error: next.error }, { status: 500 })
    }

    return Response.json(
      { ok: true, loan_id: loanId, month_year: duePayment.month_year, updated: true, next_month_payment: next },
      { status: 200 }
    )
  }

  return Response.json({ error: "No due payment found" }, { status: 400 })
}

