export type RevenueData = {
  byMonth: { month: string; revenue: number }[]
  byJobType: { jobType: string; revenue: number }[]
  byLocation: { location: string; revenue: number }[]
  total: number
}

export type JobsStatsData = {
  total: number
  completed: number
  cancelled: number
  completionRate: number
  avgPerWeek: number
  byStatus: { status: string; count: number }[]
  completedByMonth: { month: string; count: number }[]
}

export type StaffPerfRow = {
  name: string
  jobsAssigned: number
  jobsCompleted: number
  revenue: number
  avgJobValue: number
}

export type ProfitabilityData = {
  avgMargin: number | null
  byMonth: { month: string; margin: number }[]
  byJobType: { jobType: string; margin: number }[]
}
