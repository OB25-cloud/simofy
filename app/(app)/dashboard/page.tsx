import { createServerSupabase } from '@/lib/supabaseServer'
import Link from 'next/link'
import type { Lead } from '@/lib/types'
import AiSearchBar from '@/app/components/AiSearchBar'

export const dynamic = 'force-dynamic'

// ─── types ──────────────────────────────────────────────────────────────────

type DashJob = {
  id: string
  title: string | null
  job_type: string | null
  status: string | null
  created_at: string | null
  clients: { name: string } | null
  staff: { name: string } | null
}

type OverdueInvoice = {
  id: string
  total: number | null
  due_date: string | null
  clients: { name: string } | null
}

// ─── status helpers ──────────────────────────────────────────────────────────

const JOB_STATUS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Pending'     },
  scheduled:   { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Scheduled'   },
  in_progress: { bg: '#fdf8ee', text: '#B8922A', dot: '#B8922A', label: 'In Progress' },
  complete:    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Complete'     },
  invoiced:    { bg: '#faf5ff', text: '#7c3aed', dot: '#8b5cf6', label: 'Invoiced'    },
  cancelled:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Cancelled'   },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const c = JOB_STATUS[status] ?? JOB_STATUS.pending
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent, danger,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  danger?: boolean
}) {
  const valueColor = danger ? '#dc2626' : accent ? '#B8922A' : '#111827'
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</p>
      <p className="text-3xl font-bold tabular-nums leading-none" style={{ color: valueColor }}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ─── AI Insights card ────────────────────────────────────────────────────────

type Insight = { icon: React.ReactNode; text: string; positive?: boolean; negative?: boolean }

function InsightIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md" style={{ background: 'rgba(184,146,42,0.15)' }}>
      {children}
    </span>
  )
}

function AiInsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <div className="rounded-xl mb-6 overflow-hidden" style={{ background: '#111' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: 'rgba(184,146,42,0.2)' }}>
        <span style={{ color: '#B8922A', fontSize: '16px', lineHeight: 1 }}>✦</span>
        <span className="text-sm font-semibold tracking-wide" style={{ color: '#B8922A' }}>
          AI Insights
        </span>
        <span className="ml-auto text-xs" style={{ color: 'rgba(184,146,42,0.45)' }}>
          refreshed now
        </span>
      </div>

      {/* Insights list */}
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {insights.map((insight, i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 px-5 py-3.5"
            style={{ borderLeft: '3px solid rgba(184,146,42,0.5)' }}
          >
            <InsightIcon>{insight.icon}</InsightIcon>
            <p
              className="text-sm leading-snug"
              style={{
                color: insight.negative ? '#f87171' : insight.positive ? '#86efac' : '#B8922A',
              }}
            >
              {insight.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createServerSupabase()

  const today = new Date()
  const todayStr     = today.toISOString().split('T')[0]
  const tomorrow     = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr  = tomorrow.toISOString().split('T')[0]
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const startOfMonthDate = startOfMonth.split('T')[0]

  // Last month date range
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString()
  const lastMonthEnd   = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  // Start of this week (Monday)
  const dayOfWeek    = today.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart    = new Date(today)
  weekStart.setDate(today.getDate() - daysToMonday)
  const startOfWeekStr = weekStart.toISOString().split('T')[0]

  // ── Wave 1: all parallel queries ─────────────────────────────────────────────
  const [
    { count: activeClientsCount },
    { data: rawJobsToday },
    { count: inProgressCount },
    { data: outstandingInvoices },
    { count: overdueCount },
    { data: rawRecentJobs },
    { data: rawLeads },
    { data: rawAllJobs },
    { data: rawOverdueInvoices },
    { data: paidThisMonth },
    { data: paidLastMonth },
    { data: staffJobsThisWeek },
    { data: quotesThisMonth },
    { data: completedJobsThisMonth },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('jobs').select('id, title, job_type, status, created_at, clients(name), staff(name)')
      .gte('scheduled_date', todayStr).lt('scheduled_date', tomorrowStr).order('scheduled_date'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('invoices').select('total').in('status', ['sent', 'overdue']),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabase.from('jobs').select('id, title, job_type, status, created_at, clients(name)')
      .order('created_at', { ascending: false }).limit(6),
    supabase.from('leads').select('*').eq('status', 'new').order('created_at', { ascending: false }),
    supabase.from('jobs').select('status'),
    supabase.from('invoices').select('id, total, due_date, clients(name)')
      .eq('status', 'overdue').order('due_date', { ascending: true }).limit(8),
    supabase.from('invoices').select('total').eq('status', 'paid').gte('created_at', startOfMonth),
    // Insights: last month revenue
    supabase.from('invoices').select('total').eq('status', 'paid')
      .gte('created_at', lastMonthStart).lt('created_at', lastMonthEnd),
    // Insights: staff jobs completed this week
    supabase.from('jobs').select('staff(name)').eq('status', 'complete')
      .gte('completed_date', startOfWeekStr),
    // Insights: quote totals this month grouped by job type
    supabase.from('quotes').select('total, jobs(job_type)').gte('created_at', startOfMonth)
      .not('total', 'is', null),
    // Insights: completed jobs this month (for margin calc)
    supabase.from('jobs').select('id, staff(pay_rate)').eq('status', 'complete')
      .gte('completed_date', startOfMonthDate),
  ])

  // ── Wave 2: margin sub-queries (need completed job IDs first) ────────────────
  const completedIds = (completedJobsThisMonth ?? []).map((j: { id: string }) => j.id)

  const [{ data: completedMaterials }, { data: completedQuotes }] = await Promise.all([
    completedIds.length > 0
      ? supabase.from('job_materials').select('job_id, quantity, unit_cost').in('job_id', completedIds)
      : Promise.resolve({ data: [] as { job_id: string; quantity: number; unit_cost: number }[], error: null }),
    completedIds.length > 0
      ? supabase.from('quotes').select('job_id, total').in('job_id', completedIds).not('total', 'is', null)
      : Promise.resolve({ data: [] as { job_id: string; total: number }[], error: null }),
  ])

  // ── Derived values ────────────────────────────────────────────────────────────
  const jobsToday       = (rawJobsToday         ?? []) as unknown as DashJob[]
  const recentJobs      = (rawRecentJobs         ?? []) as unknown as DashJob[]
  const leads           = (rawLeads             ?? []) as unknown as Lead[]
  const allJobs         = (rawAllJobs           ?? []) as { status: string | null }[]
  const overdueInvoices = (rawOverdueInvoices   ?? []) as unknown as OverdueInvoice[]

  const outstandingVal    = (outstandingInvoices ?? []).reduce((s, inv: { total: number | null }) => s + (inv.total ?? 0), 0)
  const revenueThisMonth  = (paidThisMonth       ?? []).reduce((s, inv: { total: number | null }) => s + (inv.total ?? 0), 0)
  const revenueLastMonth  = (paidLastMonth       ?? []).reduce((s, inv: { total: number | null }) => s + (inv.total ?? 0), 0)

  const jobsByStatus = Object.entries(
    allJobs.reduce((acc: Record<string, number>, j) => {
      const s = j.status ?? 'pending'
      acc[s] = (acc[s] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  function fmtMoney(n: number) {
    if (n >= 100_000) return `$${(n / 1000).toFixed(0)}k`
    if (n >= 10_000)  return `$${(n / 1000).toFixed(1)}k`
    return `$${n.toFixed(0)}`
  }

  const dateLabel = today.toLocaleDateString('en-NZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // ── Compute insights ──────────────────────────────────────────────────────────

  // 1. Overdue invoices
  const overdueTotal = overdueInvoices.reduce((s, inv) => s + (inv.total ?? 0), 0)

  // 2. Most profitable job type this month (by sum of quote totals)
  const byJobType: Record<string, number> = {}
  for (const q of (quotesThisMonth ?? []) as unknown as { total: number | null; jobs: { job_type: string | null } | null }[]) {
    const type = q.jobs?.job_type ?? 'General'
    byJobType[type] = (byJobType[type] ?? 0) + (q.total ?? 0)
  }
  const topJobType = Object.entries(byJobType).sort((a, b) => b[1] - a[1])[0] ?? null

  // 3. Top staff performer this week
  const staffCount: Record<string, number> = {}
  for (const j of (staffJobsThisWeek ?? []) as unknown as { staff: { name: string } | null }[]) {
    const name = j.staff?.name
    if (name) staffCount[name] = (staffCount[name] ?? 0) + 1
  }
  const topStaff = Object.entries(staffCount).sort((a, b) => b[1] - a[1])[0] ?? null

  // 4. Revenue change this month vs last
  const revPct = revenueLastMonth > 0
    ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
    : null

  // 5. New leads — already have leads.length

  // 6. Average profit margin on completed jobs this month
  const matsByJob: Record<string, number> = {}
  for (const m of (completedMaterials ?? []) as { job_id: string; quantity: number; unit_cost: number }[]) {
    matsByJob[m.job_id] = (matsByJob[m.job_id] ?? 0) + m.quantity * m.unit_cost
  }
  const quoteTotalByJob: Record<string, number> = {}
  for (const q of (completedQuotes ?? []) as { job_id: string; total: number }[]) {
    quoteTotalByJob[q.job_id] = q.total
  }
  const margins: number[] = []
  for (const job of (completedJobsThisMonth ?? []) as unknown as { id: string; staff: { pay_rate: number | null } | null }[]) {
    const qt = quoteTotalByJob[job.id]
    if (qt == null || qt === 0) continue
    const matCost    = matsByJob[job.id] ?? 0
    const labourCost = (job.staff?.pay_rate ?? 0) * 2
    const margin     = ((qt - matCost - labourCost) / qt) * 100
    margins.push(margin)
  }
  const avgMargin = margins.length > 0
    ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length)
    : null

  // ── Build insight list ────────────────────────────────────────────────────────

  const AlertIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
  const TrendIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  )
  const StarIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
  const RevenueIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  )
  const BellIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
  const PctIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  )

  const insights: Insight[] = []

  // 1. Overdue
  if ((overdueCount ?? 0) === 0) {
    insights.push({ icon: AlertIcon, text: 'No overdue invoices — all accounts clear.', positive: true })
  } else {
    insights.push({
      icon: AlertIcon,
      text: `${overdueCount} overdue invoice${(overdueCount ?? 0) > 1 ? 's' : ''} totalling ${fmtMoney(overdueTotal)} — follow up today.`,
      negative: true,
    })
  }

  // 2. Top job type
  if (topJobType) {
    insights.push({
      icon: TrendIcon,
      text: `${topJobType[0]} is your top earner this month — ${fmtMoney(topJobType[1])} in quotes.`,
    })
  } else {
    insights.push({ icon: TrendIcon, text: 'No quotes raised this month yet — time to send some.' })
  }

  // 3. Top staff
  if (topStaff) {
    insights.push({
      icon: StarIcon,
      text: `${topStaff[0]} completed ${topStaff[1]} job${topStaff[1] > 1 ? 's' : ''} this week — leading the team.`,
      positive: true,
    })
  } else {
    insights.push({ icon: StarIcon, text: 'No jobs completed by staff this week yet.' })
  }

  // 4. Revenue vs last month
  if (revPct !== null) {
    const dir = revPct >= 0 ? 'up' : 'down'
    insights.push({
      icon: RevenueIcon,
      text: `Revenue ${dir} ${Math.abs(revPct)}% vs last month (${fmtMoney(revenueLastMonth)} → ${fmtMoney(revenueThisMonth)}).`,
      positive: revPct >= 0,
      negative: revPct < 0,
    })
  } else if (revenueThisMonth > 0) {
    insights.push({
      icon: RevenueIcon,
      text: `${fmtMoney(revenueThisMonth)} collected this month — first month of tracked revenue.`,
      positive: true,
    })
  } else {
    insights.push({ icon: RevenueIcon, text: 'No revenue recorded this month yet.' })
  }

  // 5. New leads
  if (leads.length === 0) {
    insights.push({ icon: BellIcon, text: 'All new leads have been followed up — inbox clear.', positive: true })
  } else {
    insights.push({
      icon: BellIcon,
      text: `${leads.length} new lead${leads.length > 1 ? 's' : ''} waiting for follow-up — don't let them go cold.`,
      negative: leads.length > 2,
    })
  }

  // 6. Avg margin
  if (avgMargin !== null) {
    insights.push({
      icon: PctIcon,
      text: `Avg. ${avgMargin}% profit margin across completed jobs this month${avgMargin < 20 ? ' — margins are tight, review costs.' : '.'}`,
      positive: avgMargin >= 30,
      negative: avgMargin < 10,
    })
  } else {
    insights.push({
      icon: PctIcon,
      text: 'Add quotes and materials to completed jobs to track profit margins.',
    })
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-400">{dateLabel}</p>
      </div>

      {/* AI Search */}
      <AiSearchBar />

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Active Clients"   value={String(activeClientsCount ?? 0)} accent />
        <StatCard label="Jobs Today"       value={String(jobsToday.length)}         accent sub={`${jobsToday.length} scheduled`} />
        <StatCard label="In Progress"      value={String(inProgressCount ?? 0)}    accent />
        <StatCard label="Outstanding"      value={fmtMoney(outstandingVal)}         accent sub="sent + overdue" />
        <StatCard label="Overdue Invoices" value={String(overdueCount ?? 0)}        danger={(overdueCount ?? 0) > 0} sub={(overdueCount ?? 0) > 0 ? 'requires attention' : 'all clear'} />
      </div>

      {/* AI Insights */}
      <div style={{ background: '#111' }}>
        <AiInsightsCard insights={insights} />
      </div>

      {/* Revenue + Jobs by Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5">

        {/* Revenue summary */}
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue Summary</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Paid This Month</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: '#B8922A' }}>
                {fmtMoney(revenueThisMonth)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Outstanding</p>
              <p className="text-2xl font-bold tabular-nums text-gray-900">
                {fmtMoney(outstandingVal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Overdue</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: (overdueCount ?? 0) > 0 ? '#dc2626' : '#111827' }}>
                {String(overdueCount ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Active Clients</p>
              <p className="text-2xl font-bold tabular-nums text-gray-900">
                {String(activeClientsCount ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Jobs by status */}
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jobs by Status</p>
            <span className="text-xs text-gray-400">{allJobs.length} total</span>
          </div>
          {jobsByStatus.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-300">No jobs yet</p>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              {jobsByStatus.map(([status, count]) => {
                const cfg = JOB_STATUS[status] ?? JOB_STATUS.pending
                const pct = allJobs.length > 0 ? Math.round((count / allJobs.length) * 100) : 0
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                        <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                        {cfg.label}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-gray-700">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: cfg.dot }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Jobs Today + Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5">

        {/* Jobs Today */}
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jobs Today</p>
            <span className="text-xs text-gray-400">{jobsToday.length} {jobsToday.length === 1 ? 'job' : 'jobs'}</span>
          </div>
          {jobsToday.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-300">No jobs scheduled for today</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {jobsToday.map(job => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#B8922A] transition-colors">
                      {job.title ?? job.job_type ?? 'Untitled'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {job.clients?.name ?? '—'}
                      {job.staff?.name ? <span> · {job.staff.name}</span> : null}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Jobs */}
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Jobs</p>
            <Link href="/jobs" className="text-xs font-medium hover:opacity-70 transition-opacity" style={{ color: '#B8922A' }}>
              View all →
            </Link>
          </div>
          {recentJobs.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-300">No jobs yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentJobs.map(job => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#B8922A] transition-colors">
                      {job.title ?? job.job_type ?? 'Untitled'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {job.clients?.name ?? '—'}
                      {job.created_at && (
                        <span> · {new Date(job.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</span>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Invoices */}
      {overdueInvoices.length > 0 && (
        <div className="rounded-lg border border-red-100 overflow-x-auto mb-5">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-red-100" style={{ background: '#fef2f2' }}>
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#dc2626' }}>Overdue Invoices</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: '#dc2626' }}>
                {overdueCount}
              </span>
            </div>
            <Link href="/invoices" className="text-xs font-medium hover:opacity-70 transition-opacity" style={{ color: '#dc2626' }}>
              View all →
            </Link>
          </div>
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Invoice</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Client</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Amount</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Due Date</th>
                <th className="px-5 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {overdueInvoices.map((inv, i) => (
                <tr
                  key={inv.id}
                  className="hover:bg-gray-50 transition-colors"
                  style={{ borderTop: i === 0 ? undefined : '1px solid #f9fafb' }}
                >
                  <td className="px-5 py-3 font-mono text-xs font-medium text-gray-700">
                    INV-{inv.id.slice(0, 6).toUpperCase()}
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {inv.clients?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 font-medium tabular-nums" style={{ color: '#dc2626' }}>
                    {inv.total != null ? `$${inv.total.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {inv.due_date
                      ? new Date(inv.due_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/invoices/${inv.id}`} className="text-gray-300 hover:text-[#dc2626] transition-colors text-base">→</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Leads */}
      <div className="rounded-lg border border-gray-100 overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100" style={{ minWidth: '480px' }}>
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Leads</p>
            {leads.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: '#B8922A' }}>
                {leads.length}
              </span>
            )}
          </div>
          <Link href="/leads" className="text-xs font-medium hover:opacity-70 transition-opacity" style={{ color: '#B8922A' }}>
            View all →
          </Link>
        </div>
        {leads.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-300">No new uncontacted leads</p>
          </div>
        ) : (
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Name</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Email</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Phone</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Source</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Received</th>
                <th className="px-5 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50 transition-colors"
                  style={{ borderTop: i === 0 ? undefined : '1px solid #f9fafb' }}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {lead.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {lead.email ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {lead.phone ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {lead.source ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(lead.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/leads/${lead.id}`} className="text-gray-300 hover:text-[#B8922A] transition-colors text-base">→</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
