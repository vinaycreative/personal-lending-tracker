import { supabase } from "@/lib/supabase/client"

type CreateBorrowerRequest = {
  name?: string
  phone?: string | null
  relationship_type?: string | null
  notes?: string | null
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateBorrowerRequest
  const name = body.name?.trim()

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("borrowers")
    .insert({
      name,
      phone: body.phone ?? null,
      relationship_type: body.relationship_type ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ borrower: data }, { status: 201 })
}
