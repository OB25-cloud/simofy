import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Lead } from '@/lib/types'

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

// ─── status badge ────────────────────────────────────────────────────────────

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

// ─── page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const today = new Date()
  const todayStr    = today.toISOString().split('T')[0]
  const tomorrow    = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const [
    { count: activeClientsCount },
    { data: rawJobsToday },
    { count: inProgressCount },
    { data: outstandingInvoices },
    { count: overdueCount },
    { data: rawRecentJobs },
    { data: rawLeads },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('jobs')
      .select('id, title, job_type, status, created_at, clients(name), staff(name)')
      .gte('scheduled_date', todayStr)
      .lt('scheduled_date', tomorrowStr)
      .order('scheduled_date'),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress'),
    supabase
      .from('invoices')
      .select('total')
      .in('status', ['sent', 'overdue']),
    supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'overdue'),
    supabase
      .from('jobs')
      .select('id, title, job_type, status, created_at, clients(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('leads')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: false }),
  ])

  const jobsToday      = (rawJobsToday  ?? []) as unknown as DashJob[]
  const recentJobs     = (rawRecentJobs ?? []) as unknown as DashJob[]
  const leads          = (rawLeads      ?? []) as unknown as Lead[]
  const outstandingVal = (outstandingInvoices ?? []).reduce(
    (sum, inv) => sum + ((inv as { total: number | null }).total ?? 0), 0
  )

  function fmtMoney(n: number) {
    if (n >= 100_000) return `$${(n / 1000).toFixed(0)}k`
    if (n >= 10_000)  return `$${(n / 1000).toFixed(1)}k`
    return `$${n.toFixed(0)}`
  }

  const dateLabel = today.toLocaleDateString('en-NZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-400">{dateLabel}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Active Clients"
          value={String(activeClientsCount ?? 0)}
          accent
        />
        <StatCard
          label="Jobs Today"
          value={String(jobsToday.length)}
          accent
          sub={jobsToday.length === 1 ? '1 job scheduled' : `${jobsToday.length} jobs scheduled`}
        />
        <StatCard
          label="In Progress"
          value={String(inProgressCount ?? 0)}
          accent
        />
        <StatCard
          label="Outstanding"
          value={fmtMoney(outstandingVal)}
          accent
          sub="sent + overdue invoices"
        />
        <StatCard
          label="Overdue Invoices"
          value={String(overdueCount ?? 0)}
          danger={(overdueCount ?? 0) > 0}
          sub={(overdueCount ?? 0) > 0 ? 'requires attention' : 'all clear'}
        />
      </div>

      {/* Two-column: Jobs Today + Recent Activity */}
      <div className="grid grid-cols-2 gap-5 mb-5">

        {/* Jobs Today */}
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jobs Today</p>
            <span className="text-xs text-gray-400">
              {jobsToday.length} {jobsToday.length === 1 ? 'job' : 'jobs'}
            </span>
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

        {/* Recent Activity */}
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Activity</p>
            <Link
              href="/jobs"
              className="text-xs font-medium hover:opacity-70 transition-opacity"
              style={{ color: '#B8922A' }}
            >
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
                        <span>
                          {' · '}
                          {new Date(job.created_at).toLocaleDateString('en-NZ', {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
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

      {/* New Leads */}
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Leads</p>
            {leads.length > 0 && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                style={{ background: '#B8922A' }}
              >
                {leads.length}
              </span>
            )}
          </div>
          <Link
            href="/leads"
            className="text-xs font-medium hover:opacity-70 transition-opacity"
            style={{ color: '#B8922A' }}
          >
            View all →
          </Link>
        </div>

        {leads.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-300">No new uncontacted leads</p>
          </div>
        ) : (
          <table className="w-full text-sm">
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
                    {new Date(lead.created_at).toLocaleDateString('en-NZ', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href="/leads"
                      className="text-gray-300 hover:text-[#B8922A] transition-colors text-base"
                    >
                      →
                    </Link>
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
