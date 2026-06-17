import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseServer'
import { paginateAll } from '@/lib/supabasePaginate'
import { matchTownName } from '@/lib/townMatch'
import ReportsTabs from '@/app/components/reports/ReportsTabs'

// Report data is expensive to compute (paginated jobs/invoices/quotes/
// materials across a 12-month window) and doesn't need to be second-fresh —
// cache it for 5 minutes instead of recomputing on every page view. Auth
// still runs fresh every request (see the two Supabase clients below);
// force-dynamic would override this and force every fetch to no-store, so
// it's deliberately not set here.
export const revalidate = 300

// ─── row shapes for this page's queries ───────────────────────────────────────

type ReportJob = {
  id: string
  job_type: string | null
  status: string | null
  scheduled_date: string | null
  completed_date: string | null
  location: string | null
  staff_id: string | null
  staff: { name: string; pay_rate: number | null } | null
  sites: { address: string | null } | null
}
type ReportInvoice = {
  id: string
  job_id: string | null
  status: string | null
  total: number | null
  paid_date: string | null
  created_at: string
}
type ReportQuote = {
  id: string
  job_id: string | null
  total: number | null
}
type ReportMaterial = {
  job_id: string
  quantity: number
  unit_cost: number
}
type ReportStaffRow = {
  id: string
  name: string
  pay_rate: number | null
  is_active: boolean
}

const COMPLETE_STATUSES = ['complete', 'invoiced']

function monthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`
}

export default async function ReportsPage() {
  // Auth must always be checked against a live session — never cached.
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') redirect('/dashboard')

  // Separate client for the actual report data — this one caches for 5
  // minutes (see createServerSupabase) so repeat visits don't re-run the
  // full paginated fetch + aggregation on every load.
  const reportSupabase = await createServerSupabase(revalidate)

  const now = new Date()
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
  const windowStartDate = windowStart.toISOString().split('T')[0]
  const windowStartISO = windowStart.toISOString()

  const [jobs, invoices, quotes, materials, { data: staffRows }] = await Promise.all([
    paginateAll<ReportJob>((from, to) =>
      reportSupabase
        .from('jobs')
        .select('id, job_type, status, scheduled_date, completed_date, location, staff_id, staff(name, pay_rate), sites(address)')
        .gte('scheduled_date', windowStartDate)
        .range(from, to) as unknown as PromiseLike<{ data: ReportJob[] | null; error: { message: string } | null }>
    ),
    paginateAll<ReportInvoice>((from, to) =>
      reportSupabase
        .from('invoices')
        .select('id, job_id, status, total, paid_date, created_at')
        .gte('created_at', windowStartISO)
        .range(from, to)
    ),
    paginateAll<ReportQuote>((from, to) =>
      reportSupabase.from('quotes').select('id, job_id, total').gte('created_at', windowStartISO).range(from, to)
    ),
    paginateAll<ReportMaterial>((from, to) =>
      reportSupabase.from('job_materials').select('job_id, quantity, unit_cost').gte('created_at', windowStartISO).range(from, to)
    ),
    reportSupabase.from('staff').select('id, name, pay_rate, is_active'),
  ])

  const staffList = (staffRows ?? []) as ReportStaffRow[]
  const jobsById = new Map(jobs.map(j => [j.id, j]))

  const monthBuckets = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1))
    return { key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: d.toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }) }
  })

  // ── Revenue ────────────────────────────────────────────────────────────────

  const paidInvoices = invoices.filter(i => i.status === 'paid' && i.paid_date)

  const revByMonth = new Map(monthBuckets.map(b => [b.key, 0]))
  for (const inv of paidInvoices) {
    const key = monthKey(inv.paid_date as string)
    if (revByMonth.has(key)) revByMonth.set(key, (revByMonth.get(key) ?? 0) + (inv.total ?? 0))
  }
  const revenueByMonth = monthBuckets.map(b => ({ month: b.label, revenue: Math.round(revByMonth.get(b.key) ?? 0) }))

  const revByJobType = new Map<string, number>()
  const revByLocation = new Map<string, number>()
  for (const inv of paidInvoices) {
    if (!inv.job_id) continue
    const job = jobsById.get(inv.job_id)
    if (!job) continue
    const jt = job.job_type ?? 'Other'
    revByJobType.set(jt, (revByJobType.get(jt) ?? 0) + (inv.total ?? 0))
    const town = matchTownName(job.location) ?? matchTownName(job.sites?.address ?? null) ?? 'Other'
    revByLocation.set(town, (revByLocation.get(town) ?? 0) + (inv.total ?? 0))
  }
  const revenueByJobType = [...revByJobType.entries()]
    .map(([jobType, revenue]) => ({ jobType, revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
  const revenueByLocation = [...revByLocation.entries()]
    .map(([location, revenue]) => ({ location, revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = Math.round(paidInvoices.reduce((s, i) => s + (i.total ?? 0), 0))

  // ── Jobs ───────────────────────────────────────────────────────────────────

  const totalJobs = jobs.length
  const completedJobs = jobs.filter(j => COMPLETE_STATUSES.includes(j.status ?? '')).length
  const cancelledJobs = jobs.filter(j => j.status === 'cancelled').length
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
  const avgJobsPerWeek = Math.round((totalJobs / 52) * 10) / 10

  const statusCounts = new Map<string, number>()
  for (const j of jobs) {
    const s = j.status ?? 'pending'
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1)
  }
  const jobsByStatus = [...statusCounts.entries()].map(([status, count]) => ({ status, count }))

  const completedByMonthMap = new Map(monthBuckets.map(b => [b.key, 0]))
  for (const j of jobs) {
    if (!COMPLETE_STATUSES.includes(j.status ?? '') || !j.completed_date) continue
    const key = monthKey(j.completed_date)
    if (completedByMonthMap.has(key)) completedByMonthMap.set(key, (completedByMonthMap.get(key) ?? 0) + 1)
  }
  const jobsCompletedByMonth = monthBuckets.map(b => ({ month: b.label, count: completedByMonthMap.get(b.key) ?? 0 }))

  // ── Staff performance ─────────────────────────────────────────────────────

  const revenueByJobId = new Map<string, number>()
  for (const inv of paidInvoices) {
    if (!inv.job_id) continue
    revenueByJobId.set(inv.job_id, (revenueByJobId.get(inv.job_id) ?? 0) + (inv.total ?? 0))
  }

  const staffPerformance = staffList
    .filter(s => s.is_active)
    .map(member => {
      const staffJobs = jobs.filter(j => j.staff_id === member.id)
      const staffCompleted = staffJobs.filter(j => COMPLETE_STATUSES.includes(j.status ?? ''))
      const revenue = staffCompleted.reduce((s, j) => s + (revenueByJobId.get(j.id) ?? 0), 0)
      return {
        name: member.name,
        jobsAssigned: staffJobs.length,
        jobsCompleted: staffCompleted.length,
        revenue: Math.round(revenue),
        avgJobValue: staffCompleted.length > 0 ? Math.round(revenue / staffCompleted.length) : 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  // ── Profitability ─────────────────────────────────────────────────────────
  // Margin formula matches the one already used on the dashboard and the job
  // detail "Job Cost Summary": (quote total - materials cost - labour cost) /
  // quote total, with labour estimated as pay_rate * 2 hrs (there's no actual
  // time-tracking field in the schema, so this is the app's existing convention).

  const quoteTotalByJobId = new Map<string, number>()
  for (const q of quotes) {
    if (q.job_id && q.total != null) quoteTotalByJobId.set(q.job_id, q.total)
  }
  const materialsCostByJobId = new Map<string, number>()
  for (const m of materials) {
    materialsCostByJobId.set(m.job_id, (materialsCostByJobId.get(m.job_id) ?? 0) + m.quantity * m.unit_cost)
  }

  function jobMargin(job: ReportJob): number | null {
    const quoteTotal = quoteTotalByJobId.get(job.id)
    if (quoteTotal == null || quoteTotal === 0) return null
    const materialsCost = materialsCostByJobId.get(job.id) ?? 0
    const labourCost = (job.staff?.pay_rate ?? 0) * 2
    return ((quoteTotal - materialsCost - labourCost) / quoteTotal) * 100
  }

  const marginableJobs = jobs.filter(j => COMPLETE_STATUSES.includes(j.status ?? ''))
  const allMargins = marginableJobs.map(jobMargin).filter((m): m is number => m != null)
  const avgMarginOverall = allMargins.length > 0 ? Math.round(allMargins.reduce((a, b) => a + b, 0) / allMargins.length) : null

  const marginByMonthArr = new Map<string, number[]>(monthBuckets.map(b => [b.key, []]))
  for (const j of marginableJobs) {
    if (!j.completed_date) continue
    const key = monthKey(j.completed_date)
    const bucket = marginByMonthArr.get(key)
    if (!bucket) continue
    const margin = jobMargin(j)
    if (margin != null) bucket.push(margin)
  }
  const marginByMonth = monthBuckets.map(b => {
    const arr = marginByMonthArr.get(b.key) ?? []
    return { month: b.label, margin: arr.length > 0 ? Math.round(arr.reduce((a, c) => a + c, 0) / arr.length) : 0 }
  })

  const marginByJobTypeArr = new Map<string, number[]>()
  for (const j of marginableJobs) {
    const margin = jobMargin(j)
    if (margin == null) continue
    const jt = j.job_type ?? 'Other'
    if (!marginByJobTypeArr.has(jt)) marginByJobTypeArr.set(jt, [])
    marginByJobTypeArr.get(jt)!.push(margin)
  }
  const marginByJobType = [...marginByJobTypeArr.entries()]
    .map(([jobType, arr]) => ({ jobType, margin: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) }))
    .sort((a, b) => b.margin - a.margin)

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#B8922A' }}>Finance</p>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {windowStart.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })} – {now.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <ReportsTabs
        revenue={{ byMonth: revenueByMonth, byJobType: revenueByJobType, byLocation: revenueByLocation, total: totalRevenue }}
        jobsStats={{
          total: totalJobs,
          completed: completedJobs,
          cancelled: cancelledJobs,
          completionRate,
          avgPerWeek: avgJobsPerWeek,
          byStatus: jobsByStatus,
          completedByMonth: jobsCompletedByMonth,
        }}
        staffPerformance={staffPerformance}
        profitability={{ avgMargin: avgMarginOverall, byMonth: marginByMonth, byJobType: marginByJobType }}
      />
    </div>
  )
}
