import { supabase } from "@/lib/supabase/client"
import moment from "moment"

type Params = { id?: string }

type TopUpRequest = {
  amount?: number
  date?: string // ISO date-only (YYYY-MM-DD)
  notes?: string
}

function parseIsoDateOnly(dateIso: string) {
  const m = moment.utc(dateIso, "YYYY-MM-DD", true)
  return m.isValid() ? m : null
}

export async function POST(request: Request, context: { params: Params | Promise<Params> }) {
  const { id } = await Promise.resolve(context.params)
  const loanId = id?.trim()

  if (!loanId) {
    return Response.json({ error: "Loan id is required" }, { status: 400 })
  }

  let body: TopUpRequest = {}
  try {
    body = (await request.json()) as TopUpRequest
  } catch {
    body = {}
  }

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Top-up amount must be greater than 0" }, { status: 400 })
  }

  const dateIso = typeof body.date === "string" ? body.date.trim() : ""
  const date = parseIsoDateOnly(dateIso)
  if (!date) {
    return Response.json({ error: "Top-up date must be a valid YYYY-MM-DD" }, { status: 400 })
  }

  const notes = typeof body.notes === "string" ? body.notes.trim() : ""

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select("id, status, principal_amount, interest_percentage, monthly_interest_amount")
    .eq("id", loanId)
    .single()

  if (loanError) {
    const status = loanError.code === "PGRST116" ? 404 : 500
    return Response.json({ error: loanError.message }, { status })
  }

  if (loan.status === "closed") {
    return Response.json({ error: "Loan is closed" }, { status: 400 })
  }

  const { data: principalRows, error: principalError } = await supabase
    .from("principal_payments")
    .select("amount, notes")
    .eq("loan_id", loanId)
    .limit(20000)

  if (principalError) {
    return Response.json({ error: principalError.message }, { status: 500 })
  }

  // Repayments are positive amounts. Top-ups are logged as negative amounts (audit trail),
  // but do NOT reduce outstanding principal in calculations.
  const principalPaid = (principalRows ?? []).reduce((sum, r) => {
    const v = Number(r.amount) || 0
    const notes = typeof r.notes === "string" ? r.notes : ""
    const isTopUp = notes.toLowerCase().startsWith("top-up")
    if (isTopUp) return sum
    return v > 0 ? sum + v : sum
  }, 0)
  const principalAmount = Number(loan.principal_amount) || 0
  const principalCurrent = principalAmount - principalPaid
  const nextPrincipalAmount = principalAmount + amount
  const nextPrincipalCurrent = nextPrincipalAmount - principalPaid

  const rate = Number(loan.interest_percentage) || 0
  if (!Number.isFinite(rate) || rate <= 0) {
    return Response.json({ error: "Interest percentage must be greater than 0" }, { status: 400 })
  }

  const monthlyInterestAmount = Number((nextPrincipalCurrent * (rate / 100)).toFixed(2))

  // 1) Audit trail entry.
  const paidAtIso = date.startOf("day").toISOString()
  const topUpNote = notes ? `Top-up: ${notes}` : "Top-up"

  const { error: insertError } = await supabase.from("principal_payments").insert({
    loan_id: loanId,
    amount,
    paid_at: paidAtIso,
    notes: topUpNote,
  })

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 })
  }

  // 2) Update the loan's principal + monthly interest to reflect the combined principal.
  const { error: loanUpdateError } = await supabase
    .from("loans")
    .update({ principal_amount: nextPrincipalAmount, monthly_interest_amount: monthlyInterestAmount })
    .eq("id", loanId)

  if (loanUpdateError) {
    return Response.json({ error: loanUpdateError.message }, { status: 500 })
  }

  // 3) Keep unpaid interest payment rows in sync with the new monthly interest.
  await supabase
    .from("monthly_interest_payments")
    .update({ amount: monthlyInterestAmount })
    .eq("loan_id", loanId)
    .is("paid_at", null)
    .neq("status", "paid")

  return Response.json(
    {
      ok: true,
      loan_id: loanId,
      top_up: { amount, date: dateIso, notes: topUpNote },
      principal_current: nextPrincipalCurrent,
      monthly_interest_amount: monthlyInterestAmount,
    },
    { status: 201 }
  )
}

