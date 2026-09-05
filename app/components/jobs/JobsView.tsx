'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Job, Client, Staff } from '@/lib/types'
import AddJobModal from './AddJobModal'
import { StatusBadge } from '@/app/components/ui/Badge'
import { StatCard } from '@/app/components/ui/StatCard'
import Button from '@/app/components/ui/Button'
import { inputClass } from '@/app/components/ui/input'

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: 'var(--surface-muted)', text: 'var(--ink-muted)', dot: 'var(--line)', label: 'Pending'     },
  scheduled:   { bg: '#DBEAFE', text: '#1D4ED8', dot: '#3B82F6', label: 'Scheduled'   },
  in_progress: { bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B', label: 'In Progress' },
  complete:    { bg: '#DCFCE7', text: '#15803D', dot: '#22C55E', label: 'Complete'     },
  invoiced:    { bg: '#F3E8FF', text: '#7C3AED', dot: '#8b5cf6', label: 'Invoiced'    },
  cancelled:   { bg: '#FEE2E2', text: '#EF4444', dot: '#EF4444', label: 'Cancelled'   },
}

const RECURRENCE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

const BOARD_COLUMNS: { key: string; label: string }[] = [
  { key: 'pending',     label: 'Pending'     },
  { key: 'scheduled',   label: 'Scheduled'   },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete',    label: 'Complete'    },
  { key: 'invoiced',    label: 'Invoiced'    },
]

// ── date helpers ──────────────────────────────────────────────────────────────

type DateRange = 'today' | 'week' | 'month' | 'all'

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  week:  'This Week',
  month: 'This Month',
  all:   'All',
}

// `scheduled_date` comes back from Supabase as a date-only string
// (e.g. "2026-06-17"), which Date parses as UTC midnight. All boundary
// dates below are built with Date.UTC so comparisons line up regardless
// of the server's or browser's local timezone.
function getDateBounds(range: DateRange): { start: Date | null; end: Date | null } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()

  if (range === 'today') {
    return {
      start: new Date(Date.UTC(y, m, d)),
      end: new Date(Date.UTC(y, m, d, 23, 59, 59, 999)),
    }
  }
  if (range === 'week') {
    const dayOfWeek = new Date(Date.UTC(y, m, d)).getUTCDay() // 0 = Sunday
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    return {
      start: new Date(Date.UTC(y, m, d - daysToMonday)),
      end: new Date(Date.UTC(y, m, d - daysToMonday + 6, 23, 59, 59, 999)),
    }
  }
  if (range === 'month') {
    return {
      start: new Date(Date.UTC(y, m, 1)),
      end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
    }
  }
  return { start: null, end: null }
}

function jobInRange(job: Job, start: Date | null, end: Date | null): boolean {
  if (!start && !end) return true
  if (!job.scheduled_date) return false
  const d = new Date(job.scheduled_date) // date-only string -> UTC midnight
  if (start && d < start) return false
  if (end && d > end) return false
  return true
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── row types & grouping ──────────────────────────────────────────────────────

type SingleRow = { type: 'single'; job: Job }

type SeriesRow = {
  type: 'series'
  seriesId: string
  pattern: string
  title: string | null
  clientName: string | null
  jobType: string | null
  staffName: string | null
  location: string | null
  nextJob: Job
  occurrencesInRange: Job[]
  upcomingCount: number
}

type TableRow = SingleRow | SeriesRow

function buildRows(allJobs: Job[], start: Date | null, end: Date | null): TableRow[] {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const inRangeJobs = allJobs.filter(j => jobInRange(j, start, end))

  const seriesMap = new Map<string, Job[]>()
  const singles: Job[] = []

  for (const job of inRangeJobs) {
    if (job.recurring_series_id) {
      const arr = seriesMap.get(job.recurring_series_id) ?? []
      arr.push(job)
      seriesMap.set(job.recurring_series_id, arr)
    } else {
      singles.push(job)
    }
  }

  const rows: TableRow[] = singles.map(job => ({ type: 'single' as const, job }))

  for (const [seriesId, occs] of seriesMap) {
    const sorted = [...occs].sort(
      (a, b) => new Date(a.scheduled_date ?? '').getTime() - new Date(b.scheduled_date ?? '').getTime(),
    )

    // Upcoming count from full dataset — series jobs not yet done, scheduled today or later
    const upcomingJobs = allJobs
      .filter(
        j =>
          j.recurring_series_id === seriesId &&
          j.scheduled_date &&
          new Date(j.scheduled_date) >= today &&
          !['complete', 'cancelled', 'invoiced'].includes(j.status ?? ''),
      )
      .sort((a, b) => new Date(a.scheduled_date ?? '').getTime() - new Date(b.scheduled_date ?? '').getTime())

    const nextJob = upcomingJobs[0] ?? sorted[0]
    const first = sorted[0]

    rows.push({
      type: 'series',
      seriesId,
      pattern: first.recurrence_pattern ?? '',
      title: first.title,
      clientName: first.clients?.name ?? null,
      jobType: first.job_type,
      staffName: first.staff?.name ?? null,
      location: first.location,
      nextJob,
      occurrencesInRange: sorted,
      upcomingCount: upcomingJobs.length,
    })
  }

  // Sort all rows by next scheduled date ascending
  rows.sort((a, b) => {
    const da = a.type === 'single' ? (a.job.scheduled_date ?? '') : (a.nextJob.scheduled_date ?? '')
    const db = b.type === 'single' ? (b.job.scheduled_date ?? '') : (b.nextJob.scheduled_date ?? '')
    return new Date(da).getTime() - new Date(db).getTime()
  })

  return rows
}

// ── sub-components ────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', display: 'inline' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

interface Props {
  jobs: Job[]
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  staff: Pick<Staff, 'id' | 'name'>[]
  openModal?: boolean
}

export default function JobsView({ jobs, clients, staff, openModal }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'table' | 'board'>('table')
  const [dateRange, setDateRange] = useState<DateRange>('week')
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(openModal ?? false)

  const { start, end } = useMemo(() => getDateBounds(dateRange), [dateRange])
  const allRows = useMemo(() => buildRows(jobs, start, end), [jobs, start, end])

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase()
    return allRows.filter(row => {
      if (row.type === 'single') {
        const j = row.job
        const matchSearch =
          !q ||
          (j.title?.toLowerCase().includes(q) ?? false) ||
          (j.clients?.name?.toLowerCase().includes(q) ?? false) ||
          (j.job_type?.toLowerCase().includes(q) ?? false) ||
          (j.location?.toLowerCase().includes(q) ?? false) ||
          (j.staff?.name?.toLowerCase().includes(q) ?? false)
        return matchSearch && (statusFilter === 'all' || j.status === statusFilter)
      }
      const matchSearch =
        !q ||
        (row.title?.toLowerCase().includes(q) ?? false) ||
        (row.clientName?.toLowerCase().includes(q) ?? false) ||
        (row.jobType?.toLowerCase().includes(q) ?? false) ||
        (row.location?.toLowerCase().includes(q) ?? false) ||
        (row.staffName?.toLowerCase().includes(q) ?? false)
      return matchSearch && (statusFilter === 'all' || row.nextJob.status === statusFilter)
    })
  }, [allRows, search, statusFilter])

  // Stats counted from date-range jobs before grouping
  const rangeJobs = useMemo(() => jobs.filter(j => jobInRange(j, start, end)), [jobs, start, end])

  const boardJobs = useMemo(() => {
    const q = search.toLowerCase()
    return rangeJobs.filter(j =>
      !q ||
      (j.title?.toLowerCase().includes(q) ?? false) ||
      (j.clients?.name?.toLowerCase().includes(q) ?? false) ||
      (j.job_type?.toLowerCase().includes(q) ?? false) ||
      (j.location?.toLowerCase().includes(q) ?? false) ||
      (j.staff?.name?.toLowerCase().includes(q) ?? false)
    )
  }, [rangeJobs, search])
  const stats = [
    { label: 'Jobs',        value: String(rangeJobs.length),                                                         accent: true  },
    { label: 'In Progress', value: String(rangeJobs.filter(j => j.status === 'in_progress').length),                 accent: true  },
    { label: 'Scheduled',   value: String(rangeJobs.filter(j => j.status === 'scheduled').length),                   accent: false },
    { label: 'Completed',   value: String(rangeJobs.filter(j => j.status === 'complete').length),                    accent: false },
  ]

  function toggleSeries(id: string) {
    setExpandedSeries(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Build flat array of <tr> elements so series + sub-rows can sit adjacent in <tbody>
  const tableRows: React.ReactElement[] = []
  filteredRows.forEach(row => {
    if (row.type === 'single') {
      tableRows.push(
        <tr
          key={row.job.id}
          onClick={() => router.push(`/jobs/${row.job.id}`)}
          className="cursor-pointer border-b border-line-soft hover:bg-surface-hover transition-colors group"
        >
          <td className="px-4 py-3 text-sm font-medium text-ink">
            {row.job.title ?? <span className="text-gray-300">—</span>}
          </td>
          <td className="px-4 py-3 text-sm text-ink-muted">
            {row.job.clients?.name ?? <span className="text-gray-300">—</span>}
          </td>
          <td className="px-4 py-3 text-sm text-ink-muted">
            {row.job.job_type ?? <span className="text-gray-300">—</span>}
          </td>
          <td className="px-4 py-3"><StatusBadge status={row.job.status} /></td>
          <td className="px-4 py-3 text-sm text-ink-muted">
            {row.job.staff?.name ?? <span className="text-gray-300">—</span>}
          </td>
          <td className="px-4 py-3 text-sm text-ink-muted max-w-[140px]">
            {row.job.location
              ? <span className="block truncate">{row.job.location}</span>
              : <span className="text-gray-300">—</span>}
          </td>
          <td className="px-4 py-3 text-ink-muted text-xs">{fmtDate(row.job.scheduled_date)}</td>
          <td className="px-4 py-3 text-right">
            <span className="text-gray-300 group-hover:text-accent transition-colors text-base">→</span>
          </td>
        </tr>,
      )
      return
    }

    // Series header row
    const expanded = expandedSeries.has(row.seriesId)
    tableRows.push(
      <tr
        key={`series-${row.seriesId}`}
        onClick={() => toggleSeries(row.seriesId)}
        className="cursor-pointer border-b border-line-soft hover:bg-surface-hover transition-colors"
      >
        <td className="px-4 py-3 text-sm font-medium text-ink">
          <div className="flex flex-col gap-1">
            <span>{row.title ?? <span className="text-gray-300 font-normal">—</span>}</span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: 'rgba(21, 128, 61,0.12)', color: 'var(--accent)' }}
              >
                Recurring · {RECURRENCE_LABELS[row.pattern] ?? row.pattern}
              </span>
              <span className="text-[11px] text-ink-muted">{row.upcomingCount} upcoming</span>
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-ink-muted">
          {row.clientName ?? <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-sm text-ink-muted">
          {row.jobType ?? <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3"><StatusBadge status={row.nextJob.status} /></td>
        <td className="px-4 py-3 text-sm text-ink-muted">
          {row.staffName ?? <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-sm text-ink-muted max-w-[140px]">
          {row.location
            ? <span className="block truncate">{row.location}</span>
            : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-ink-muted text-xs">{fmtDate(row.nextJob.scheduled_date)}</td>
        <td className="px-4 py-3 text-right"><ChevronIcon open={expanded} /></td>
      </tr>,
    )

    // Expanded occurrence sub-rows
    if (expanded) {
      row.occurrencesInRange.forEach(occ => {
        tableRows.push(
          <tr key={`occ-${occ.id}`} className="border-b border-line-soft" style={{ background: 'rgba(21, 128, 61,0.04)' }}>
            <td
              colSpan={8}
              className="py-2.5 text-sm"
              style={{
                borderLeft: '3px solid var(--accent)',
                paddingLeft: 28,
                paddingRight: 16,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="text-ink-muted tabular-nums">{fmtDate(occ.scheduled_date)}</span>
                  <StatusBadge status={occ.status} />
                </span>
                <Link
                  href={`/jobs/${occ.id}`}
                  onClick={e => e.stopPropagation()}
                  className="font-medium text-base"
                  style={{ color: 'var(--accent)' }}
                >
                  →
                </Link>
              </div>
            </td>
          </tr>,
        )
      })
    }
  })

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">Jobs</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-line overflow-hidden shrink-0">
            {(['table', 'board'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={[
                  'px-3.5 py-3 sm:py-2 text-sm transition-colors',
                  view === v ? 'bg-accent text-white font-semibold' : 'bg-white text-ink-muted hover:bg-surface-muted',
                ].join(' ')}
              >
                {v === 'table' ? 'Table View' : 'Board View'}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowModal(true)} variant="primary" className="shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Job
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Date range filter */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(range => {
          const active = dateRange === range
          return (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={[
                'px-4 py-3 sm:py-2 text-sm rounded-lg transition-colors',
                active
                  ? 'bg-accent text-white font-semibold'
                  : 'bg-white text-ink-muted border border-line hover:bg-surface-muted',
              ].join(' ')}
            >
              {DATE_RANGE_LABELS[range]}
            </button>
          )
        })}
      </div>

      {/* Search + status filter */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by title, client, type or location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2.5 ${inputClass}`}
          />
        </div>
        {view === 'table' && (
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={inputClass}
            style={{ minWidth: 150 }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="invoiced">Invoiced</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}
      </div>

      {/* Table / Board */}
      {view === 'table' ? (
        tableRows.length === 0 ? (
          <div className="rounded-xl border border-line bg-white py-16 text-center">
            <p className="text-sm text-ink-muted">
              {search || statusFilter !== 'all'
                ? 'No jobs match the current filters.'
                : dateRange === 'all'
                ? 'No jobs yet. Add your first job above.'
                : `No jobs scheduled for ${DATE_RANGE_LABELS[dateRange].toLowerCase()}.`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Title</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Client</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Type</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Staff</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Location</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">Scheduled</th>
                  <th className="px-4 py-3 w-8 bg-surface-muted border-b border-line" />
                </tr>
              </thead>
              <tbody>{tableRows}</tbody>
            </table>
            </div>
          </div>
        )
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {BOARD_COLUMNS.map(col => {
            const cfg = STATUS_CONFIG[col.key]
            const colJobs = boardJobs
              .filter(j => j.status === col.key)
              .sort((a, b) => new Date(a.scheduled_date ?? '').getTime() - new Date(b.scheduled_date ?? '').getTime())
            return (
              <div key={col.key} className="shrink-0 w-[260px] flex flex-col">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{col.label}</p>
                  <span className="ml-auto text-[11px] font-semibold text-ink-muted">{colJobs.length}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {colJobs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line py-8 text-center">
                      <p className="text-xs text-gray-300">No jobs</p>
                    </div>
                  ) : (
                    colJobs.map(job => (
                      <div
                        key={job.id}
                        onClick={() => router.push(`/jobs/${job.id}`)}
                        className="cursor-pointer rounded-xl bg-white border border-line shadow-sm p-3.5 hover:shadow-md transition-shadow duration-200"
                        style={{ borderLeft: `3px solid ${cfg.dot}` }}
                      >
                        <p className="text-sm font-semibold text-ink truncate mb-1">
                          {job.title ?? job.job_type ?? 'Untitled'}
                        </p>
                        <p className="text-xs text-ink-muted truncate mb-2.5">
                          {job.clients?.name ?? <span className="text-gray-300">—</span>}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-ink-muted tabular-nums">{fmtDate(job.scheduled_date)}</span>
                          <StatusBadge status={job.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <AddJobModal clients={clients} staff={staff} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
