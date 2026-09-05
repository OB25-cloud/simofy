import { createServerSupabase } from '@/lib/supabaseServer'
import { paginateAll } from '@/lib/supabasePaginate'
import Link from 'next/link'
import type { Lead } from '@/lib/types'
import AiSearchBar from '@/app/components/AiSearchBar'
import AiInsightsCard, { type Insight } from './AiInsightsCard'
import RevenueTrendChart from './RevenueTrendChart'
import TodayTimeline, { type TimelineJob } from './TodayTimeline'
import PipelineFunnel from './PipelineFunnel'
import CrewToday, { type CrewMember } from './CrewToday'

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

type TodayJob = DashJob & {
  start_time: string | null
  end_time: string | null
  location: string | null
  staff_id: string | null
}

type OverdueInvoice = {
  id: string
  total: number | null
  due_date: string | null
  clients: { name: string } | null
}

// ─── stat card icons ─────────────────────────────────────────────────────────

function IconRevenue() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
}
function IconClients() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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

function IconArrow() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
}

// ─── small presentational helpers ───────────────────────────────────────────

// Six-month revenue sparkline, rendered as plain SVG bars so it paints
// instantly on the server with no client chart runtime.
function Sparkline({ points }: { points: { month: string; revenue: number }[] }) {
  const max = Math.max(1, ...points.map(p => p.revenue))
  const W = 132, H = 40, gap = 6
  const bw = (W - gap * (points.length - 1)) / points.length
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      {points.map((p, i) => {
        const h = Math.max(3, Math.round((p.revenue / max) * (H - 4)))
        const isLast = i === points.length - 1
        return (
          <rect
            key={p.month}
            x={i * (bw + gap)}
            y={H - h}
            width={bw}
            height={h}
            rx={2.5}
            fill={isLast ? 'var(--accent)' : 'rgba(21, 128, 61, 0.28)'}
          />
        )
      })}
    </svg>
  )
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{children}</p>
      {action}
    </div>
  )
}

function ViewAll({ href, children = 'View all' }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover transition-colors">
      {children}
      <IconArrow />
    </Link>
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
    { count: activeStaffCount },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('jobs')
      .select('id, title, job_type, status, created_at, start_time, end_time, location, staff_id, clients(name), staff(name)')
      .gte('scheduled_date', todayStr).lt('scheduled_date', tomorrowStr).order('start_time'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    // 739+ rows and growing — was an unbounded single fetch close to the
    // 1000-row PostgREST cap; paginated defensively even though it's a
    // count-only sum, since the actual dollar total requires every row.
    paginateAll<{ total: number | null }>((from, to) =>
      supabase.from('invoices').select('total').in('status', ['sent', 'overdue']).range(from, to)
    ),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    // Feeds the attention chips and the AI insights; the leads card itself was removed.
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
    // Crew widget: how many active staff exist, to frame "N of M scheduled today".
    supabase.from('staff').select('*', { count: 'exact', head: true }).eq('is_active', true),
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
  const jobsToday       = (rawJobsToday       ?? []) as unknown as TodayJob[]
  const leads          = (rawLeads           ?? []) as unknown as Lead[]
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
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
  const TrendIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  )
  const StarIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
  const RevenueIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  )
  const BellIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
  const PctIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

  // ─── presentation-only derived values ────────────────────────────────────────

  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const sixMonthRevenue = revenueTrendData.reduce((s, p) => s + p.revenue, 0)
  const outstandingCount = (outstandingInvoices ?? []).length
  const newLeadCount = leads.length

  // Crew widget: staff who have at least one job today, earliest start first.
  const crewMap = new Map<string, CrewMember>()
  for (const job of jobsToday) {
    if (!job.staff_id || !job.staff?.name) continue
    const entry = crewMap.get(job.staff_id) ?? { id: job.staff_id, name: job.staff.name, jobs: 0, firstStart: null }
    entry.jobs += 1
    if (job.start_time && (!entry.firstStart || job.start_time < entry.firstStart)) entry.firstStart = job.start_time
    crewMap.set(job.staff_id, entry)
  }
  const crew = [...crewMap.values()].sort((a, b) => (a.firstStart ?? '99').localeCompare(b.firstStart ?? '99'))
  const unassignedToday = jobsToday.filter(j => !j.staff_id).length

  const timelineJobs: TimelineJob[] = jobsToday.map(j => ({
    id: j.id, title: j.title, job_type: j.job_type, status: j.status,
    start_time: j.start_time, end_time: j.end_time, location: j.location, staff_id: j.staff_id,
    clients: j.clients, staff: j.staff,
  }))

  const attention: { label: string; href: string; tone: 'red' | 'amber' | 'green' | 'neutral' }[] = []
  if ((overdueCount ?? 0) > 0) attention.push({ label: `${overdueCount} overdue ${overdueCount === 1 ? 'invoice' : 'invoices'}`, href: '/invoices', tone: 'red' })
  else attention.push({ label: 'No overdue invoices', href: '/invoices', tone: 'green' })
  if (newLeadCount > 0) attention.push({ label: `${newLeadCount} new ${newLeadCount === 1 ? 'lead' : 'leads'} to follow up`, href: '/leads', tone: 'amber' })
  if (unassignedToday > 0) attention.push({ label: `${unassignedToday} unassigned today`, href: '/schedule', tone: 'amber' })
  attention.push({ label: `${inProgressCount ?? 0} in progress`, href: '/jobs', tone: 'neutral' })

  const CHIP_TONE: Record<typeof attention[number]['tone'], string> = {
    red: 'bg-red-50 text-red-700 ring-red-600/20 hover:bg-red-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/25 hover:bg-amber-100',
    green: 'bg-accent-soft text-accent ring-accent/20 hover:bg-[#dff2e6]',
    neutral: 'bg-surface text-ink-muted ring-line hover:bg-surface-muted',
  }
  const CHIP_DOT: Record<typeof attention[number]['tone'], string> = {
    red: '#ef4444', amber: '#f59e0b', green: 'var(--accent)', neutral: '#9ca3af',
  }

  const supporting = [
    { label: 'Active clients', value: String(activeClientsCount ?? 0), icon: <IconClients />, href: '/clients' },
    { label: 'Jobs in progress', value: String(inProgressCount ?? 0), icon: <IconProgress />, href: '/jobs' },
    { label: 'Avg job value', value: avgJobValue != null ? fmtMoney(avgJobValue) : '—', icon: <IconJobValue />, href: '/invoices' },
    { label: 'Quote conversion', value: conversionRate != null ? `${conversionRate}%` : '—', icon: <IconConversion />, href: '/quotes' },
  ]

  const funnelStages = [
    { label: 'Leads', value: leads.length, href: '/leads', hint: 'new' },
    { label: 'Quotes', value: quotesPipelineCount ?? 0, href: '/quotes', hint: 'open' },
    { label: 'Active jobs', value: activeJobsPipelineCount ?? 0, href: '/jobs', hint: 'scheduled + live' },
    { label: 'Invoices', value: outstandingCount, href: '/invoices', hint: 'awaiting payment' },
  ]

  const shortDate = today.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto page-fade-in">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {dateLabel}
          </p>
          <h1 className="mt-2 text-[30px] sm:text-[34px] leading-[1.1] font-bold tracking-tight text-ink">
            {greeting}.{' '}
            <span className="text-ink-muted font-semibold">
              {jobsToday.length === 0
                ? 'Nothing scheduled today.'
                : `${jobsToday.length} ${jobsToday.length === 1 ? 'job' : 'jobs'} on the board today.`}
            </span>
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {attention.map(chip => (
              <Link
                key={chip.label}
                href={chip.href}
                className={['inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 ring-inset transition-colors', CHIP_TONE[chip.tone]].join(' ')}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: CHIP_DOT[chip.tone] }} />
                {chip.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href="/jobs?action=new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-white shadow-[0_1px_2px_rgba(17,24,39,0.12)] hover:brightness-110 transition-[filter]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Job
          </Link>
          {([
            { label: 'Quote', href: '/quotes?action=new' },
            { label: 'Client', href: '/clients?action=new' },
            { label: 'Lead', href: '/leads?action=new' },
          ] as const).map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium bg-surface border border-line text-ink shadow-[0_1px_2px_rgba(17,24,39,0.04)] hover:bg-surface-muted transition-colors"
            >
              <span className="text-ink-faint">+</span> {label}
            </Link>
          ))}
        </div>
      </header>

      {/* ── Ask Operify ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <AiSearchBar />
      </div>

      {/* ── Key metrics ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">

        {/* Outstanding — the number to act on */}
        <div className="lg:col-span-4 relative bg-surface rounded-xl border border-line shadow-card overflow-hidden flex flex-col">
          <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', (overdueCount ?? 0) > 0 ? 'bg-error' : 'bg-accent'].join(' ')} />
          <div className="p-5 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted pt-1">Outstanding</p>
              <span className={['shrink-0 flex items-center justify-center w-8 h-8 rounded-lg', (overdueCount ?? 0) > 0 ? 'bg-red-50 text-error' : 'bg-accent-soft text-accent'].join(' ')}>
                <IconOutstanding />
              </span>
            </div>
            <p className="mt-2 text-[38px] leading-none font-bold tracking-tight tabular-nums text-ink">{fmtMoney(outstandingVal)}</p>
            <p className="mt-2 text-xs text-ink-muted">
              across {outstandingCount} {outstandingCount === 1 ? 'invoice' : 'invoices'} sent or overdue
            </p>
          </div>
          {(overdueCount ?? 0) > 0 ? (
            <Link href="/invoices" className="group flex items-center justify-between gap-3 px-5 py-3 bg-red-50/70 border-t border-red-100 hover:bg-red-50 transition-colors">
              <span className="flex items-center gap-2 min-w-0">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-error text-white shrink-0"><IconAlert /></span>
                <span className="text-sm font-semibold text-red-700 truncate">
                  {overdueCount} overdue · {fmtMoney(overdueTotal)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 shrink-0">
                Chase now <IconArrow />
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 px-5 py-3 bg-accent-soft/60 border-t border-line-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-sm font-medium text-accent">All accounts are within terms</span>
            </div>
          )}
        </div>

        {/* Revenue — six-month view with sparkline */}
        <div className="lg:col-span-4 relative bg-surface rounded-xl border border-line shadow-card overflow-hidden flex flex-col">
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
          <div className="p-5 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted pt-1">Revenue · last 6 months</p>
              <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-accent-soft text-accent">
                <IconRevenue />
              </span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-4">
              <p className="text-[38px] leading-none font-bold tracking-tight tabular-nums text-ink">{fmtMoney(sixMonthRevenue)}</p>
              <Sparkline points={revenueTrendData} />
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              collected from {paidInvoicesArr.length} paid {paidInvoicesArr.length === 1 ? 'invoice' : 'invoices'}
            </p>
          </div>
          <div className="flex items-center gap-4 px-5 py-3 bg-surface-muted/60 border-t border-line-soft text-xs">
            <span className="text-ink-muted">This month <span className="font-semibold text-ink tabular-nums">{fmtMoney(revenueThisMonth)}</span></span>
            <span className="text-ink-muted">Last month <span className="font-semibold text-ink tabular-nums">{fmtMoney(revenueLastMonth)}</span></span>
            {revPct != null && revenueThisMonth > 0 && (
              <span className={['ml-auto inline-flex items-center gap-0.5 font-semibold tabular-nums px-1.5 py-px rounded-md', revPct >= 0 ? 'bg-accent-soft text-accent' : 'bg-red-50 text-error'].join(' ')}>
                {revPct >= 0 ? '↑' : '↓'}{Math.abs(revPct)}%
              </span>
            )}
          </div>
        </div>

        {/* Supporting stats */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-4">
          {supporting.map(stat => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group bg-surface rounded-xl border border-line shadow-card p-4 flex flex-col justify-between hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4">{stat.label}</p>
                <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-surface-muted text-ink-muted group-hover:bg-accent-soft group-hover:text-accent transition-colors">
                  {stat.icon}
                </span>
              </div>
              <p className="mt-3 text-[24px] leading-none font-bold tracking-tight tabular-nums text-ink">{stat.value}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Pipeline ──────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-xl border border-line shadow-card p-5 mb-6">
        <SectionLabel action={<ViewAll href="/leads">Work the pipeline</ViewAll>}>Business pipeline</SectionLabel>
        <PipelineFunnel stages={funnelStages} />
      </div>

      {/* ── Today ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        <div className="lg:col-span-8 bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line-soft">
            <div className="flex items-center gap-2.5">
              <p className="text-sm font-semibold text-ink">Today</p>
              <span className="text-xs text-ink-faint">{shortDate}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-accent-soft text-accent tabular-nums">
                {jobsToday.length}
              </span>
            </div>
            <ViewAll href="/schedule">Open schedule</ViewAll>
          </div>
          <TodayTimeline jobs={timelineJobs} now={today} />
        </div>

        <div className="lg:col-span-4 bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line-soft">
            <p className="text-sm font-semibold text-ink">Crew today</p>
            <span className="text-xs text-ink-faint">{activeStaffCount ?? 0} active staff</span>
          </div>
          <CrewToday crew={crew} totalActive={activeStaffCount ?? 0} unassignedJobs={unassignedToday} />
        </div>
      </div>

      {/* ── Trend + insights ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 min-h-[300px]">
          <RevenueTrendChart data={revenueTrendData} headline={fmtMoney(sixMonthRevenue)} />
        </div>
        <div className="lg:col-span-5">
          <AiInsightsCard insights={insights} />
        </div>
      </div>

    </div>
  )
}
