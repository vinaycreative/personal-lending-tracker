import { supabase } from "@/lib/supabase/client"
import moment from "moment"

type PaymentStatus = "due" | "overdue" | "paid"

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

function monthYearFromIsoDate(dateIso: string) {
  // Expects YYYY-MM-DD
  return dateIso.slice(0, 7)
}

function clampDueDay(day: number) {
  if (!Number.isFinite(day)) return 1
  return Math.min(30, Math.max(1, Math.trunc(day)))
}

function buildDueDateIsoForYearMonth(dueDay: number, year: number, monthIndexZeroBased: number) {
  const safeDay = clampDueDay(dueDay)
  const daysInMonth = moment.utc({ year, month: monthIndexZeroBased, day: 1 }).daysInMonth()
  const day = Math.min(safeDay, daysInMonth)
  return moment.utc({ year, month: monthIndexZeroBased, day }).format("YYYY-MM-DD")
}

function buildDueDateIsoForMonth(dueDay: number, monthRefUtc: Date) {
  return buildDueDateIsoForYearMonth(
    dueDay,
    monthRefUtc.getUTCFullYear(),
    monthRefUtc.getUTCMonth()
  )
}

function fallbackDueDateIso(
  loanStartDateIso: string | null | undefined,
  dueDay: number,
  asOfUtc: Date
) {
  const start = loanStartDateIso ? parseIsoDateOnly(loanStartDateIso) : null
  if (!start) return buildDueDateIsoForMonth(dueDay, asOfUtc)

  const startIso = toIsoDate(start)
  const startMonthYear = monthYearFromIsoDate(startIso)
  const asOfMonthYear = currentMonthYear(asOfUtc)

  // IMPORTANT: In this app, the first interest cycle is due the *next month* after loan_start_date.
  // So if the loan started this month and there is no monthly_interest_payments row yet, treat next due as next month.
  if (startMonthYear === asOfMonthYear) {
    const nextMonth = moment.utc(asOfUtc).add(1, "month")
    return buildDueDateIsoForYearMonth(dueDay, nextMonth.year(), nextMonth.month())
  }

  return buildDueDateIsoForMonth(dueDay, asOfUtc)
}

function computePaymentStatus(
  dueDateIso: string,
  isPaid: boolean,
  asOfDateIso: string
): PaymentStatus {
  if (isPaid) return "paid"
  // Compare at "day" granularity to avoid time-of-day issues.
  return moment.utc(asOfDateIso, "YYYY-MM-DD").isAfter(moment.utc(dueDateIso, "YYYY-MM-DD"), "day")
    ? "overdue"
    : "due"
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const asOfParam = url.searchParams.get("asOf")?.trim() ?? null

  const asOfDate = asOfParam ? parseIsoDateOnly(asOfParam) : null
  const asOfUtc = asOfDate ?? new Date()
  const asOfDateIso = toIsoDate(asOfUtc)
  // NOTE: We intentionally drive "due today / overdue" off `monthly_interest_payments.due_date`,
  // not `month_year`, so manual due_date edits reflect immediately.

  const { data: loans, error } = await supabase
    .from("loans")
    .select(
      `
      id,
      borrower_id,
      principal_amount,
      monthly_interest_amount,
      interest_due_day,
      loan_start_date,
      status,
      borrowers (
        id,
        name,
        phone,
        relationship_type
      )
    `
    )
    .order("created_at", { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const loanIds = (loans ?? []).map((l) => l.id)

  const { data: paymentsDueByAsOf, error: paymentsError } = loanIds.length
    ? await supabase
        .from("monthly_interest_payments")
        .select("loan_id, due_date, status, paid_at, amount")
        .in("loan_id", loanIds)
        .lte("due_date", asOfDateIso)
        .order("due_date", { ascending: true })
        .limit(5000)
    : { data: [], error: null }

  if (paymentsError) {
    return Response.json({ error: paymentsError.message }, { status: 500 })
  }

  // Pick the earliest unpaid payment per loan (most overdue / due today).
  const unpaidDueByLoanId = new Map<
    string,
    { due_date: string; status: string | null; paid_at: string | null; amount: number | null }
  >()
  for (const row of paymentsDueByAsOf ?? []) {
    const isPaid = row.status === "paid" || Boolean(row.paid_at)
    if (isPaid) continue
    if (!unpaidDueByLoanId.has(row.loan_id)) unpaidDueByLoanId.set(row.loan_id, row)
  }

  const loanById = new Map((loans ?? []).map((l) => [String(l.id), l] as const))

  const normalizedLoans = (loans ?? []).map((loan) => {
    const borrower = (loan as any).borrowers as
      | { id: string; name: string; phone: string | null; relationship_type: string | null }
      | null
      | undefined

    const mp = unpaidDueByLoanId.get(String(loan.id))
    const dueDateIso =
      mp?.due_date ??
      fallbackDueDateIso((loan as any).loan_start_date, loan.interest_due_day, asOfUtc)
    const isPaid = Boolean(mp) ? false : loan.status === "closed" // if no unpaid row is found, treat as paid only when loan is closed
    const payment_status = computePaymentStatus(dueDateIso, isPaid, asOfDateIso)

    return {
      id: String(loan.id),
      borrower_id: String(loan.borrower_id),
      borrower_name: borrower?.name ?? "Unknown",
      borrower_phone: borrower?.phone ?? null,
      relationship_type: borrower?.relationship_type ?? null,
      principal_amount: Number(loan.principal_amount) || 0,
      monthly_interest_amount: Number(loan.monthly_interest_amount) || 0,
      loan_status: String(loan.status ?? ""),
      next_due_date: dueDateIso,
      payment_status,
    }
  })

  const totals = normalizedLoans.reduce(
    (acc, loan) => {
      // Keep this aligned with UI expectations: show overall totals (not just "today's due")
      acc.total_principal += loan.principal_amount
      acc.total_monthly_interest += loan.monthly_interest_amount
      return acc
    },
    { total_principal: 0, total_monthly_interest: 0 }
  )

  // IMPORTANT: "Today's Due" should be driven ONLY by unpaid rows in `monthly_interest_payments`.
  // This prevents already-paid items from showing due to fallback `loan_start_date` logic.
  const todaysDue = Array.from(unpaidDueByLoanId.entries())
    .map(([loanId, payment]) => {
      const loan = loanById.get(loanId)
      if (!loan) return null
      if (String((loan as any).status ?? "") === "closed") return null

      const borrower = (loan as any).borrowers as
        | { id: string; name: string; phone: string | null; relationship_type: string | null }
        | null
        | undefined

      const dueDateIso = payment.due_date
      const payment_status: PaymentStatus = moment
        .utc(asOfDateIso, "YYYY-MM-DD")
        .isAfter(moment.utc(dueDateIso, "YYYY-MM-DD"), "day")
        ? "overdue"
        : "due"

      return {
        id: String(loan.id),
        borrower_id: String(loan.borrower_id),
        borrower_name: borrower?.name ?? "Unknown",
        borrower_phone: borrower?.phone ?? null,
        relationship_type: borrower?.relationship_type ?? null,
        principal_amount: Number(loan.principal_amount) || 0,
        monthly_interest_amount: Number(payment.amount ?? loan.monthly_interest_amount) || 0,
        loan_status: String((loan as any).status ?? ""),
        next_due_date: dueDateIso,
        payment_status,
      }
    })
    .filter(Boolean) as typeof normalizedLoans

  const interestDueToday = todaysDue
    .filter((loan) => loan.next_due_date === asOfDateIso)
    .reduce((sum, loan) => sum + loan.monthly_interest_amount, 0)

  const overdueInterest = todaysDue
    .filter((loan) => loan.payment_status === "overdue")
    .reduce((sum, loan) => sum + loan.monthly_interest_amount, 0)

  const dueTodayCount = todaysDue.filter((loan) => loan.next_due_date === asOfDateIso).length
  const overdueCount = todaysDue.filter((loan) => loan.payment_status === "overdue").length

  return Response.json(
    {
      as_of_date: asOfDateIso,
      totals,
      collection_focus: {
        need_to_collect: interestDueToday + overdueInterest,
        interest_due_today: interestDueToday,
        overdue_interest: overdueInterest,
        due_today_count: dueTodayCount,
        overdue_count: overdueCount,
      },
      todays_due: todaysDue,
    },
    { status: 200 }
  )
}
