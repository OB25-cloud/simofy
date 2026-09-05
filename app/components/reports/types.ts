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
  /** Staff id — drives the avatar/bar colour so it matches the scheduler. */
  id?: string
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
