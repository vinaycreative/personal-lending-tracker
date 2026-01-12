import { supabase } from "@/lib/supabase/client"

type Params = { id?: string }

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
    .limit(24)

  if (interestError) {
    return Response.json({ error: interestError.message }, { status: 500 })
  }

  const { data: principalPayments, error: principalError } = await supabase
    .from("principal_payments")
    .select("id, loan_id, amount, paid_at, notes, created_at")
    .eq("loan_id", loanId)
    .order("paid_at", { ascending: false })
    .limit(24)

  if (principalError) {
    return Response.json({ error: principalError.message }, { status: 500 })
  }

  const borrower = (loan as any).borrowers ?? null

  return Response.json(
    {
      loan: {
        id: loan.id,
        borrower_id: loan.borrower_id,
        principal_amount: loan.principal_amount,
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
      monthly_interest_payments: interestPayments ?? [],
      principal_payments: principalPayments ?? [],
    },
    { status: 200 }
  )
}
