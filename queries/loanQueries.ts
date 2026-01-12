import axios from "axios"
import type { QueryClient, UseMutationOptions } from "@tanstack/react-query"

export type CreateLoanInput = {
  borrower: {
    name: string
    phone?: string
    relationship_type?: string
    notes?: string
  }
  loan: {
    principal_amount: number
    interest_percentage: number
    interest_due_day: number
    loan_start_date: string
    return_months?: number | null
    status?: string
  }
}

async function createLoan(payload: CreateLoanInput) {
  const { data } = await axios.post("/api/loans", payload)
  return data
}

export function createLoanMutation(
  queryClient: QueryClient
): UseMutationOptions<unknown, unknown, CreateLoanInput> {
  return {
    mutationKey: ["loans", "create"],
    mutationFn: (payload) => createLoan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans", "list"] })
      queryClient.invalidateQueries({ queryKey: ["borrowers", "list"] })
    },
  }
}
