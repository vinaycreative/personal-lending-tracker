import { supabase } from "@/lib/supabase/client"
import moment from "moment"

type Params = { id?: string }

type BorrowerRow = {
  id: string
  name: string
  phone: string | null
  relationship_type: string | null
  notes: string | null
  created_at: string | null
}

type LoanRow = {
  id: string
  borrower_id: string
  created_at: string | null
  principal_amount: number
  interest_percentage: number
  monthly_interest_amount: number
  interest_due_day: number
  loan_start_date: string
  return_months: number | null
  status: string
  closed_at: string | null
  borrowers?: BorrowerRow | BorrowerRow[] | null
}

function getBorrower(loan: LoanRow): BorrowerRow | null {
  const b = loan.borrowers
  if (!b) return null
  return Array.isArray(b) ? (b[0] ?? null) : b
}

type UpdateLoanRequest = {
  borrower?: {
    name?: string
    phone?: string | null
    relationship_type?: string | null
    notes?: string | null
  }
  loan?: {
    principal_amount?: number
    interest_percentage?: number
    interest_due_day?: number
    loan_start_date?: string
    return_months?: number | null
    status?: string
  }
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

export async function GET(_request: Request, context: { params: Params | Promise<Params> }) {
  const { id } = await Promise.resolve(context.params)
  const loanId = id?.trim()

  if (!loanId) {
    return Response.json({ error: "Loan id is required" }, { status: 400 })
  }

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select(
      `
      id,
      borrower_id,
      created_at,
      principal_amount,
      interest_percentage,
      monthly_interest_amount,
      interest_due_day,
      loan_start_date,
      return_months,
      status,
      closed_at,
      borrowers (
        id,
        name,
        phone,
        relationship_type,
        notes,
        created_at
      )
    `
    )
    .eq("id", loanId)
    .single()

  if (loanError) {
    const status = loanError.code === "PGRST116" ? 404 : 500
    return Response.json({ error: loanError.message }, { status })
  }

  const { data: interestPayments, error: interestError } = await supabase
    .from("monthly_interest_payments")
    .select("id, loan_id, month_year, due_date, amount, status, paid_at, created_at")
    .eq("loan_id", loanId)
    .order("due_date", { ascending: false })
    .limit(60)

  if (interestError) {
    return Response.json({ error: interestError.message }, { status: 500 })
  }

  // Total interest collected so far (not limited to the 24 rows used for UI history).
  const { data: paidInterestRows, error: paidInterestError } = await supabase
    .from("monthly_interest_payments")
    .select("amount, status, paid_at")
    .eq("loan_id", loanId)
    .or("status.eq.paid,paid_at.not.is.null")
    .limit(5000)

  if (paidInterestError) {
    return Response.json({ error: paidInterestError.message }, { status: 500 })
  }

  const interest_paid_total = Number(
    (paidInterestRows ?? []).reduce((sum, row) => {
      const amount = Number(row.amount)
      return Number.isFinite(amount) ? sum + amount : sum
    }, 0)
  )

  const { data: principalPayments, error: principalError } = await supabase
    .from("principal_payments")
    .select("id, loan_id, amount, paid_at, notes, created_at")
    .eq("loan_id", loanId)
    .order("paid_at", { ascending: false })
    .limit(200)

  if (principalError) {
    return Response.json({ error: principalError.message }, { status: 500 })
  }

  const { data: principalPaidRows, error: principalPaidError } = await supabase
    .from("principal_payments")
    .select("amount, notes")
    .eq("loan_id", loanId)
    .gt("amount", 0)
    .limit(20000)

  if (principalPaidError) {
    return Response.json({ error: principalPaidError.message }, { status: 500 })
  }

  const principalPaid = (principalPaidRows ?? []).reduce((sum, row) => {
    const notes = typeof row.notes === "string" ? row.notes : ""
    const isTopUp = notes.toLowerCase().startsWith("top-up")
    if (isTopUp) return sum
    return sum + (Number(row.amount) || 0)
  }, 0)
  const principal_current = (Number((loan as unknown as LoanRow).principal_amount) || 0) - principalPaid

  const borrower = getBorrower(loan as unknown as LoanRow)

  return Response.json(
    {
      loan: {
        id: loan.id,
        borrower_id: loan.borrower_id,
        principal_amount: loan.principal_amount,
        principal_current,
        interest_percentage: loan.interest_percentage,
        monthly_interest_amount: loan.monthly_interest_amount,
        interest_due_day: loan.interest_due_day,
        loan_start_date: loan.loan_start_date,
        return_months: loan.return_months,
        status: loan.status,
        closed_at: loan.closed_at,
        created_at: loan.created_at ?? null,
      },
      borrower,
      interest_paid_total,
      monthly_interest_payments: interestPayments ?? [],
      principal_payments: principalPayments ?? [],
    },
    { status: 200 }
  )
}

export async function PUT(request: Request, context: { params: Params | Promise<Params> }) {
  const { id } = await Promise.resolve(context.params)
  const loanId = id?.trim()

  if (!loanId) {
    return Response.json({ error: "Loan id is required" }, { status: 400 })
  }

  let body: UpdateLoanRequest = {}
  try {
    body = (await request.json()) as UpdateLoanRequest
  } catch {
    body = {}
  }

  const { data: existingLoan, error: existingLoanError } = await supabase
    .from("loans")
    .select("id, borrower_id, principal_amount, interest_percentage, interest_due_day, status")
    .eq("id", loanId)
    .single()

  if (existingLoanError) {
    const status = existingLoanError.code === "PGRST116" ? 404 : 500
    return Response.json({ error: existingLoanError.message }, { status })
  }

  const borrowerUpdates = body.borrower ?? null
  if (borrowerUpdates) {
    const nextName = borrowerUpdates.name?.trim()
    if (typeof borrowerUpdates.name === "string" && !nextName) {
      return Response.json({ error: "Borrower name cannot be empty" }, { status: 400 })
    }

    const { error: borrowerError } = await supabase
      .from("borrowers")
      .update({
        ...(typeof borrowerUpdates.name === "string" ? { name: nextName } : {}),
        ...(borrowerUpdates.phone !== undefined ? { phone: borrowerUpdates.phone ?? null } : {}),
        ...(borrowerUpdates.relationship_type !== undefined
          ? { relationship_type: borrowerUpdates.relationship_type ?? null }
          : {}),
        ...(borrowerUpdates.notes !== undefined ? { notes: borrowerUpdates.notes ?? null } : {}),
      })
      .eq("id", existingLoan.borrower_id)

    if (borrowerError) {
      return Response.json({ error: borrowerError.message }, { status: 500 })
    }
  }

  const loanUpdates = body.loan ?? null
  if (loanUpdates) {
    const principal =
      loanUpdates.principal_amount !== undefined
        ? Number(loanUpdates.principal_amount)
        : Number(existingLoan.principal_amount)
    const rate =
      loanUpdates.interest_percentage !== undefined
        ? Number(loanUpdates.interest_percentage)
        : Number(existingLoan.interest_percentage)
    const dueDay =
      loanUpdates.interest_due_day !== undefined
        ? clampDueDay(Number(loanUpdates.interest_due_day))
        : clampDueDay(Number(existingLoan.interest_due_day))

    if (!principal || principal <= 0) {
      return Response.json({ error: "Principal amount must be greater than 0" }, { status: 400 })
    }
    if (!rate || rate <= 0) {
      return Response.json({ error: "Interest percentage must be greater than 0" }, { status: 400 })
    }

    const monthlyInterestAmount = Number((principal * (rate / 100)).toFixed(2))

    const nextStatus =
      typeof loanUpdates.status === "string" && loanUpdates.status.trim()
        ? loanUpdates.status.trim()
        : existingLoan.status

    const closedAtPatch =
      nextStatus === "closed" ? { closed_at: new Date().toISOString() } : { closed_at: null }

    const { error: loanError } = await supabase
      .from("loans")
      .update({
        ...(loanUpdates.principal_amount !== undefined ? { principal_amount: principal } : {}),
        ...(loanUpdates.interest_percentage !== undefined ? { interest_percentage: rate } : {}),
        ...(loanUpdates.interest_due_day !== undefined ? { interest_due_day: dueDay } : {}),
        ...(loanUpdates.loan_start_date !== undefined ? { loan_start_date: loanUpdates.loan_start_date } : {}),
        ...(loanUpdates.return_months !== undefined ? { return_months: loanUpdates.return_months } : {}),
        ...(loanUpdates.status !== undefined ? { status: nextStatus } : {}),
        monthly_interest_amount: monthlyInterestAmount,
        ...(loanUpdates.status !== undefined ? closedAtPatch : {}),
      })
      .eq("id", loanId)

    if (loanError) {
      return Response.json({ error: loanError.message }, { status: 500 })
    }

    // Keep unpaid interest payment amounts in sync with the updated monthly interest.
    await supabase
      .from("monthly_interest_payments")
      .update({ amount: monthlyInterestAmount })
      .eq("loan_id", loanId)
      .is("paid_at", null)
      .neq("status", "paid")

    // If due day changed, adjust due_date for unpaid rows based on their month_year.
    if (loanUpdates.interest_due_day !== undefined) {
      const { data: unpaidRows } = await supabase
        .from("monthly_interest_payments")
        .select("id, month_year")
        .eq("loan_id", loanId)
        .is("paid_at", null)
        .neq("status", "paid")
        .limit(5000)

      for (const row of unpaidRows ?? []) {
        const monthYear = String(row.month_year ?? "")
        const [y, m] = monthYear.split("-").map((v) => Number(v))
        if (!y || !m) continue
        const dueDateIso = buildDueDateIsoForYearMonth(dueDay, y, m - 1)
        await supabase.from("monthly_interest_payments").update({ due_date: dueDateIso }).eq("id", row.id)
      }
    }
  }

  // Return refreshed detail payload (same shape as GET consumer expects).
  const { data: updated, error: updatedError } = await supabase
    .from("loans")
    .select(
      `
      id,
      borrower_id,
      created_at,
      principal_amount,
      interest_percentage,
      monthly_interest_amount,
      interest_due_day,
      loan_start_date,
      return_months,
      status,
      closed_at,
      borrowers (
        id,
        name,
        phone,
        relationship_type,
        notes,
        created_at
      )
    `
    )
    .eq("id", loanId)
    .single()

  if (updatedError) {
    return Response.json({ error: updatedError.message }, { status: 500 })
  }

  return Response.json(
    {
      loan: {
        id: updated.id,
        borrower_id: updated.borrower_id,
        principal_amount: updated.principal_amount,
        interest_percentage: updated.interest_percentage,
        monthly_interest_amount: updated.monthly_interest_amount,
        interest_due_day: updated.interest_due_day,
        loan_start_date: updated.loan_start_date,
        return_months: updated.return_months,
        status: updated.status,
        closed_at: updated.closed_at,
        created_at: updated.created_at ?? null,
      },
      borrower: getBorrower(updated as unknown as LoanRow),
    },
    { status: 200 }
  )
}

export async function DELETE(_request: Request, context: { params: Params | Promise<Params> }) {
  const { id } = await Promise.resolve(context.params)
  const loanId = id?.trim()

  if (!loanId) {
    return Response.json({ error: "Loan id is required" }, { status: 400 })
  }

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select("id, borrower_id")
    .eq("id", loanId)
    .single()

  if (loanError) {
    const status = loanError.code === "PGRST116" ? 404 : 500
    return Response.json({ error: loanError.message }, { status })
  }

  const borrowerId = String(loan.borrower_id)

  const { error: interestDeleteError } = await supabase.from("monthly_interest_payments").delete().eq("loan_id", loanId)
  if (interestDeleteError) {
    return Response.json({ error: interestDeleteError.message }, { status: 500 })
  }

  const { error: principalDeleteError } = await supabase.from("principal_payments").delete().eq("loan_id", loanId)
  if (principalDeleteError) {
    return Response.json({ error: principalDeleteError.message }, { status: 500 })
  }

  const { error: loanDeleteError } = await supabase.from("loans").delete().eq("id", loanId)
  if (loanDeleteError) {
    return Response.json({ error: loanDeleteError.message }, { status: 500 })
  }

  // Delete borrower if they have no other loans.
  const { data: remainingLoans, error: remainingError } = await supabase
    .from("loans")
    .select("id")
    .eq("borrower_id", borrowerId)
    .limit(1)

  if (remainingError) {
    return Response.json({ error: remainingError.message }, { status: 500 })
  }

  let borrowerDeleted = false
  if (!remainingLoans || remainingLoans.length === 0) {
    const { error: borrowerDeleteError } = await supabase.from("borrowers").delete().eq("id", borrowerId)
    if (borrowerDeleteError) {
      return Response.json({ error: borrowerDeleteError.message }, { status: 500 })
    }
    borrowerDeleted = true
  }

  return Response.json({ ok: true, loan_id: loanId, borrower_deleted: borrowerDeleted }, { status: 200 })
}
