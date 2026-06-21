import { createServerSupabase } from '@/lib/supabaseServer'
import { paginateAll } from '@/lib/supabasePaginate'
import Link from 'next/link'
import type { Lead } from '@/lib/types'
import AiSearchBar from '@/app/components/AiSearchBar'
import AiInsightsCard, { type Insight } from './AiInsightsCard'
import RevenueTrendChart from './RevenueTrendChart'

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
      className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

// ─── stat card icons ─────────────────────────────────────────────────────────

function IconRevenue() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
}
function IconClients() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconJobs() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
}
function IconProgress() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function IconOutstanding() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
}
function IconAlert() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}
function IconJobValue() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M14.8 9a2.5 2.5 0 00-2.3-1.5h-1a2.5 2.5 0 000 5h1a2.5 2.5 0 010 5h-1A2.5 2.5 0 019.2 15"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
}
function IconConversion() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M3 16v5h5"/><path d="M21 16v5h-5"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
}
function IconQuotesPipe() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
}

// ─── pipeline ───────────────────────────────────────────────────────────────

function PipelineStage({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div
      className="flex-1 min-w-[140px] rounded-xl px-5 py-4"
      style={{ background: '#111', boxShadow: '0 0 0 1px rgba(184,146,42,0.15)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(184,146,42,0.7)' }}>
          {label}
        </span>
        <span style={{ color: 'rgba(184,146,42,0.5)' }}>{icon}</span>
      </div>
      <p className="text-3xl font-bold tabular-nums leading-none" style={{ color: '#B8922A' }}>{value}</p>
    </div>
  )
}

function PipelineArrow() {
  return (
    <div className="hidden sm:flex items-center shrink-0 px-1" style={{ color: 'rgba(184,146,42,0.35)' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
      </svg>
    </div>
  )
}

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, trend, accentValue, danger,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  trend?: number | null
  accentValue?: boolean
  danger?: boolean
}) {
  const valueColor = danger ? '#dc2626' : accentValue ? '#B8922A' : '#111827'
  const iconBg     = danger ? '#fef2f2' : 'rgba(184,146,42,0.08)'
  const iconColor  = danger ? '#dc2626' : '#B8922A'
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        {trend != null && (
          <span
            className="text-[10px] font-bold leading-none flex items-center gap-0.5"
            style={{ color: trend >= 0 ? '#16a34a' : '#dc2626' }}
          >
            {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: valueColor }}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

type PaidInvoiceRow = { total: number | null; paid_date: string | null }

// PostgREST caps unbounded selects at 1000 rows, and paid invoices alone
// already exceed that. The Revenue Trend chart only ever shows 6 months, so
// rather than paging through (and re-summing) every paid invoice the
// business has ever raised, bound the fetch to the same 6-month window the
// chart actually displays — same fix, far less data to move on every load.
async function fetchPaidInvoicesSince(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  sinceISO: string,
): Promise<PaidInvoiceRow[]> {
  return paginateAll<PaidInvoiceRow>((from, to) =>
    supabase
      .from('invoices')
      .select('total, paid_date')
      .eq('status', 'paid')
      .gte('paid_date', sinceISO)
      .range(from, to)
  )
}

export default async function DashboardPage() {
  const supabase = await createServerSupabase()

  const today = new Date()
  const todayStr       = today.toISOString().split('T')[0]
  const tomorrow       = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr    = tomorrow.toISOString().split('T')[0]
  const startOfMonth   = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const startOfMonthDate = startOfMonth.split('T')[0]

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString()
  const lastMonthEnd   = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const dayOfWeek    = today.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart    = new Date(today)
  weekStart.setDate(today.getDate() - daysToMonday)
  const startOfWeekStr = weekStart.toISOString().split('T')[0]

  // Matches the Revenue Trend chart's own 6-month window (see monthBuckets
  // below) — bounding the paid-invoices fetch to it keeps both the chart
  // and the Avg Job Value stat in sync with what's actually displayed.
  const sixMonthsAgoStart = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString()

  // ── Wave 1 ───────────────────────────────────────────────────────────────────
  const [
    { count: activeClientsCount },
    { data: rawJobsToday },
    { count: inProgressCount },
    outstandingInvoices,
    { count: overdueCount },
    { data: rawRecentJobs },
    { data: rawLeads },
    { data: rawOverdueInvoices },
    { data: paidThisMonth },
    { data: paidLastMonth },
    { data: staffJobsThisWeek },
    { data: quotesThisMonth },
    { data: completedJobsThisMonth },
    { count: quotesPipelineCount },
    { count: activeJobsPipelineCount },
    allQuoteStatuses,
    paidInvoicesAll,
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('jobs')
      .select('id, title, job_type, status, created_at, clients(name), staff(name)')
      .gte('scheduled_date', todayStr).lt('scheduled_date', tomorrowStr).order('scheduled_date'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    // 739+ rows and growing — was an unbounded single fetch close to the
    // 1000-row PostgREST cap; paginated defensively even though it's a
    // count-only sum, since the actual dollar total requires every row.
    paginateAll<{ total: number | null }>((from, to) =>
      supabase.from('invoices').select('total').in('status', ['sent', 'overdue']).range(from, to)
    ),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabase.from('jobs')
      .select('id, title, job_type, status, created_at, clients(name)')
      .order('created_at', { ascending: false }).limit(6),
    // Only the columns the "New Leads" card actually renders.
    supabase.from('leads').select('id, name, email, phone, source').eq('status', 'new').order('created_at', { ascending: false }),
    supabase.from('invoices')
      .select('id, total, due_date, clients(name)')
      .eq('status', 'overdue').order('due_date', { ascending: true }).limit(8),
    supabase.from('invoices').select('total').eq('status', 'paid').gte('created_at', startOfMonth),
    supabase.from('invoices').select('total').eq('status', 'paid')
      .gte('created_at', lastMonthStart).lt('created_at', lastMonthEnd),
    supabase.from('jobs').select('staff(name)').eq('status', 'complete')
      .gte('completed_date', startOfWeekStr),
    supabase.from('quotes').select('total, jobs(job_type)').gte('created_at', startOfMonth)
      .not('total', 'is', null),
    supabase.from('jobs').select('id, staff(pay_rate)').eq('status', 'complete')
      .gte('completed_date', startOfMonthDate),
    supabase.from('quotes').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).in('status', ['scheduled', 'in_progress']),
    // 955+ rows, no date bound, right at the 1000-row cap — paginate it.
    paginateAll<{ status: string | null }>((from, to) =>
      supabase.from('quotes').select('status').range(from, to)
    ),
    fetchPaidInvoicesSince(supabase, sixMonthsAgoStart),
  ])

  // ── Wave 2: margin sub-queries ───────────────────────────────────────────────
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
  const jobsToday       = (rawJobsToday       ?? []) as unknown as DashJob[]
  const recentJobs      = (rawRecentJobs       ?? []) as unknown as DashJob[]
  const leads           = (rawLeads           ?? []) as unknown as Lead[]
  const overdueInvoices = (rawOverdueInvoices ?? []) as unknown as OverdueInvoice[]

  const outstandingVal   = (outstandingInvoices ?? []).reduce((s, inv: { total: number | null }) => s + (inv.total ?? 0), 0)
  const revenueThisMonth = (paidThisMonth       ?? []).reduce((s, inv: { total: number | null }) => s + (inv.total ?? 0), 0)
  const revenueLastMonth = (paidLastMonth       ?? []).reduce((s, inv: { total: number | null }) => s + (inv.total ?? 0), 0)

  const moneyFormatter = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  function fmtMoney(n: number) {
    return moneyFormatter.format(n)
  }

  const dateLabel = today.toLocaleDateString('en-NZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const revPct = revenueLastMonth > 0
    ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
    : null

  // ── Compute insights ──────────────────────────────────────────────────────────

  const overdueTotal = overdueInvoices.reduce((s, inv) => s + (inv.total ?? 0), 0)

  const byJobType: Record<string, number> = {}
  for (const q of (quotesThisMonth ?? []) as unknown as { total: number | null; jobs: { job_type: string | null } | null }[]) {
    const type = q.jobs?.job_type ?? 'General'
    byJobType[type] = (byJobType[type] ?? 0) + (q.total ?? 0)
  }
  const topJobType = Object.entries(byJobType).sort((a, b) => b[1] - a[1])[0] ?? null

  const staffCount: Record<string, number> = {}
  for (const j of (staffJobsThisWeek ?? []) as unknown as { staff: { name: string } | null }[]) {
    const name = j.staff?.name
    if (name) staffCount[name] = (staffCount[name] ?? 0) + 1
  }
  const topStaff = Object.entries(staffCount).sort((a, b) => b[1] - a[1])[0] ?? null

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
    margins.push(((qt - matCost - labourCost) / qt) * 100)
  }
  const avgMargin = margins.length > 0
    ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length)
    : null

  // ── Pipeline + chart derived values ────────────────────────────────────────────

  const paidInvoicesArr = (paidInvoicesAll ?? []) as { total: number | null; paid_date: string | null }[]
  const avgJobValue = paidInvoicesArr.length > 0
    ? paidInvoicesArr.reduce((s, inv) => s + (inv.total ?? 0), 0) / paidInvoicesArr.length
    : null

  const quoteStatusArr = (allQuoteStatuses ?? []) as { status: string | null }[]
  const decidedQuotes = quoteStatusArr.filter(q => ['accepted', 'declined', 'expired'].includes(q.status ?? ''))
  const acceptedQuotes = decidedQuotes.filter(q => q.status === 'accepted').length
  const conversionRate = decidedQuotes.length > 0
    ? Math.round((acceptedQuotes / decidedQuotes.length) * 100)
    : null

  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString('en-NZ', { month: 'short' }), revenue: 0 }
  })
  for (const inv of paidInvoicesArr) {
    if (!inv.paid_date) continue
    const d = new Date(inv.paid_date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = monthBuckets.find(b => b.key === key)
    if (bucket) bucket.revenue += inv.total ?? 0
  }
  const revenueTrendData = monthBuckets.map(b => ({ month: b.month, revenue: Math.round(b.revenue) }))

  // ── Insight icons ─────────────────────────────────────────────────────────────

  const AlertIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
  const TrendIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  )
  const StarIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
  const RevenueIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  )
  const BellIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
  const PctIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  )

  // ── Build insights ────────────────────────────────────────────────────────────

  const insights: Insight[] = []

  if ((overdueCount ?? 0) === 0) {
    insights.push({ icon: AlertIcon, text: 'No overdue invoices — all accounts clear.', positive: true })
  } else {
    insights.push({
      icon: AlertIcon,
      text: `${overdueCount} overdue invoice${(overdueCount ?? 0) > 1 ? 's' : ''} totalling ${fmtMoney(overdueTotal)} — follow up today.`,
      negative: true,
    })
  }

  if (topJobType) {
    insights.push({ icon: TrendIcon, text: `${topJobType[0]} is your top earner this month — ${fmtMoney(topJobType[1])} in quotes.` })
  } else {
    insights.push({ icon: TrendIcon, text: 'No quotes raised this month yet — time to send some.' })
  }

  if (topStaff) {
    insights.push({
      icon: StarIcon,
      text: `${topStaff[0]} completed ${topStaff[1]} job${topStaff[1] > 1 ? 's' : ''} this week — leading the team.`,
      positive: true,
    })
  } else {
    insights.push({ icon: StarIcon, text: 'No jobs completed by staff this week yet.' })
  }

  if (revPct !== null) {
    const dir = revPct >= 0 ? 'up' : 'down'
    insights.push({
      icon: RevenueIcon,
      text: `Revenue ${dir} ${Math.abs(revPct)}% vs last month (${fmtMoney(revenueLastMonth)} → ${fmtMoney(revenueThisMonth)}).`,
      positive: revPct >= 0,
      negative: revPct < 0,
    })
  } else if (revenueThisMonth > 0) {
    insights.push({ icon: RevenueIcon, text: `${fmtMoney(revenueThisMonth)} collected this month — first month of tracked revenue.`, positive: true })
  } else {
    insights.push({ icon: RevenueIcon, text: 'No revenue recorded this month yet.' })
  }

  if (leads.length === 0) {
    insights.push({ icon: BellIcon, text: 'All new leads have been followed up — inbox clear.', positive: true })
  } else {
    insights.push({
      icon: BellIcon,
      text: `${leads.length} new lead${leads.length > 1 ? 's' : ''} waiting for follow-up — don't let them go cold.`,
      negative: leads.length > 2,
    })
  }

  if (avgMargin !== null) {
    insights.push({
      icon: PctIcon,
      text: `Avg. ${avgMargin}% profit margin on completed jobs this month${avgMargin < 20 ? ' — margins are tight.' : '.'}`,
      positive: avgMargin >= 30,
      negative: avgMargin < 10,
    })
  } else {
    insights.push({ icon: PctIcon, text: 'Add quotes and materials to completed jobs to track profit margins.' })
  }

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
      </div>

      {/* AI Search */}
      <AiSearchBar />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 mb-3">
        <StatCard
          label="Revenue This Month"
          value={fmtMoney(revenueThisMonth)}
          sub={revPct !== null ? `vs last month` : undefined}
          trend={revPct}
          icon={<IconRevenue />}
          accentValue
        />
        <StatCard
          label="Active Clients"
          value={String(activeClientsCount ?? 0)}
          icon={<IconClients />}
        />
        <StatCard
          label="Jobs Today"
          value={String(jobsToday.length)}
          sub="scheduled"
          icon={<IconJobs />}
        />
        <StatCard
          label="In Progress"
          value={String(inProgressCount ?? 0)}
          icon={<IconProgress />}
        />
        <StatCard
          label="Outstanding"
          value={fmtMoney(outstandingVal)}
          sub="sent + overdue"
          icon={<IconOutstanding />}
        />
        <StatCard
          label="Overdue"
          value={String(overdueCount ?? 0)}
          sub={(overdueCount ?? 0) > 0 ? 'requires attention' : 'all clear'}
          icon={<IconAlert />}
          danger={(overdueCount ?? 0) > 0}
        />
        <StatCard
          label="Avg Job Value"
          value={avgJobValue != null ? fmtMoney(avgJobValue) : '—'}
          sub={avgJobValue != null ? 'per paid invoice, last 6 months' : undefined}
          icon={<IconJobValue />}
        />
        <StatCard
          label="Quote Conversion"
          value={conversionRate != null ? `${conversionRate}%` : '—'}
          sub={conversionRate != null ? 'accepted vs decided' : undefined}
          icon={<IconConversion />}
          accentValue
        />
      </div>

      {/* Business Pipeline */}
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Business Pipeline</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <PipelineStage label="Leads" value={leads.length} icon={<IconClients />} />
          <PipelineArrow />
          <PipelineStage label="Quotes" value={quotesPipelineCount ?? 0} icon={<IconQuotesPipe />} />
          <PipelineArrow />
          <PipelineStage label="Active Jobs" value={activeJobsPipelineCount ?? 0} icon={<IconJobs />} />
          <PipelineArrow />
          <PipelineStage label="Invoices" value={(outstandingInvoices ?? []).length} icon={<IconOutstanding />} />
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="mb-5">
        <RevenueTrendChart data={revenueTrendData} />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-5">
        {([
          { label: '+ New Job',    href: '/jobs?action=new'    },
          { label: '+ New Quote',  href: '/quotes?action=new'  },
          { label: '+ New Client', href: '/clients?action=new' },
          { label: '+ New Lead',   href: '/leads?action=new'   },
        ] as const).map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="px-3.5 py-3.5 sm:py-1.5 rounded-md text-xs font-semibold transition-colors hover:bg-amber-50"
            style={{ border: '1px solid rgba(184,146,42,0.45)', color: '#B8922A' }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* AI Insights — full width */}
      <div className="mb-5">
        <AiInsightsCard insights={insights} />
      </div>

      {/* Main two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">

        {/* Jobs Today — 3/5 */}
        <div className="lg:col-span-3 rounded-lg border border-gray-100 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: '#fafafa' }}>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Jobs Today</p>
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ background: 'rgba(184,146,42,0.1)', color: '#B8922A' }}
              >
                {jobsToday.length}
              </span>
            </div>
            <Link href="/jobs" className="text-xs font-medium hover:opacity-60 transition-opacity" style={{ color: '#B8922A' }}>
              View all →
            </Link>
          </div>

          {jobsToday.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-gray-300">No jobs scheduled for today</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Job</th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Staff</th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {jobsToday.map((job, i) => (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50 transition-colors"
                      style={{ borderTop: i === 0 ? undefined : '1px solid #f9fafb' }}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-gray-900 truncate max-w-[130px] text-xs">
                          {job.title ?? job.job_type ?? 'Untitled'}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 truncate max-w-[110px]">
                        {job.clients?.name ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {job.job_type ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {job.staff?.name ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link href={`/jobs/${job.id}`} className="text-gray-300 hover:text-[#B8922A] transition-colors text-sm">→</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column: Recent Activity + New Leads stacked — 2/5 */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Recent Activity */}
          <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: '#fafafa' }}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Activity</p>
              <Link href="/jobs" className="text-xs font-medium hover:opacity-60 transition-opacity" style={{ color: '#B8922A' }}>
                View all →
              </Link>
            </div>
            {recentJobs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-300">No jobs yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentJobs.slice(0, 5).map(job => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-[#B8922A] transition-colors">
                        {job.title ?? job.job_type ?? 'Untitled'}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
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

          {/* New Leads */}
          <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: '#fafafa' }}>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Leads</p>
                {leads.length > 0 && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                    style={{ background: '#B8922A' }}
                  >
                    {leads.length}
                  </span>
                )}
              </div>
              <Link href="/leads" className="text-xs font-medium hover:opacity-60 transition-opacity" style={{ color: '#B8922A' }}>
                View all →
              </Link>
            </div>
            {leads.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-300">No new leads</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {leads.slice(0, 5).map(lead => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-[#B8922A] transition-colors">
                        {lead.name ?? 'Unnamed Lead'}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {lead.email ?? lead.phone ?? (lead as unknown as { source?: string }).source ?? '—'}
                      </p>
                    </div>
                    <span className="text-gray-300 group-hover:text-[#B8922A] transition-colors shrink-0 text-sm">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Overdue Invoices */}
      {overdueInvoices.length > 0 && (
        <div className="rounded-lg border border-red-100 overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-red-100" style={{ background: '#fef2f2' }}>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#dc2626' }}>Overdue Invoices</p>
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                style={{ background: '#dc2626' }}
              >
                {overdueCount}
              </span>
            </div>
            <Link href="/invoices" className="text-xs font-medium hover:opacity-70 transition-opacity" style={{ color: '#dc2626' }}>
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Due Date</th>
                <th className="px-4 py-2 w-6" />
              </tr>
            </thead>
            <tbody>
              {overdueInvoices.map((inv, i) => (
                <tr
                  key={inv.id}
                  className="hover:bg-gray-50 transition-colors"
                  style={{ borderTop: i === 0 ? undefined : '1px solid #f9fafb' }}
                >
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-700">
                    INV-{inv.id.slice(0, 6).toUpperCase()}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                    {inv.clients?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-semibold tabular-nums" style={{ color: '#dc2626' }}>
                    {inv.total != null ? fmtMoney(inv.total) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {inv.due_date
                      ? new Date(inv.due_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/invoices/${inv.id}`} className="text-gray-300 hover:text-[#dc2626] transition-colors">→</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

    </div>
  )
}
