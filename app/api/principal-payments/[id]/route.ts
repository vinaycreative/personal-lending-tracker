import { supabase } from "@/lib/supabase/client"
import moment from "moment"

type Params = { id?: string }

type UpdateTopUpRequest = {
  amount?: number
  date?: string // YYYY-MM-DD
  notes?: string
}

function isTopUpNote(notes: unknown) {
  return typeof notes === "string" && notes.toLowerCase().startsWith("top-up")
}

function parseIsoDateOnly(dateIso: string) {
  const m = moment.utc(dateIso, "YYYY-MM-DD", true)
  return m.isValid() ? m : null
}

async function recomputeLoanInterest(loanId: string) {
  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select("id, principal_amount, interest_percentage, status")
    .eq("id", loanId)
    .single()

  if (loanError) return { ok: false as const, error: loanError.message }
  if (loan.status === "closed") return { ok: false as const, error: "Loan is closed" }

  const { data: principalRows, error: principalError } = await supabase
    .from("principal_payments")
    .select("amount, notes")
    .eq("loan_id", loanId)
    .gt("amount", 0)
    .limit(20000)

  if (principalError) return { ok: false as const, error: principalError.message }

  const principalPaid = (principalRows ?? []).reduce((sum, r) => {
    if (isTopUpNote(r.notes)) return sum
    return sum + (Number(r.amount) || 0)
  }, 0)

  const principalAmount = Number(loan.principal_amount) || 0
  const principalCurrent = Math.max(0, principalAmount - principalPaid)

  const rate = Number(loan.interest_percentage) || 0
  if (!Number.isFinite(rate) || rate <= 0) return { ok: false as const, error: "Invalid interest rate" }

  const monthlyInterestAmount = Number((principalCurrent * (rate / 100)).toFixed(2))

  const { error: updateLoanError } = await supabase
    .from("loans")
    .update({ monthly_interest_amount: monthlyInterestAmount })
    .eq("id", loanId)

  if (updateLoanError) return { ok: false as const, error: updateLoanError.message }

  await supabase
    .from("monthly_interest_payments")
    .update({ amount: monthlyInterestAmount })
    .eq("loan_id", loanId)
    .is("paid_at", null)
    .neq("status", "paid")

  return { ok: true as const, principal_current: principalCurrent, monthly_interest_amount: monthlyInterestAmount }
}

export async function PUT(request: Request, context: { params: Params | Promise<Params> }) {
  const { id } = await Promise.resolve(context.params)
  const paymentId = id?.trim()

  if (!paymentId) return Response.json({ error: "Payment id is required" }, { status: 400 })

  let body: UpdateTopUpRequest = {}
  try {
    body = (await request.json()) as UpdateTopUpRequest
  } catch {
    body = {}
  }

  const { data: existing, error: existingError } = await supabase
    .from("principal_payments")
    .select("id, loan_id, amount, paid_at, notes")
    .eq("id", paymentId)
    .single()

  if (existingError) {
    const status = existingError.code === "PGRST116" ? 404 : 500
    return Response.json({ error: existingError.message }, { status })
  }

  if (!isTopUpNote(existing.notes)) {
    return Response.json({ error: "Only top-up entries can be edited" }, { status: 400 })
  }

  const nextAmount =
    body.amount !== undefined ? Number(body.amount) : Number(existing.amount)
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    return Response.json({ error: "Amount must be greater than 0" }, { status: 400 })
  }

  const nextDateIso = typeof body.date === "string" ? body.date.trim() : ""
  const date = body.date !== undefined ? parseIsoDateOnly(nextDateIso) : null
  if (body.date !== undefined && !date) {
    return Response.json({ error: "Date must be a valid YYYY-MM-DD" }, { status: 400 })
  }

  const noteBody = typeof body.notes === "string" ? body.notes.trim() : ""
  const nextNotes =
    body.notes !== undefined
      ? noteBody
        ? `Top-up: ${noteBody}`
        : "Top-up"
      : String(existing.notes ?? "Top-up")

  const loanId = String(existing.loan_id)

  // Keep principal_amount consistent with edited top-up amount.
  const oldAmount = Number(existing.amount) || 0
  const delta = nextAmount - oldAmount

  if (delta !== 0) {
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("id, principal_amount, status")
      .eq("id", loanId)
      .single()
    if (loanError) return Response.json({ error: loanError.message }, { status: 500 })
    if (loan.status === "closed") return Response.json({ error: "Loan is closed" }, { status: 400 })

    const principalAmount = Number(loan.principal_amount) || 0
    const nextPrincipalAmount = Math.max(0, principalAmount + delta)

    const { error: principalUpdateError } = await supabase
      .from("loans")
      .update({ principal_amount: nextPrincipalAmount })
      .eq("id", loanId)
    if (principalUpdateError) {
      return Response.json({ error: principalUpdateError.message }, { status: 500 })
    }
  }

  const paidAtIso =
    body.date !== undefined && date ? date.startOf("day").toISOString() : (existing.paid_at as string)

  const { error: updateError } = await supabase
    .from("principal_payments")
    .update({
      ...(body.amount !== undefined ? { amount: nextAmount } : {}),
      ...(body.date !== undefined ? { paid_at: paidAtIso } : {}),
      ...(body.notes !== undefined ? { notes: nextNotes } : {}),
    })
    .eq("id", paymentId)

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

  const recompute = await recomputeLoanInterest(loanId)
  if (!recompute.ok) return Response.json({ error: recompute.error }, { status: 500 })

  return Response.json(
    { payment_id: paymentId, loan_id: loanId, ...recompute },
    { status: 200 }
  )
}

export async function DELETE(_request: Request, context: { params: Params | Promise<Params> }) {
  const { id } = await Promise.resolve(context.params)
  const paymentId = id?.trim()

  if (!paymentId) return Response.json({ error: "Payment id is required" }, { status: 400 })

  const { data: existing, error: existingError } = await supabase
    .from("principal_payments")
    .select("id, loan_id, amount, notes")
    .eq("id", paymentId)
    .single()

  if (existingError) {
    const status = existingError.code === "PGRST116" ? 404 : 500
    return Response.json({ error: existingError.message }, { status })
  }

  if (!isTopUpNote(existing.notes)) {
    return Response.json({ error: "Only top-up entries can be deleted" }, { status: 400 })
  }

  const loanId = String(existing.loan_id)
  const amount = Number(existing.amount) || 0

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select("id, principal_amount, status")
    .eq("id", loanId)
    .single()
  if (loanError) return Response.json({ error: loanError.message }, { status: 500 })
  if (loan.status === "closed") return Response.json({ error: "Loan is closed" }, { status: 400 })

  const principalAmount = Number(loan.principal_amount) || 0
  const nextPrincipalAmount = Math.max(0, principalAmount - amount)

  const { error: principalUpdateError } = await supabase
    .from("loans")
    .update({ principal_amount: nextPrincipalAmount })
    .eq("id", loanId)
  if (principalUpdateError) {
    return Response.json({ error: principalUpdateError.message }, { status: 500 })
  }

  const { error: deleteError } = await supabase.from("principal_payments").delete().eq("id", paymentId)
  if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 })

  const recompute = await recomputeLoanInterest(loanId)
  if (!recompute.ok) return Response.json({ error: recompute.error }, { status: 500 })

  return Response.json(
    { payment_id: paymentId, loan_id: loanId, ...recompute },
    { status: 200 }
  )
}

