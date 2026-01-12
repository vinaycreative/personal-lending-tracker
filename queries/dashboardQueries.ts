import axios from "axios"

export type DashboardPaymentStatus = "due" | "overdue" | "paid"

export type DashboardLoanListItem = {
  id: string
  borrower_id: string
  borrower_name: string
  borrower_phone: string | null
  relationship_type: string | null
  principal_amount: number
  monthly_interest_amount: number
  loan_status: string
  next_due_date: string // ISO date (YYYY-MM-DD)
  payment_status: DashboardPaymentStatus
}

export type DashboardResponse = {
  as_of_date: string // ISO date
  totals: {
    total_principal: number
    total_monthly_interest: number
  }
  collection_focus: {
    need_to_collect: number
    interest_due_today: number
    overdue_interest: number
    due_today_count: number
    overdue_count: number
  }
  todays_due: DashboardLoanListItem[]
}

async function getDashboard(asOf?: string) {
  const { data } = await axios.get<DashboardResponse>("/api/dashboard", {
    params: asOf ? { asOf } : undefined,
  })
  return data
}

export function dashboardQuery(asOf?: string) {
  return {
    queryKey: ["dashboard", { asOf: asOf ?? null }] as const,
    queryFn: () => getDashboard(asOf),
  }
}

