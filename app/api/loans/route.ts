import { supabase } from "@/lib/supabase/client"
import moment from "moment"

type CreateLoanRequest = {
  borrower: {
    name?: string
    phone?: string | null
    relationship_type?: string | null
    notes?: string | null
  }
  loan: {
    principal_amount?: number
    interest_percentage?: number
    interest_due_day?: number
    loan_start_date?: string
    return_months?: number | null
    status?: string
  }
}

function currentMonthYear(now = new Date()) {
  return moment.utc(now).format("YYYY-MM")
}

function parseIsoDateOnly(dateIso: string) {
  const m = moment.utc(dateIso, "YYYY-MM-DD", true)
  return m.isValid() ? m.toDate() : null
}

function toIsoDate(date: Date) {
  return moment.utc(date).format("YYYY-MM-DD")
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
  return buildDueDateIsoForYearMonth(dueDay, monthRefUtc.getUTCFullYear(), monthRefUtc.getUTCMonth())
}

function fallbackDueDateIso(loanStartDateIso: string | null | undefined, dueDay: number, asOfUtc: Date) {
  const start = loanStartDateIso ? parseIsoDateOnly(loanStartDateIso) : null
  if (!start) return buildDueDateIsoForMonth(dueDay, asOfUtc)

  const startIso = toIsoDate(start)
  const startMonthYear = startIso.slice(0, 7)
  const asOfMonthYear = currentMonthYear(asOfUtc)

  // First interest is due *next month* after loan start.
  if (startMonthYear === asOfMonthYear) {
    const nextMonth = moment.utc(asOfUtc).add(1, "month")
    return buildDueDateIsoForYearMonth(dueDay, nextMonth.year(), nextMonth.month())
  }

  return buildDueDateIsoForMonth(dueDay, asOfUtc)
}

function buildNextMonthInterestSchedule(startDateIso: string, dueDay: number) {
  const start = parseIsoDateOnly(startDateIso)
  if (!start) return null

  const safeDay = clampDueDay(dueDay)
  const nextYear = start.getUTCFullYear()
  const nextMonth = start.getUTCMonth() + 1 // JS Date handles overflow (e.g. 12 -> Jan next year)

  const monthStart = new Date(Date.UTC(nextYear, nextMonth, 1))
  const year = monthStart.getUTCFullYear()
  const month = monthStart.getUTCMonth()

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(safeDay, daysInMonth)

  const month_year = `${year}-${String(month + 1).padStart(2, "0")}`
  const due_date = toIsoDate(new Date(Date.UTC(year, month, day)))

  return { month_year, due_date }
}

type PaymentStatus = "due" | "overdue" | "paid"

function computePaymentStatus(dueDateIso: string, isPaid: boolean, asOfDateIso: string) {
  if (isPaid) return "paid" as const
  return moment.utc(asOfDateIso, "YYYY-MM-DD").isAfter(moment.utc(dueDateIso, "YYYY-MM-DD"), "day")
    ? ("overdue" as const)
    : ("due" as const)
}

export async function GET() {
  const asOfUtc = new Date()
  const asOfDateIso = toIsoDate(asOfUtc)

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
      return_months,
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
  // NOTE: We derive `next_due_date` from `monthly_interest_payments.due_date` so due_date edits reflect immediately.
  const { data: allPayments, error: paymentsError } = loanIds.length
    ? await supabase
        .from("monthly_interest_payments")
        .select("loan_id, due_date, status, paid_at")
        .in("loan_id", loanIds)
        .order("due_date", { ascending: true })
        .limit(10000)
    : { data: [], error: null }

  if (paymentsError) {
    return Response.json({ error: paymentsError.message }, { status: 500 })
  }

  // Pick the earliest unpaid payment per loan as "next due".
  const nextUnpaidByLoanId = new Map<string, { due_date: string; status: string | null; paid_at: string | null }>()
  for (const row of allPayments ?? []) {
    const isPaid = row.status === "paid" || Boolean(row.paid_at)
    if (isPaid) continue
    if (!nextUnpaidByLoanId.has(row.loan_id)) nextUnpaidByLoanId.set(row.loan_id, row)
  }

  const { data: paidPayments, error: paidPaymentsError } = loanIds.length
    ? await supabase
        .from("monthly_interest_payments")
        .select("loan_id, paid_at")
        .in("loan_id", loanIds)
        .not("paid_at", "is", null)
        .order("paid_at", { ascending: false })
        .limit(500)
    : { data: [], error: null }

  if (paidPaymentsError) {
    return Response.json({ error: paidPaymentsError.message }, { status: 500 })
  }

  const lastPaidAtByLoanId = new Map<string, string>()
  for (const row of paidPayments ?? []) {
    if (!row.paid_at) continue
    if (!lastPaidAtByLoanId.has(row.loan_id)) lastPaidAtByLoanId.set(row.loan_id, row.paid_at)
  }

  const responseLoans = (loans ?? []).map((loan) => {
    const borrower = (loan as any).borrowers as
      | { id: string; name: string; phone: string | null; relationship_type: string | null }
      | null
      | undefined

    const mp = nextUnpaidByLoanId.get(String(loan.id))
    const dueDateIso = mp?.due_date ?? fallbackDueDateIso(loan.loan_start_date, loan.interest_due_day, asOfUtc)
    const isPaid = Boolean(mp) ? false : loan.status === "closed"
    const payment_status = computePaymentStatus(dueDateIso, isPaid, asOfDateIso)

    const lastPaidAt = lastPaidAtByLoanId.get(loan.id) ?? null

    return {
      id: loan.id,
      borrower_id: loan.borrower_id,
      borrower_name: borrower?.name ?? "Unknown",
      borrower_phone: borrower?.phone ?? null,
      relationship_type: borrower?.relationship_type ?? null,
      principal_amount: loan.principal_amount,
      monthly_interest_amount: loan.monthly_interest_amount,
      interest_due_day: loan.interest_due_day,
      loan_start_date: loan.loan_start_date,
      return_months: loan.return_months,
      loan_status: loan.status,
      next_due_date: dueDateIso,
      payment_status,
      last_paid_at: lastPaidAt,
    }
  })

  return Response.json({ loans: responseLoans }, { status: 200 })
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateLoanRequest
  const name = body.borrower?.name?.trim()
  const principal = Number(body.loan?.principal_amount)
  const rate = Number(body.loan?.interest_percentage)
  const dueDay = Number(body.loan?.interest_due_day)
  const startDate = body.loan?.loan_start_date

  if (!name) return Response.json({ error: "Borrower name is required" }, { status: 400 })
  if (!principal || principal <= 0)
    return Response.json({ error: "Principal amount must be greater than 0" }, { status: 400 })
  if (!rate || rate <= 0)
    return Response.json({ error: "Interest percentage must be greater than 0" }, { status: 400 })
  if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 30)
    return Response.json({ error: "Interest due day must be between 1 and 30" }, { status: 400 })
  if (!startDate) return Response.json({ error: "Loan start date is required" }, { status: 400 })

  const monthlyInterestAmount = Number((principal * (rate / 100)).toFixed(2))

  const { data: borrower, error: borrowerError } = await supabase
    .from("borrowers")
    .insert({
      name,
      phone: body.borrower?.phone ?? null,
      relationship_type: body.borrower?.relationship_type ?? null,
      notes: body.borrower?.notes ?? null,
    })
    .select()
    .single()

  if (borrowerError || !borrower) {
    return Response.json({ error: borrowerError?.message || "Failed to create borrower" }, { status: 500 })
  }

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .insert({
      borrower_id: borrower.id,
      principal_amount: principal,
      interest_percentage: rate,
      monthly_interest_amount: monthlyInterestAmount,
      interest_due_day: dueDay,
      loan_start_date: startDate,
      return_months: body.loan?.return_months ?? null,
      status: body.loan?.status ?? "active",
    })
    .select()
    .single()

  if (loanError || !loan) {
    // Best-effort cleanup of the borrower we just created
    await supabase.from("borrowers").delete().eq("id", borrower.id)
    return Response.json({ error: loanError?.message || "Failed to create loan" }, { status: 500 })
  }

  // MUST create exactly one monthly interest record for the *next month* at loan creation time
  const schedule = buildNextMonthInterestSchedule(startDate, dueDay)
  if (!schedule) {
    await supabase.from("loans").delete().eq("id", loan.id)
    await supabase.from("borrowers").delete().eq("id", borrower.id)
    return Response.json({ error: "Invalid loan start date" }, { status: 400 })
  }

  const { error: interestInsertError } = await supabase.from("monthly_interest_payments").insert({
    loan_id: loan.id,
    month_year: schedule.month_year,
    due_date: schedule.due_date,
    amount: monthlyInterestAmount,
    status: "pending",
  })

  if (interestInsertError) {
    // Ensure we don't end up with a loan created without its initial monthly interest record
    await supabase.from("loans").delete().eq("id", loan.id)
    await supabase.from("borrowers").delete().eq("id", borrower.id)
    return Response.json({ error: interestInsertError.message }, { status: 500 })
  }

  return Response.json({ borrower, loan }, { status: 201 })
}
