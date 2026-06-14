'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Job } from '@/lib/types'

// ─── status colours ────────────────────────────────────────────────────────────

const STATUS_BLOCK: Record<string, { border: string; bg: string; title: string; sub: string; dot: string }> = {
  pending:     { border: '#d1d5db', bg: '#f9fafb', title: '#374151', sub: '#9ca3af', dot: '#d1d5db' },
  scheduled:   { border: '#3b82f6', bg: '#eff6ff', title: '#1e40af', sub: '#3b82f6', dot: '#3b82f6' },
  in_progress: { border: '#B8922A', bg: '#fdf8ee', title: '#92400e', sub: '#B8922A', dot: '#B8922A' },
  complete:    { border: '#22c55e', bg: '#f0fdf4', title: '#15803d', sub: '#22c55e', dot: '#22c55e' },
  invoiced:    { border: '#8b5cf6', bg: '#faf5ff', title: '#5b21b6', sub: '#8b5cf6', dot: '#8b5cf6' },
  cancelled:   { border: '#ef4444', bg: '#fef2f2', title: '#b91c1c', sub: '#ef4444', dot: '#ef4444' },
}
const BLOCK_FALLBACK = STATUS_BLOCK.pending

const LEGEND = [
  { key: 'pending',     label: 'Pending' },
  { key: 'scheduled',   label: 'Scheduled' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete',    label: 'Complete' },
  { key: 'invoiced',    label: 'Invoiced' },
  { key: 'cancelled',   label: 'Cancelled' },
]

// ─── date helpers ───────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatWeekRange(start: Date): string {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'long' }
  const startMonth = start.toLocaleDateString('en-NZ', opts)
  const endMonth = end.toLocaleDateString('en-NZ', opts)
  const year = end.getFullYear()
  if (startMonth === endMonth) {
    return `${start.getDate()} – ${end.getDate()} ${startMonth} ${year}`
  }
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${year}`
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── job block ──────────────────────────────────────────────────────────────────

function JobBlock({ job }: { job: Job }) {
  const router = useRouter()
  const c = STATUS_BLOCK[job.status ?? ''] ?? BLOCK_FALLBACK

  return (
    <div
      onClick={(e) => { e.stopPropagation(); router.push(`/jobs/${job.id}`) }}
      className="cursor-pointer rounded-md px-2 py-1.5 border-l-[3px] hover:opacity-75 transition-opacity select-none"
      style={{ background: c.bg, borderLeftColor: c.border }}
    >
      <p
        className="text-xs font-semibold leading-snug overflow-hidden"
        style={{ color: c.title, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
      >
        {job.title ?? job.job_type ?? 'Untitled'}
      </p>
      {job.staff?.name && (
        <p className="text-[11px] leading-snug mt-0.5 truncate" style={{ color: c.sub }}>
          {job.staff.name}
        </p>
      )}
    </div>
  )
}

// ─── main view ──────────────────────────────────────────────────────────────────

export default function ScheduleView() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  // Empty string on server/hydration; set client-side to avoid timezone mismatch
  const [todayKey, setTodayKey] = useState('')
  useEffect(() => { setTodayKey(toDateKey(new Date())) }, [])

  const weekKey = toDateKey(weekStart)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const nextMonday = new Date(weekStart)
      nextMonday.setDate(nextMonday.getDate() + 7)

      const { data } = await supabase
        .from('jobs')
        .select('id, title, job_type, status, scheduled_date, staff(name)')
        .gte('scheduled_date', weekKey)
        .lt('scheduled_date', toDateKey(nextMonday))
        .order('scheduled_date')

      if (!cancelled) {
        setJobs((data as unknown as Job[]) ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey])

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const jobsByDate = jobs.reduce<Record<string, Job[]>>((acc, job) => {
    const key = job.scheduled_date?.split('T')[0]
    if (!key) return acc
    if (!acc[key]) acc[key] = []
    acc[key].push(job)
    return acc
  }, {})

  function shiftWeek(delta: number) {
    setWeekStart(prev => {
      const next = new Date(prev)
      next.setDate(next.getDate() + delta)
      return next
    })
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Schedule</h1>
          <p className="mt-0.5 text-sm text-gray-500">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center rounded-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => shiftWeek(-7)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors border-r border-gray-200"
              aria-label="Previous week"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => shiftWeek(7)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="Next week"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Jobs This Week',  value: String(jobs.length) },
          { label: 'Jobs Today',      value: String(jobs.filter(j => j.scheduled_date?.split('T')[0] === todayKey).length) },
          { label: 'Staff Scheduled', value: String(new Set(jobs.filter(j => j.staff?.name).map(j => j.staff!.name)).size) },
          { label: 'In Progress',     value: String(jobs.filter(j => j.status === 'in_progress').length) },
        ].map((s, idx) => (
          <div key={s.label} className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: idx < 2 ? '#B8922A' : '#111827' }}>
              {loading ? <span className="text-gray-200">—</span> : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-5 flex-wrap">
        {LEGEND.map(({ key, label }) => {
          const c = STATUS_BLOCK[key]
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          )
        })}
      </div>

      {/* Calendar */}
      <div className="overflow-x-auto">
      <div className="rounded-lg border border-gray-100 overflow-hidden min-w-[640px]">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {days.map((day, i) => {
            const isToday = toDateKey(day) === todayKey
            return (
              <div
                key={i}
                className={`px-3 py-3 text-center ${i < 6 ? 'border-r border-gray-100' : ''} ${isToday ? 'bg-[#fdf8ee]' : 'bg-gray-50'}`}
              >
                <p className={`text-[11px] font-semibold uppercase tracking-widest ${isToday ? 'text-[#B8922A]' : 'text-gray-400'}`}>
                  {DAY_NAMES[i]}
                </p>
                <p className={`text-2xl font-semibold leading-tight mt-0.5 ${isToday ? 'text-[#B8922A]' : 'text-gray-900'}`}>
                  {day.getDate()}
                </p>
                <p className="text-[10px] text-gray-300 mt-0.5 uppercase tracking-wide">
                  {day.toLocaleDateString('en-NZ', { month: 'short' })}
                </p>
              </div>
            )
          })}
        </div>

        {/* Body */}
        {loading ? (
          <div className="py-20 text-center bg-white">
            <p className="text-sm text-gray-400">Loading schedule…</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-gray-100 bg-white">
            {days.map((day, i) => {
              const key = toDateKey(day)
              const dayJobs = jobsByDate[key] ?? []
              const isToday = key === todayKey
              return (
                <div
                  key={i}
                  className={`p-2 space-y-1.5 min-h-[200px] ${isToday ? 'bg-[#fefdf9]' : ''}`}
                >
                  {dayJobs.map(job => (
                    <JobBlock key={job.id} job={job} />
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      </div>
      {!loading && jobs.length === 0 && (
        <p className="mt-6 text-center text-sm text-gray-400">
          No jobs scheduled for this week
        </p>
      )}
    </>
  )
}
