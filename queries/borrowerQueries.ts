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

export type UpdateBorrowerInput = {
  borrowerId: string
  name?: string
  phone?: string | null
  relationship_type?: string | null
  notes?: string | null
}

async function updateBorrower({ borrowerId, ...payload }: UpdateBorrowerInput) {
  const { data } = await axios.put(`/api/borrowers/${borrowerId}`, payload)
  return data.borrower
}

async function deleteBorrower(borrowerId: string) {
  const { data } = await axios.delete(`/api/borrowers/${borrowerId}`)
  return data
}

export function updateBorrowerMutation(queryClient: QueryClient) {
  return {
    mutationKey: ["borrowers", "update"],
    mutationFn: updateBorrower,
    onSuccess: (_data: unknown, variables: UpdateBorrowerInput) => {
      queryClient.invalidateQueries({ queryKey: ["borrowers", "list"] })
      queryClient.invalidateQueries({ queryKey: ["loans", "list"] })
      queryClient.invalidateQueries({ queryKey: ["loans", "detail"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["borrowers", "detail", variables.borrowerId] })
    },
  }
}

export function deleteBorrowerMutation(queryClient: QueryClient) {
  return {
    mutationKey: ["borrowers", "delete"],
    mutationFn: ({ borrowerId }: { borrowerId: string }) => deleteBorrower(borrowerId),
    onSuccess: (_data: unknown, variables: { borrowerId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["borrowers", "list"] })
      queryClient.invalidateQueries({ queryKey: ["loans", "list"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["borrowers", "detail", variables.borrowerId] })
    },
  }
}
