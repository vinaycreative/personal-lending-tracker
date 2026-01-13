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

export type PaymentStatus = "due" | "overdue" | "paid"
export type LoanStatus = "active" | "closed" | string

export type LoanListItem = {
  id: string
  borrower_id: string
  borrower_name: string
  borrower_phone: string | null
  relationship_type: string | null
  principal_amount: number
  monthly_interest_amount: number
  interest_due_day: number
  loan_start_date: string
  return_months: number | null
  loan_status: LoanStatus
  next_due_date: string // ISO date
  payment_status: PaymentStatus
  last_paid_at: string | null // ISO timestamp
}

export type ListLoansResponse = { loans: LoanListItem[] }

async function createLoan(payload: CreateLoanInput) {
  const { data } = await axios.post("/api/loans", payload)
  return data
}

async function listLoans() {
  const { data } = await axios.get<ListLoansResponse>("/api/loans")
  return data.loans
}

export function loansListQuery() {
  return {
    queryKey: ["loans", "list"] as const,
    queryFn: listLoans,
  }
}

export type LoanDetailResponse = {
  loan: {
    id: string
    borrower_id: string
    principal_amount: number
    interest_percentage: number
    monthly_interest_amount: number
    interest_due_day: number
    loan_start_date: string
    return_months: number | null
    status: string
    closed_at: string | null
    created_at: string | null
  }
  borrower: {
    id: string
    name: string
    phone: string | null
    relationship_type: string | null
    notes: string | null
    created_at: string | null
  } | null
  interest_paid_total: number
  monthly_interest_payments: {
    id: string
    loan_id: string
    month_year: string
    due_date: string
    amount: number
    status: string
    paid_at: string | null
    created_at: string | null
  }[]
  principal_payments: {
    id: string
    loan_id: string
    amount: number
    paid_at: string
    notes: string | null
    created_at: string | null
  }[]
}

export type UpdateLoanInput = {
  loanId: string
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

type UpdateLoanResponse = Pick<LoanDetailResponse, "loan" | "borrower">

async function getLoanDetail(loanId: string) {
  const { data } = await axios.get<LoanDetailResponse>(`/api/loans/${loanId}`)
  return data
}

export function loanDetailQuery(loanId: string) {
  return {
    queryKey: ["loans", "detail", loanId] as const,
    queryFn: () => getLoanDetail(loanId),
    enabled: Boolean(loanId),
  }
}

async function updateLoan(payload: UpdateLoanInput) {
  const { loanId, ...body } = payload
  const { data } = await axios.put<UpdateLoanResponse>(`/api/loans/${loanId}`, body)
  return data
}

async function deleteLoan(loanId: string) {
  const { data } = await axios.delete<{ ok: true; loan_id: string; borrower_deleted: boolean }>(
    `/api/loans/${loanId}`
  )
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

export function updateLoanMutation(
  queryClient: QueryClient
): UseMutationOptions<unknown, unknown, UpdateLoanInput> {
  return {
    mutationKey: ["loans", "update"],
    mutationFn: updateLoan,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loans", "list"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["loans", "detail", variables.loanId] })
    },
  }
}

export function deleteLoanMutation(
  queryClient: QueryClient
): UseMutationOptions<unknown, unknown, { loanId: string }> {
  return {
    mutationKey: ["loans", "delete"],
    mutationFn: ({ loanId }) => deleteLoan(loanId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loans", "list"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["loans", "detail", variables.loanId] })
    },
  }
}

type CollectMonthlyInterestInput = {
  loanId: string
  asOf?: string // ISO date-only (YYYY-MM-DD)
}

async function collectMonthlyInterest({ loanId, asOf }: CollectMonthlyInterestInput) {
  const { data } = await axios.post(
    `/api/loans/${loanId}/collect-interest`,
    asOf ? { as_of: asOf } : {}
  )
  return data
}

export function collectMonthlyInterestMutation(
  queryClient: QueryClient
): UseMutationOptions<unknown, unknown, CollectMonthlyInterestInput> {
  return {
    mutationKey: ["loans", "collect-monthly-interest"],
    mutationFn: collectMonthlyInterest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["loans", "list"] })
      queryClient.invalidateQueries({ queryKey: ["loans", "detail"] })
    },
  }
}
