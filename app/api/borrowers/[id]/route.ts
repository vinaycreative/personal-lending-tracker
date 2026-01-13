import { supabase } from "@/lib/supabase/client"

type Params = { id?: string }

type UpdateBorrowerRequest = {
  name?: string
  phone?: string | null
  relationship_type?: string | null
  notes?: string | null
}

export async function PUT(request: Request, context: { params: Params | Promise<Params> }) {
  const { id } = await Promise.resolve(context.params)
  const borrowerId = id?.trim()

  if (!borrowerId) {
    return Response.json({ error: "Borrower id is required" }, { status: 400 })
  }

  let body: UpdateBorrowerRequest = {}
  try {
    body = (await request.json()) as UpdateBorrowerRequest
  } catch {
    body = {}
  }

  if (typeof body.name === "string" && !body.name.trim()) {
    return Response.json({ error: "Name cannot be empty" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("borrowers")
    .update({
      ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
      ...(body.phone !== undefined ? { phone: body.phone ?? null } : {}),
      ...(body.relationship_type !== undefined ? { relationship_type: body.relationship_type ?? null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
    })
    .eq("id", borrowerId)
    .select()
    .single()

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500
    return Response.json({ error: error.message }, { status })
  }

  return Response.json({ borrower: data }, { status: 200 })
}

export async function DELETE(_request: Request, context: { params: Params | Promise<Params> }) {
  const { id } = await Promise.resolve(context.params)
  const borrowerId = id?.trim()

  if (!borrowerId) {
    return Response.json({ error: "Borrower id is required" }, { status: 400 })
  }

  // Fetch all loan ids for this borrower.
  const { data: loans, error: loansError } = await supabase
    .from("loans")
    .select("id")
    .eq("borrower_id", borrowerId)
    .limit(10000)

  if (loansError) {
    return Response.json({ error: loansError.message }, { status: 500 })
  }

  const loanIds = (loans ?? []).map((l) => String(l.id))

  if (loanIds.length) {
    const { error: interestDeleteError } = await supabase
      .from("monthly_interest_payments")
      .delete()
      .in("loan_id", loanIds)
    if (interestDeleteError) {
      return Response.json({ error: interestDeleteError.message }, { status: 500 })
    }

    const { error: principalDeleteError } = await supabase
      .from("principal_payments")
      .delete()
      .in("loan_id", loanIds)
    if (principalDeleteError) {
      return Response.json({ error: principalDeleteError.message }, { status: 500 })
    }

    const { error: loansDeleteError } = await supabase.from("loans").delete().in("id", loanIds)
    if (loansDeleteError) {
      return Response.json({ error: loansDeleteError.message }, { status: 500 })
    }
  }

  const { error: borrowerDeleteError } = await supabase.from("borrowers").delete().eq("id", borrowerId)
  if (borrowerDeleteError) {
    const status = borrowerDeleteError.code === "PGRST116" ? 404 : 500
    return Response.json({ error: borrowerDeleteError.message }, { status })
  }

  return Response.json({ ok: true, borrower_id: borrowerId, deleted_loans: loanIds.length }, { status: 200 })
}

