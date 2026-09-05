'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Job, Client, Staff } from '@/lib/types'
import AddJobModal from './AddJobModal'
import { StatusBadge, statusDot } from '@/app/components/ui/Badge'
import Button from '@/app/components/ui/Button'
import { colorForStaff } from '@/app/components/schedule/scheduleColors'

// ── constants ─────────────────────────────────────────────────────────────────

type JobRow = Job & { sites?: { address: string | null } | null }

const RECURRENCE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
}

// Board: four working columns. Invoiced jobs are finished work, so they
// sit in Completed (still wearing their own badge) rather than vanishing.
const BOARD_COLUMNS: { key: string; label: string; statuses: string[]; empty: string }[] = [
  { key: 'pending',     label: 'Pending',     statuses: ['pending'],               empty: 'Nothing waiting to be booked' },
  { key: 'scheduled',   label: 'Scheduled',   statuses: ['scheduled'],             empty: 'No jobs on the calendar' },
  { key: 'in_progress', label: 'In Progress', statuses: ['in_progress'],           empty: 'No crews out right now' },
  { key: 'complete',    label: 'Completed',   statuses: ['complete', 'invoiced'],  empty: 'No finished jobs in this range' },
]

const STATUS_CHIPS: { key: string; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'scheduled',   label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending',     label: 'Pending' },
  { key: 'complete',    label: 'Completed' },
]

const OPEN_STATUSES = ['pending', 'scheduled', 'in_progress']

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
function utcToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function getDateBounds(range: DateRange): { start: Date | null; end: Date | null } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()

  if (range === 'today') {
    return { start: new Date(Date.UTC(y, m, d)), end: new Date(Date.UTC(y, m, d, 23, 59, 59, 999)) }
  }
  if (range === 'week') {
    const dayOfWeek = new Date(Date.UTC(y, m, d)).getUTCDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    return {
      start: new Date(Date.UTC(y, m, d - daysToMonday)),
      end: new Date(Date.UTC(y, m, d - daysToMonday + 6, 23, 59, 59, 999)),
    }
  }
  if (range === 'month') {
    return { start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)) }
  }
  return { start: null, end: null }
}

function jobInRange(job: Job, start: Date | null, end: Date | null): boolean {
  if (!start && !end) return true
  if (!job.scheduled_date) return false
  const d = new Date(job.scheduled_date)
  if (start && d < start) return false
  if (end && d > end) return false
  return true
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMoney(n: number): string {
  if (n >= 100000) return `$${Math.round(n / 1000)}k`
  if (n >= 10000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `$${Math.round(n).toLocaleString('en-NZ')}`
}

function fmtMoneyFull(n: number): string {
  return `$${Math.round(n).toLocaleString('en-NZ')}`
}

// Whole days between UTC-midnight `today` and a date-only string.
function daysFromToday(s: string | null | undefined, today: Date): number | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

function isDone(status: string | null | undefined): boolean {
  return status === 'complete' || status === 'invoiced' || status === 'cancelled'
}

function isOverdue(job: Job, today: Date): boolean {
  const diff = daysFromToday(job.scheduled_date, today)
  return diff != null && diff < 0 && OPEN_STATUSES.includes(job.status ?? '')
}

// "Today" / "Tomorrow" / "in 3 days" / "overdue 2d" / "4 days ago"
function relativeLabel(job: Job, today: Date): { text: string; tone: 'today' | 'soon' | 'overdue' | 'past' | 'none' } {
  const diff = daysFromToday(job.scheduled_date, today)
  if (diff == null) return { text: 'Unscheduled', tone: 'none' }
  const done = isDone(job.status)
  if (diff === 0) return { text: 'Today', tone: done ? 'past' : 'today' }
  if (diff === 1) return { text: 'Tomorrow', tone: 'soon' }
  if (diff > 1) {
    if (diff < 14) return { text: `in ${diff} days`, tone: 'soon' }
    if (diff < 60) return { text: `in ${Math.round(diff / 7)} wks`, tone: 'soon' }
    return { text: `in ${Math.round(diff / 30)} mo`, tone: 'soon' }
  }
  const ago = -diff
  if (!done) return { text: `overdue ${ago}d`, tone: 'overdue' }
  if (ago < 14) return { text: `${ago}d ago`, tone: 'past' }
  if (ago < 60) return { text: `${Math.round(ago / 7)}w ago`, tone: 'past' }
  return { text: `${Math.round(ago / 30)}mo ago`, tone: 'past' }
}

const TONE_CLASS: Record<ReturnType<typeof relativeLabel>['tone'], string> = {
  today: 'text-accent font-semibold',
  soon: 'text-ink-muted',
  overdue: 'text-error font-semibold',
  past: 'text-ink-faint',
  none: 'text-ink-faint',
}

function initials(name: string | null | undefined): string {
  return (name ?? '?').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function jobAddress(job: JobRow): string | null {
  return job.location ?? job.sites?.address ?? null
}

// ── row types & grouping ──────────────────────────────────────────────────────

type SingleRow = { type: 'single'; job: JobRow }

type SeriesRow = {
  type: 'series'
  seriesId: string
  pattern: string
  title: string | null
  clientName: string | null
  jobType: string | null
  staffId: string | null
  staffName: string | null
  location: string | null
  nextJob: JobRow
  occurrencesInRange: JobRow[]
  upcomingCount: number
}

type TableRow = SingleRow | SeriesRow

function buildRows(allJobs: JobRow[], start: Date | null, end: Date | null): TableRow[] {
  const today = utcToday()
  const inRangeJobs = allJobs.filter(j => jobInRange(j, start, end))

  const seriesMap = new Map<string, JobRow[]>()
  const singles: JobRow[] = []

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
    const upcomingJobs = allJobs
      .filter(j =>
        j.recurring_series_id === seriesId &&
        j.scheduled_date &&
        new Date(j.scheduled_date) >= today &&
        !isDone(j.status),
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
      staffId: first.staff_id,
      staffName: first.staff?.name ?? null,
      location: jobAddress(first),
      nextJob,
      occurrencesInRange: sorted,
      upcomingCount: upcomingJobs.length,
    })
  }

  rows.sort((a, b) => {
    const da = a.type === 'single' ? (a.job.scheduled_date ?? '') : (a.nextJob.scheduled_date ?? '')
    const db = b.type === 'single' ? (b.job.scheduled_date ?? '') : (b.nextJob.scheduled_date ?? '')
    return new Date(da).getTime() - new Date(db).getTime()
  })

  return rows
}

// ── icons ─────────────────────────────────────────────────────────────────────

const I = {
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  progress: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  dollar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  plus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  pin: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  repeat: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>,
  table: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  board: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="3" width="5" height="12" rx="1" /><rect x="17" y="3" width="4" height="8" rx="1" /></svg>,
}

// ── sub-components ────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', display: 'inline' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function StaffChip({ staffId, name, muted = false }: { staffId: string | null; name: string | null; muted?: boolean }) {
  if (!staffId || !name) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="w-6 h-6 rounded-full border border-dashed border-ink-faint/60 bg-surface-muted text-ink-faint text-[9px] font-bold flex items-center justify-center shrink-0">?</span>
        <span className="text-[12.5px] font-medium text-amber-700">Unassigned</span>
      </span>
    )
  }
  const color = colorForStaff(staffId)
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-[9.5px] font-bold text-white shrink-0 ring-2 ring-white shadow-[0_0_0_1px_rgba(17,24,39,0.06)]"
        style={{ background: color.solid }}
      >
        {initials(name)}
      </span>
      <span className={['text-[12.5px] truncate', muted ? 'text-ink-muted' : 'text-ink font-medium'].join(' ')}>{name}</span>
    </span>
  )
}

function TypeTag({ type }: { type: string | null }) {
  if (!type) return null
  return (
    <span className="inline-flex items-center text-[10.5px] font-semibold px-1.5 py-px rounded bg-surface-muted text-ink-muted ring-1 ring-inset ring-line whitespace-nowrap">
      {type}
    </span>
  )
}

function ScheduledCell({ job, today }: { job: Job; today: Date }) {
  const rel = relativeLabel(job, today)
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-ink tabular-nums leading-tight whitespace-nowrap">{fmtDate(job.scheduled_date)}</p>
      <p className={['text-[11px] leading-tight mt-0.5 whitespace-nowrap', TONE_CLASS[rel.tone]].join(' ')}>{rel.text}</p>
    </div>
  )
}

function LocationCell({ address }: { address: string | null }) {
  if (!address) return <span className="text-ink-faint text-[12.5px]">—</span>
  return (
    <span className="flex items-center gap-1.5 text-[12.5px] text-ink-muted min-w-0 max-w-[220px]" title={address}>
      <span className="text-ink-faint shrink-0">{I.pin}</span>
      <span className="truncate">{address}</span>
    </span>
  )
}

// Supporting stat: white card, green accent bar, icon tile, big number.
function SupportStat({ label, value, sub, icon, tone = 'accent' }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone?: 'accent' | 'danger' | 'muted' }) {
  const bar = tone === 'danger' ? 'bg-error' : tone === 'muted' ? 'bg-line' : 'bg-accent'
  const tile = tone === 'danger' ? 'bg-red-50 text-error' : 'bg-accent-soft text-accent'
  return (
    <div className="relative bg-surface rounded-xl border border-line shadow-card px-4 py-3.5 overflow-hidden min-w-0">
      <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', bar].join(' ')} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4 pt-0.5">{label}</p>
        <span className={['shrink-0 flex items-center justify-center w-7 h-7 rounded-lg', tile].join(' ')}>{icon}</span>
      </div>
      <p className={['mt-1 text-[26px] leading-none font-bold tracking-tight tabular-nums', tone === 'danger' ? 'text-error' : 'text-ink'].join(' ')}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-ink-muted truncate">{sub}</p>}
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

interface Props {
  jobs: JobRow[]
  quoteTotals?: Record<string, number>
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  staff: Pick<Staff, 'id' | 'name'>[]
  openModal?: boolean
  initialView?: 'table' | 'board'
}

export default function JobsView({ jobs, quoteTotals = {}, clients, staff, openModal, initialView = 'table' }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'table' | 'board'>(initialView)
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(openModal ?? false)

  const today = useMemo(() => utcToday(), [])
  const { start, end } = useMemo(() => getDateBounds(dateRange), [dateRange])
  const allRows = useMemo(() => buildRows(jobs, start, end), [jobs, start, end])

  function matchesSearch(q: string, fields: (string | null | undefined)[]): boolean {
    if (!q) return true
    return fields.some(f => f?.toLowerCase().includes(q) ?? false)
  }

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase()
    return allRows.filter(row => {
      if (row.type === 'single') {
        const j = row.job
        return matchesSearch(q, [j.title, j.clients?.name, j.job_type, jobAddress(j), j.staff?.name]) &&
          (statusFilter === 'all' || j.status === statusFilter)
      }
      return matchesSearch(q, [row.title, row.clientName, row.jobType, row.location, row.staffName]) &&
        (statusFilter === 'all' || row.nextJob.status === statusFilter)
    })
  }, [allRows, search, statusFilter])

  const rangeJobs = useMemo(() => jobs.filter(j => jobInRange(j, start, end)), [jobs, start, end])

  const boardJobs = useMemo(() => {
    const q = search.toLowerCase()
    return rangeJobs.filter(j => matchesSearch(q, [j.title, j.clients?.name, j.job_type, jobAddress(j), j.staff?.name]))
  }, [rangeJobs, search])

  // ── headline numbers (whole dataset, independent of the filter bar) ──
  const headline = useMemo(() => {
    const weekBounds = getDateBounds('week')
    const monthBounds = getDateBounds('month')
    const todayJobs = jobs.filter(j => daysFromToday(j.scheduled_date, today) === 0)
    const inProgress = jobs.filter(j => j.status === 'in_progress')
    const scheduled = jobs.filter(j => j.status === 'scheduled')
    const scheduledUpcoming = scheduled.filter(j => (daysFromToday(j.scheduled_date, today) ?? -1) >= 0)
    const completed = jobs.filter(j => j.status === 'complete' || j.status === 'invoiced')
    const completedMonth = completed.filter(j => jobInRange(j, monthBounds.start, monthBounds.end))
    const overdue = jobs.filter(j => isOverdue(j, today))
    const dueThisWeek = jobs.filter(j => !isDone(j.status) && jobInRange(j, weekBounds.start, weekBounds.end) && (daysFromToday(j.scheduled_date, today) ?? -1) >= 0)
    const unassigned = jobs.filter(j => !j.staff_id && OPEN_STATUSES.includes(j.status ?? ''))
    const active = jobs.filter(j => OPEN_STATUSES.includes(j.status ?? ''))
    const activeValue = active.reduce((sum, j) => sum + (quoteTotals[j.id] ?? 0), 0)
    const activeValued = active.filter(j => quoteTotals[j.id]).length
    const todayValue = todayJobs.reduce((sum, j) => sum + (quoteTotals[j.id] ?? 0), 0)
    const nextToday = [...todayJobs].filter(j => j.start_time && !isDone(j.status)).sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))[0]
    return {
      todayJobs, inProgress, scheduled, scheduledUpcoming, completed, completedMonth, overdue, dueThisWeek, unassigned,
      active, activeValue, activeValued, todayValue, nextToday,
    }
  }, [jobs, quoteTotals, today])

  function toggleSeries(id: string) {
    setExpandedSeries(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function fmtStart(t: string | null | undefined): string {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const suffix = h >= 12 ? 'pm' : 'am'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`
  }

  // ── table rows ──
  const tableRows: React.ReactElement[] = []
  filteredRows.forEach(row => {
    if (row.type === 'single') {
      const j = row.job
      const overdue = isOverdue(j, today)
      tableRows.push(
        <tr
          key={j.id}
          onClick={() => router.push(`/jobs/${j.id}`)}
          className="group cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-surface-hover transition-colors"
        >
          <td className="pl-5 pr-4 py-3.5 align-middle">
            <div className="flex items-start gap-3 min-w-0">
              <span aria-hidden className="mt-1.5 w-1.5 h-9 rounded-full shrink-0" style={{ background: overdue ? 'var(--error)' : statusDot(j.status) }} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink leading-snug truncate group-hover:text-accent transition-colors">
                  {j.title ?? j.job_type ?? <span className="text-ink-faint font-normal">Untitled job</span>}
                </p>
                <div className="mt-0.5 flex items-center gap-2 min-w-0">
                  <span className="text-[12px] text-ink-muted truncate">{j.clients?.name ?? <span className="text-ink-faint">No client</span>}</span>
                  <TypeTag type={j.job_type} />
                </div>
              </div>
            </div>
          </td>
          <td className="px-4 py-3.5 align-middle"><StatusBadge status={j.status} /></td>
          <td className="px-4 py-3.5 align-middle"><StaffChip staffId={j.staff_id} name={j.staff?.name ?? null} /></td>
          <td className="px-4 py-3.5 align-middle"><LocationCell address={jobAddress(j)} /></td>
          <td className="px-4 py-3.5 align-middle"><ScheduledCell job={j} today={today} /></td>
          <td className="pl-2 pr-4 py-3.5 align-middle text-right">
            <span className="inline-flex text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition-[color,transform]">{I.arrow}</span>
          </td>
        </tr>,
      )
      return
    }

    const expanded = expandedSeries.has(row.seriesId)
    tableRows.push(
      <tr
        key={`series-${row.seriesId}`}
        onClick={() => toggleSeries(row.seriesId)}
        className="group cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-surface-hover transition-colors"
      >
        <td className="pl-5 pr-4 py-3.5 align-middle">
          <div className="flex items-start gap-3 min-w-0">
            <span aria-hidden className="mt-1.5 w-1.5 h-9 rounded-full shrink-0 bg-accent" />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink leading-snug truncate">{row.title ?? <span className="text-ink-faint font-normal">Untitled series</span>}</p>
              <div className="mt-0.5 flex items-center gap-2 min-w-0 flex-wrap">
                <span className="text-[12px] text-ink-muted truncate">{row.clientName ?? <span className="text-ink-faint">No client</span>}</span>
                <TypeTag type={row.jobType} />
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-px rounded bg-accent-soft text-accent whitespace-nowrap">
                  {I.repeat} {RECURRENCE_LABELS[row.pattern] ?? row.pattern} · {row.upcomingCount} upcoming
                </span>
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 align-middle"><StatusBadge status={row.nextJob.status} /></td>
        <td className="px-4 py-3.5 align-middle"><StaffChip staffId={row.staffId} name={row.staffName} /></td>
        <td className="px-4 py-3.5 align-middle"><LocationCell address={row.location} /></td>
        <td className="px-4 py-3.5 align-middle">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Next</p>
            <ScheduledCell job={row.nextJob} today={today} />
          </div>
        </td>
        <td className="pl-2 pr-4 py-3.5 align-middle text-right text-accent"><ChevronIcon open={expanded} /></td>
      </tr>,
    )

    if (expanded) {
      row.occurrencesInRange.forEach(occ => {
        const rel = relativeLabel(occ, today)
        tableRows.push(
          <tr key={`occ-${occ.id}`} className="border-b border-line-soft bg-accent-soft/40">
            <td colSpan={6} className="py-2 pr-4" style={{ paddingLeft: 44 }}>
              <div className="flex items-center gap-4 border-l-2 border-accent pl-3">
                <span className="text-[12.5px] text-ink tabular-nums w-[120px]">{fmtDate(occ.scheduled_date)}</span>
                <span className={['text-[11px] w-[90px]', TONE_CLASS[rel.tone]].join(' ')}>{rel.text}</span>
                <StatusBadge status={occ.status} />
                <span className="ml-auto"><StaffChip staffId={occ.staff_id} name={occ.staff?.name ?? null} muted /></span>
                <Link
                  href={`/jobs/${occ.id}`}
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:text-accent-hover"
                >
                  Open {I.arrow}
                </Link>
              </div>
            </td>
          </tr>,
        )
      })
    }
  })

  const h = headline
  const showOverdueCard = h.overdue.length > 0
  const resultCount = view === 'table' ? filteredRows.length : boardJobs.length
  const rangeNoun = dateRange === 'all' ? 'all time' : DATE_RANGE_LABELS[dateRange].toLowerCase()

  const chipBase = 'px-2.5 py-1 text-[12px] rounded-md transition-[background-color,color,box-shadow] duration-150 whitespace-nowrap'

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">Jobs</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} on the books
            {h.active.length > 0 && <> · <span className="text-ink font-medium">{h.active.length} active</span></>}
            {h.overdue.length > 0 && <> · <span className="text-error font-semibold">{h.overdue.length} overdue</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-muted border border-line">
            {(['table', 'board'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] rounded-md transition-[background-color,color,box-shadow] duration-150',
                  view === v ? 'bg-white text-ink font-semibold shadow-[0_1px_2px_rgba(17,24,39,0.12),0_0_0_1px_rgba(17,24,39,0.05)]' : 'text-ink-muted hover:text-ink font-medium',
                ].join(' ')}
              >
                {v === 'table' ? I.table : I.board}
                {v === 'table' ? 'Table' : 'Board'}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowModal(true)} variant="primary" className="shrink-0">
            {I.plus} Add Job
          </Button>
        </div>
      </div>

      {/* ── Hero stat strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mb-5">
        {/* Hero: jobs today */}
        <div className="col-span-2 relative bg-surface rounded-xl border border-line shadow-card px-5 py-4 overflow-hidden">
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4 pt-0.5">Jobs today</p>
            <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-white shadow-[0_1px_2px_rgba(17,24,39,0.15)]">{I.calendar}</span>
          </div>
          <div className="mt-1 flex items-end gap-3 flex-wrap">
            <p className="text-[44px] leading-none font-bold tracking-tight tabular-nums text-ink">{h.todayJobs.length}</p>
            <div className="pb-1.5 flex items-center gap-1.5 flex-wrap">
              {h.todayJobs.filter(j => j.status === 'in_progress').length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25">
                  {h.todayJobs.filter(j => j.status === 'in_progress').length} in progress
                </span>
              )}
              {h.todayJobs.filter(j => isDone(j.status)).length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20">
                  {h.todayJobs.filter(j => isDone(j.status)).length} done
                </span>
              )}
              {h.todayJobs.filter(j => !j.staff_id && !isDone(j.status)).length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/20">
                  {h.todayJobs.filter(j => !j.staff_id && !isDone(j.status)).length} unassigned
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 text-[12px] text-ink-muted">
            {h.todayJobs.length === 0
              ? 'Nothing on the board today.'
              : <>
                  {h.nextToday ? `Next up ${fmtStart(h.nextToday.start_time)} · ${h.nextToday.title ?? h.nextToday.job_type ?? 'job'}` : 'All of today’s work is underway or done'}
                  {h.todayValue > 0 && <span className="text-ink font-medium"> · {fmtMoneyFull(h.todayValue)} quoted</span>}
                </>}
          </p>
        </div>

        <SupportStat label="In progress" value={String(h.inProgress.length)} icon={I.progress} sub={h.inProgress.length > 0 ? `${new Set(h.inProgress.map(j => j.staff_id).filter(Boolean)).size} staff on site` : 'No crews out'} />
        <SupportStat label="Scheduled" value={String(h.scheduled.length)} icon={I.clock} sub={`${h.scheduledUpcoming.length} upcoming · ${h.unassigned.length} unassigned`} />
        <SupportStat label="Completed" value={String(h.completed.length)} icon={I.check} sub={`${h.completedMonth.length} this month`} tone="muted" />
        {showOverdueCard ? (
          <SupportStat label="Overdue" value={String(h.overdue.length)} icon={I.alert} tone="danger" sub={`oldest ${Math.max(...h.overdue.map(j => -(daysFromToday(j.scheduled_date, today) ?? 0)))}d late`} />
        ) : (
          <SupportStat label="Active value" value={fmtMoney(h.activeValue)} icon={I.dollar} sub={h.activeValued > 0 ? `${h.activeValued} of ${h.active.length} jobs quoted` : 'No quotes on active jobs'} />
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-3 bg-surface rounded-xl border border-line shadow-card px-3 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5">
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-muted border border-line self-start">
          {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(range => {
            const active = dateRange === range
            return (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={[chipBase, active ? 'bg-white text-ink font-semibold shadow-[0_1px_2px_rgba(17,24,39,0.12),0_0_0_1px_rgba(17,24,39,0.05)]' : 'text-ink-muted hover:text-ink font-medium'].join(' ')}
              >
                {DATE_RANGE_LABELS[range]}
              </button>
            )
          })}
        </div>

        {view === 'table' && (
          <>
            <span className="hidden lg:block w-px h-6 bg-line mx-1" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_CHIPS.map(chip => {
                const active = statusFilter === chip.key
                const dot = chip.key === 'all' ? null : statusDot(chip.key)
                return (
                  <button
                    key={chip.key}
                    onClick={() => setStatusFilter(chip.key)}
                    className={[
                      chipBase, 'inline-flex items-center gap-1.5 ring-1 ring-inset',
                      active ? 'bg-accent-soft text-accent font-semibold ring-accent/30' : 'bg-white text-ink-muted hover:text-ink hover:bg-surface-muted ring-line font-medium',
                    ].join(' ')}
                  >
                    {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
                    {chip.label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="relative lg:ml-auto w-full lg:w-[280px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">{I.search}</span>
          <input
            type="text"
            placeholder="Search jobs, clients, staff, addresses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-line rounded-lg text-ink placeholder:text-ink-faint bg-surface focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-[box-shadow,border-color]"
          />
        </div>
      </div>

      {/* ── Quick insights ── */}
      <div className="mb-4 px-1 flex items-center gap-x-4 gap-y-1 flex-wrap text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className={['w-1.5 h-1.5 rounded-full', h.overdue.length > 0 ? 'bg-error' : 'bg-accent'].join(' ')} />
          <span className={h.overdue.length > 0 ? 'text-error font-semibold' : 'text-ink font-medium'}>{h.overdue.length} overdue</span>
        </span>
        <span className="text-line">·</span>
        <span><span className="text-ink font-medium">{h.dueThisWeek.length}</span> due this week</span>
        <span className="text-line">·</span>
        <span><span className={h.unassigned.length > 0 ? 'text-amber-700 font-semibold' : 'text-ink font-medium'}>{h.unassigned.length}</span> unassigned</span>
        <span className="text-line">·</span>
        <span><span className="text-ink font-medium">{fmtMoneyFull(h.activeValue)}</span> quoted on {h.active.length} active jobs</span>
        <span className="ml-auto text-ink-faint tabular-nums">
          Showing {resultCount} {resultCount === 1 ? 'job' : 'jobs'} · {rangeNoun}
        </span>
      </div>

      {/* ── Table / Board ── */}
      {view === 'table' ? (
        tableRows.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface shadow-card py-16 text-center">
            <p className="text-sm font-semibold text-ink">
              {search || statusFilter !== 'all' ? 'No jobs match these filters' : dateRange === 'all' ? 'No jobs yet' : `Nothing scheduled ${rangeNoun}`}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              {search || statusFilter !== 'all' ? 'Try clearing the search or picking another status.' : 'Add your first job to get started.'}
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr>
                    {['Job', 'Status', 'Staff', 'Location', 'Scheduled', ''].map((label, i) => (
                      <th
                        key={label || 'action'}
                        className={['text-left py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted bg-surface-muted border-b border-line', i === 0 ? 'pl-5 pr-4' : i === 5 ? 'w-10 px-4' : 'px-4'].join(' ')}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{tableRows}</tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
          {BOARD_COLUMNS.map(col => {
            const dot = statusDot(col.key)
            const colJobs = boardJobs
              .filter(j => col.statuses.includes(j.status ?? ''))
              .sort((a, b) => new Date(a.scheduled_date ?? '').getTime() - new Date(b.scheduled_date ?? '').getTime())
            const colValue = colJobs.reduce((s, j) => s + (quoteTotals[j.id] ?? 0), 0)
            return (
              <div key={col.key} className="shrink-0 w-[280px] flex flex-col rounded-xl bg-surface-muted/70 border border-line">
                <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                  <p className="text-[12px] font-semibold text-ink">{col.label}</p>
                  <span className="text-[11px] font-semibold tabular-nums px-1.5 py-px rounded-md bg-white text-ink-muted ring-1 ring-inset ring-line">{colJobs.length}</span>
                  {colValue > 0 && <span className="ml-auto text-[11px] text-ink-muted tabular-nums">{fmtMoney(colValue)}</span>}
                </div>
                <div className="flex flex-col gap-2 p-2.5 min-h-[160px]">
                  {colJobs.length === 0 ? (
                    <div className="flex-1 rounded-lg border border-dashed border-line bg-white/60 py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-white border border-line text-ink-faint flex items-center justify-center">{I.check}</span>
                      <p className="text-[12px] font-medium text-ink-muted">{col.empty}</p>
                    </div>
                  ) : (
                    colJobs.map(job => {
                      const rel = relativeLabel(job, today)
                      const overdue = isOverdue(job, today)
                      return (
                        <div
                          key={job.id}
                          onClick={() => router.push(`/jobs/${job.id}`)}
                          className="group cursor-pointer rounded-lg bg-white border border-line shadow-[0_1px_2px_rgba(17,24,39,0.04)] p-3 hover:shadow-card-hover hover:border-[#d6d3d1] hover:-translate-y-px transition-[box-shadow,border-color,transform] duration-150"
                          style={{ boxShadow: `inset 3px 0 0 ${overdue ? 'var(--error)' : dot}` }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-semibold text-ink leading-snug truncate group-hover:text-accent transition-colors">
                              {job.title ?? job.job_type ?? 'Untitled'}
                            </p>
                            {col.statuses.length > 1 && job.status === 'invoiced' && <StatusBadge status="invoiced" className="shrink-0" />}
                          </div>
                          <p className="text-[12px] text-ink-muted truncate mt-0.5">{job.clients?.name ?? <span className="text-ink-faint">No client</span>}</p>
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <TypeTag type={job.job_type} />
                            {quoteTotals[job.id] ? <span className="text-[10.5px] font-semibold text-ink-muted tabular-nums">{fmtMoneyFull(quoteTotals[job.id])}</span> : null}
                          </div>
                          <div className="mt-2.5 pt-2.5 border-t border-line-soft flex items-center justify-between gap-2">
                            <StaffChip staffId={job.staff_id} name={job.staff?.name ?? null} muted />
                            <span className="text-right shrink-0">
                              <span className="block text-[11px] text-ink tabular-nums leading-tight">{fmtDate(job.scheduled_date)}</span>
                              <span className={['block text-[10.5px] leading-tight', TONE_CLASS[rel.tone]].join(' ')}>{rel.text}</span>
                            </span>
                          </div>
                        </div>
                      )
                    })
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
