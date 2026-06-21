'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { supabase } from '@/lib/supabase'
import type { Job } from '@/lib/types'
import MapView, { type ScheduleJob } from './MapView'

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

function formatModalDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-NZ', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ─── job block ──────────────────────────────────────────────────────────────────

function JobBlockContent({ job, c }: { job: Job; c: typeof BLOCK_FALLBACK }) {
  return (
    <>
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
    </>
  )
}

function JobBlock({ job }: { job: Job }) {
  const router = useRouter()
  const c = STATUS_BLOCK[job.status ?? ''] ?? BLOCK_FALLBACK
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.id,
    data: { job },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); router.push(`/jobs/${job.id}`) }}
      className="cursor-pointer rounded-md px-2 py-1.5 border-l-[3px] hover:opacity-75 transition-opacity select-none"
      style={{ background: c.bg, borderLeftColor: c.border, touchAction: 'none', opacity: isDragging ? 0.3 : 1 }}
    >
      <JobBlockContent job={job} c={c} />
    </div>
  )
}

// ─── day column (drop target) ────────────────────────────────────────────────

function DayColumn({ id, isToday, children }: { id: string; isToday: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`p-2 space-y-1.5 min-h-[200px] transition-colors ${isToday ? 'bg-[#fefdf9]' : ''}`}
      style={isOver ? { background: '#fdf8ee' } : undefined}
    >
      {children}
    </div>
  )
}

// ─── reschedule confirmation modal ───────────────────────────────────────────

type PendingReschedule = { job: Job; fromKey: string; toKey: string }

function RescheduleModal({
  pending,
  notifyClient,
  notifyStaff,
  onToggleClient,
  onToggleStaff,
  saving,
  onConfirm,
  onCancel,
}: {
  pending: PendingReschedule
  notifyClient: boolean
  notifyStaff: boolean
  onToggleClient: (v: boolean) => void
  onToggleStaff: (v: boolean) => void
  saving: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { job, fromKey, toKey } = pending
  const hasClient = !!job.client_id && !!job.clients?.name
  const hasStaff = !!job.staff_id && !!job.staff?.name

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100" style={{ background: '#fdf8ee' }}>
          <h2 className="text-sm font-semibold text-gray-900">Confirm Reschedule</h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-900">{job.title ?? job.job_type ?? 'Untitled job'}</p>
            <p className="mt-1.5 text-sm text-gray-500">
              Move from <span className="font-semibold text-gray-700">{formatModalDate(fromKey)}</span> to{' '}
              <span className="font-semibold" style={{ color: '#B8922A' }}>{formatModalDate(toKey)}</span>
            </p>
          </div>

          {(hasClient || hasStaff) && (
            <div className="space-y-2.5 pt-1">
              {hasClient && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyClient}
                    onChange={(e) => onToggleClient(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: '#B8922A' }}
                  />
                  <span className="text-sm text-gray-700">Notify client of this schedule change?</span>
                </label>
              )}
              {hasStaff && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyStaff}
                    onChange={(e) => onToggleStaff(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: '#B8922A' }}
                  />
                  <span className="text-sm text-gray-700">Notify {job.staff?.name} of this schedule change?</span>
                </label>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#B8922A' }}
          >
            {saving ? 'Rescheduling…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── toast ────────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white"
        style={{ background: '#111827' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {message}
      </div>
    </div>
  )
}

// ─── main view ──────────────────────────────────────────────────────────────────

export default function ScheduleView() {
  const [view, setView] = useState<'calendar' | 'map'>('calendar')
  // MapView is mounted the first time Map View is opened and then never
  // unmounted again — only hidden via CSS when switching back to Calendar.
  // Conditionally unmounting/remounting it broke Leaflet's CDN script
  // loading: next/script's onLoad doesn't reliably re-fire for a script
  // that's already loaded elsewhere in the document, so a remounted
  // MapView would wait forever for a load event that never comes.
  const [mapEverShown, setMapEverShown] = useState(false)
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [jobs, setJobs] = useState<ScheduleJob[]>([])
  const [loading, setLoading] = useState(true)
  // Empty string on server/hydration; set client-side to avoid timezone mismatch
  const [todayKey, setTodayKey] = useState('')
  useEffect(() => { setTodayKey(toDateKey(new Date())) }, [])

  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [pendingReschedule, setPendingReschedule] = useState<PendingReschedule | null>(null)
  const [notifyClient, setNotifyClient] = useState(true)
  const [notifyStaff, setNotifyStaff] = useState(true)
  const [savingReschedule, setSavingReschedule] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const weekKey = toDateKey(weekStart)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const nextMonday = new Date(weekStart)
      nextMonday.setDate(nextMonday.getDate() + 7)

      const { data } = await supabase
        .from('jobs')
        .select('id, title, job_type, status, scheduled_date, location, client_id, staff_id, staff(name), clients(name), sites(address)')
        .gte('scheduled_date', weekKey)
        .lt('scheduled_date', toDateKey(nextMonday))
        .order('scheduled_date')

      if (!cancelled) {
        setJobs((data as unknown as ScheduleJob[]) ?? [])
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

  function handleDragStart(event: DragStartEvent) {
    setActiveJob((event.active.data.current?.job as Job | undefined) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null)
    const { active, over } = event
    if (!over) return
    const job = active.data.current?.job as Job | undefined
    if (!job) return
    const fromKey = job.scheduled_date?.split('T')[0]
    const toKey = String(over.id)
    if (!fromKey || fromKey === toKey) return
    setNotifyClient(true)
    setNotifyStaff(true)
    setPendingReschedule({ job, fromKey, toKey })
  }

  async function handleConfirmReschedule() {
    if (!pendingReschedule) return
    const { job, toKey } = pendingReschedule
    setSavingReschedule(true)

    const { error } = await supabase
      .from('jobs')
      .update({ scheduled_date: toKey })
      .eq('id', job.id)

    if (error) {
      console.error('[Reschedule] update failed:', error)
      setSavingReschedule(false)
      return
    }

    setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, scheduled_date: toKey } : j)))

    const nowIso = new Date().toISOString()
    const rows: { client_id: string | null; job_id: string; type: string; recipient: string; status: string; scheduled_for: string }[] = []
    if (notifyClient && job.client_id) {
      rows.push({ client_id: job.client_id, job_id: job.id, type: 'reschedule', recipient: 'client', status: 'pending', scheduled_for: nowIso })
    }
    if (notifyStaff && job.staff_id) {
      rows.push({ client_id: null, job_id: job.id, type: 'reschedule', recipient: 'staff', status: 'pending', scheduled_for: nowIso })
    }
    if (rows.length > 0) {
      const { error: notifErr } = await supabase.from('notifications').insert(rows)
      if (notifErr) {
        console.error(
          '[Reschedule] notification insert failed — code:', notifErr.code,
          '| message:', notifErr.message,
          '| details:', notifErr.details,
          '| hint:', notifErr.hint
        )
      }
    }

    setSavingReschedule(false)
    setPendingReschedule(null)
    setToast(`Job rescheduled to ${formatModalDate(toKey)}`)
  }

  function handleCancelReschedule() {
    setPendingReschedule(null)
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
          <div className="inline-flex rounded-md border border-gray-200 overflow-hidden shrink-0">
            {(['calendar', 'map'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); if (v === 'map') setMapEverShown(true) }}
                className="px-3.5 py-2 text-sm font-medium transition-colors"
                style={
                  view === v
                    ? { background: '#B8922A', color: '#fff' }
                    : { background: '#fff', color: '#6b7280' }
                }
              >
                {v === 'calendar' ? 'Calendar View' : 'Map View'}
              </button>
            ))}
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
      <div style={{ display: view === 'calendar' ? 'block' : 'none' }}>
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-7 divide-x divide-gray-100 bg-white">
                {days.map((day, i) => {
                  const key = toDateKey(day)
                  const dayJobs = jobsByDate[key] ?? []
                  const isToday = key === todayKey
                  return (
                    <DayColumn key={i} id={key} isToday={isToday}>
                      {dayJobs.map(job => (
                        <JobBlock key={job.id} job={job} />
                      ))}
                    </DayColumn>
                  )
                })}
              </div>
              <DragOverlay>
                {activeJob && (
                  <div
                    className="rounded-md px-2 py-1.5 border-l-[3px] shadow-lg cursor-grabbing"
                    style={{
                      background: (STATUS_BLOCK[activeJob.status ?? ''] ?? BLOCK_FALLBACK).bg,
                      borderLeftColor: (STATUS_BLOCK[activeJob.status ?? ''] ?? BLOCK_FALLBACK).border,
                    }}
                  >
                    <JobBlockContent job={activeJob} c={STATUS_BLOCK[activeJob.status ?? ''] ?? BLOCK_FALLBACK} />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
        </div>
      </div>

      {/* Map — stays mounted once opened (and across week changes) so
          Leaflet's CDN script and the map instance are never torn down and
          reinitialized; markers just update via the jobs prop instead */}
      {mapEverShown && (
        <div style={{ display: view === 'map' ? 'block' : 'none' }}>
          <MapView jobs={jobs} />
        </div>
      )}
      {!loading && jobs.length === 0 && (
        <p className="mt-6 text-center text-sm text-gray-400">
          No jobs scheduled for this week
        </p>
      )}

      {pendingReschedule && (
        <RescheduleModal
          pending={pendingReschedule}
          notifyClient={notifyClient}
          notifyStaff={notifyStaff}
          onToggleClient={setNotifyClient}
          onToggleStaff={setNotifyStaff}
          saving={savingReschedule}
          onConfirm={handleConfirmReschedule}
          onCancel={handleCancelReschedule}
        />
      )}

      {toast && <Toast message={toast} />}
    </>
  )
}
