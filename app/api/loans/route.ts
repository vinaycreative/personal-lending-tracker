import { supabase } from "@/lib/supabase/client"

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

  return Response.json({ borrower, loan }, { status: 201 })
}
