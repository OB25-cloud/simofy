import type { Job } from '@/lib/types'
import { DEFAULT_START_TIME, DEFAULT_END_TIME, timeToMinutes } from '@/lib/timeOptions'

// A job row as the scheduler's query returns it — jobs.location is rarely
// filled in by staff, the address that's actually populated usually lives
// on the linked site, so the query joins it and the UI falls back to it.
export type ScheduleJob = Job & { sites?: { address: string | null } | null }

// Day view working window: 6am–6pm. Jobs outside it are clamped to the edge.
export const VIEW_START_MIN = 6 * 60
export const VIEW_END_MIN = 18 * 60
export const VIEW_RANGE_MIN = VIEW_END_MIN - VIEW_START_MIN
// Drag/resize snapping — matches the 30-minute time pickers used elsewhere.
export const SNAP_MIN = 30

export function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

export function startOfDay(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00`)
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

export function buildWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function formatWeekRange(start: Date): string {
  const end = addDays(start, 6)
  const startMonth = start.toLocaleDateString('en-NZ', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-NZ', { month: 'short' })
  const year = end.getFullYear()
  if (startMonth === endMonth) return `${start.getDate()} – ${end.getDate()} ${startMonth} ${year}`
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${year}`
}

export function formatShortDate(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatLongDate(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function jobDateKey(job: Job): string | null {
  return job.scheduled_date ? job.scheduled_date.split('T')[0] : null
}

export function jobTimes(job: Job): { start: string; end: string } {
  return {
    start: job.start_time?.slice(0, 5) ?? DEFAULT_START_TIME,
    end: job.end_time?.slice(0, 5) ?? DEFAULT_END_TIME,
  }
}

export function jobStartMin(job: Job): number {
  return timeToMinutes(jobTimes(job).start)
}

export function jobEndMin(job: Job): number {
  const start = jobStartMin(job)
  const end = timeToMinutes(jobTimes(job).end)
  return end > start ? end : start + SNAP_MIN
}

export function jobDurationMin(job: Job): number {
  return jobEndMin(job) - jobStartMin(job)
}

export function jobAddress(job: ScheduleJob): string | null {
  return job.location ?? job.sites?.address ?? null
}

export function jobLabel(job: Job): string {
  return job.title ?? job.job_type ?? 'Untitled job'
}

export function initials(name: string | null | undefined): string {
  return (name ?? '?').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export function firstName(name: string): string {
  return name.split(' ')[0] ?? name
}

// "8am", "8:30am", "12pm" — compact time for block labels.
export function compactTime(t: string | null | undefined): string {
  if (!t) return '—'
  const [hs, ms] = t.split(':')
  const h = Number(hs)
  const m = Number(ms)
  if (Number.isNaN(h)) return '—'
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`
}

export function compactRange(job: Job): string {
  const { start, end } = jobTimes(job)
  return `${compactTime(start)} – ${compactTime(end)}`
}

export function durationLabel(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

export function snapMinutes(mins: number): number {
  return Math.round(mins / SNAP_MIN) * SNAP_MIN
}

export function clampStart(start: number, duration: number): number {
  return Math.max(VIEW_START_MIN, Math.min(start, VIEW_END_MIN - duration))
}

// Side-by-side lane assignment for jobs that overlap in time within the same
// staff row — without this a double-booking would render one job hidden
// behind another instead of visibly stacked.
export function assignLanes(jobs: Job[]): { laneByJob: Map<string, number>; laneCount: number } {
  const sorted = [...jobs].sort((a, b) => jobStartMin(a) - jobStartMin(b) || jobEndMin(a) - jobEndMin(b))
  const laneEnds: number[] = []
  const laneByJob = new Map<string, number>()
  for (const job of sorted) {
    const start = jobStartMin(job)
    let lane = laneEnds.findIndex(end => end <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(jobEndMin(job))
    } else {
      laneEnds[lane] = jobEndMin(job)
    }
    laneByJob.set(job.id, lane)
  }
  return { laneByJob, laneCount: Math.max(laneEnds.length, 1) }
}
