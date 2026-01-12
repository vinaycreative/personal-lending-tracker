import axios from "axios"
import { QueryClient } from "@tanstack/react-query"

type CreateBorrowerInput = {
  name: string
  phone?: string
  relationship_type?: string
  notes?: string
}

type CreateBorrowerResponse = {
  borrower: {
    id: string
    name: string
    phone: string | null
    relationship_type: string | null
    notes: string | null
    created_at: string | null
  }
}

async function createBorrower(payload: CreateBorrowerInput) {
  const { data } = await axios.post<CreateBorrowerResponse>("/api/borrowers", payload)
  return data.borrower
}

export function createBorrowerMutation(queryClient: QueryClient) {
  return {
    mutationKey: ["borrowers", "create"],
    mutationFn: createBorrower,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrowers", "list"] })
    },
  }
}
