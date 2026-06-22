'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDraggable,
  useDroppable,
  MouseSensor,
  TouchSensor,
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

function formatRange(start: Date, numWeeks: number): string {
  if (numWeeks <= 1) return formatWeekRange(start)
  const end = new Date(start)
  end.setDate(end.getDate() + numWeeks * 7 - 1)
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

function buildWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
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

// Long-press duration for the mobile "reschedule" context menu. Deliberately
// longer than dnd-kit's TouchSensor activation delay (200ms) — by the time
// this fires, dnd-kit may already be tracking a zero-movement "drag" on the
// same touch, but since the finger never moved to a different day column,
// its eventual onDragEnd is a no-op (fromKey === toKey), so the two gestures
// don't actually conflict, just briefly overlap.
const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_TOLERANCE = 10

function JobBlock({ job, onReschedule }: { job: Job; onReschedule: (job: Job) => void }) {
  const router = useRouter()
  const c = STATUS_BLOCK[job.status ?? ''] ?? BLOCK_FALLBACK
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.id,
    data: { job },
  })
  const elRef = useRef<HTMLDivElement | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // Long-press-to-reschedule on touch, attached as plain DOM listeners (not
  // JSX props) so it runs alongside dnd-kit's own onTouchStart from
  // `listeners` below instead of overwriting it.
  useEffect(() => {
    const el = elRef.current
    if (!el) return

    function clearTimer() {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0]
      if (!t) return
      touchStart.current = { x: t.clientX, y: t.clientY }
      longPressFired.current = false
      clearTimer()
      longPressTimer.current = setTimeout(() => {
        longPressFired.current = true
        onReschedule(job)
      }, LONG_PRESS_MS)
    }

    function onTouchMove(e: TouchEvent) {
      const start = touchStart.current
      const t = e.touches[0]
      if (!start || !t) return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_TOLERANCE) clearTimer()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', clearTimer)
    el.addEventListener('touchcancel', clearTimer)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', clearTimer)
      el.removeEventListener('touchcancel', clearTimer)
      clearTimer()
    }
  }, [job, onReschedule])

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    // Suppress the synthetic click a browser fires after touchend following
    // a long press — that tap was for the context menu, not navigation.
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    router.push(`/jobs/${job.id}`)
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onReschedule(job)
  }

  return (
    <div
      ref={(el) => { setNodeRef(el); elRef.current = el }}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className="cursor-pointer rounded-md px-2 py-1.5 border-l-[3px] hover:opacity-75 transition-opacity select-none"
      style={{ background: c.bg, borderLeftColor: c.border, touchAction: 'none', WebkitTouchCallout: 'none', opacity: isDragging ? 0.3 : 1 }}
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

// ─── shared notify checkboxes ────────────────────────────────────────────────

function NotifyCheckboxes({
  job, notifyClient, notifyStaff, onToggleClient, onToggleStaff,
}: {
  job: Job
  notifyClient: boolean
  notifyStaff: boolean
  onToggleClient: (v: boolean) => void
  onToggleStaff: (v: boolean) => void
}) {
  const hasClient = !!job.client_id && !!job.clients?.name
  const hasStaff = !!job.staff_id && !!job.staff?.name
  if (!hasClient && !hasStaff) return null

  return (
    <div className="space-y-1 pt-1">
      {hasClient && (
        <label className="flex items-center gap-2.5 py-2 md:py-0 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyClient}
            onChange={(e) => onToggleClient(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer shrink-0"
            style={{ accentColor: '#B8922A' }}
          />
          <span className="text-sm text-gray-700">Notify client of this schedule change?</span>
        </label>
      )}
      {hasStaff && (
        <label className="flex items-center gap-2.5 py-2 md:py-0 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyStaff}
            onChange={(e) => onToggleStaff(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer shrink-0"
            style={{ accentColor: '#B8922A' }}
          />
          <span className="text-sm text-gray-700">Notify {job.staff?.name} of this schedule change?</span>
        </label>
      )}
    </div>
  )
}

// ─── reschedule confirmation modal (drag & drop result) ──────────────────────

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0" style={{ background: '#fdf8ee' }}>
          <h2 className="text-sm font-semibold text-gray-900">Confirm Reschedule</h2>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div>
            <p className="text-sm font-medium text-gray-900">{job.title ?? job.job_type ?? 'Untitled job'}</p>
            <p className="mt-1.5 text-sm text-gray-500">
              Move from <span className="font-semibold text-gray-700">{formatModalDate(fromKey)}</span> to{' '}
              <span className="font-semibold" style={{ color: '#B8922A' }}>{formatModalDate(toKey)}</span>
            </p>
          </div>

          <NotifyCheckboxes
            job={job}
            notifyClient={notifyClient}
            notifyStaff={notifyStaff}
            onToggleClient={onToggleClient}
            onToggleStaff={onToggleStaff}
          />
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-3 md:py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="px-4 py-3 md:py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#B8922A' }}
          >
            {saving ? 'Rescheduling…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── reschedule picker modal (right-click / long-press) ──────────────────────

function ReschedulePickerModal({
  job,
  notifyClient,
  notifyStaff,
  onToggleClient,
  onToggleStaff,
  saving,
  onConfirm,
  onCancel,
}: {
  job: Job
  notifyClient: boolean
  notifyStaff: boolean
  onToggleClient: (v: boolean) => void
  onToggleStaff: (v: boolean) => void
  saving: boolean
  onConfirm: (newDateKey: string) => void
  onCancel: () => void
}) {
  const currentKey = job.scheduled_date?.split('T')[0] ?? toDateKey(new Date())
  const [dateKey, setDateKey] = useState(currentKey)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0" style={{ background: '#fdf8ee' }}>
          <h2 className="text-sm font-semibold text-gray-900">Reschedule Job</h2>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div>
            <p className="text-sm font-medium text-gray-900">{job.title ?? job.job_type ?? 'Untitled job'}</p>
            <p className="mt-1.5 text-sm text-gray-500">
              Currently scheduled for <span className="font-semibold text-gray-700">{formatModalDate(currentKey)}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">New date</label>
            <input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#B8922A] bg-white"
            />
          </div>

          <NotifyCheckboxes
            job={job}
            notifyClient={notifyClient}
            notifyStaff={notifyStaff}
            onToggleClient={onToggleClient}
            onToggleStaff={onToggleStaff}
          />
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-3 md:py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(dateKey)}
            disabled={saving || dateKey === currentKey}
            className="px-4 py-3 md:py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60 disabled:hover:opacity-60"
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
  const [viewLength, setViewLength] = useState<'1week' | '2weeks'>('1week')
  const numWeeks = viewLength === '2weeks' ? 2 : 1
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [jobs, setJobs] = useState<ScheduleJob[]>([])
  const [loading, setLoading] = useState(true)
  // Empty string on server/hydration; set client-side to avoid timezone mismatch
  const [todayKey, setTodayKey] = useState('')
  useEffect(() => { setTodayKey(toDateKey(new Date())) }, [])

  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [pendingReschedule, setPendingReschedule] = useState<PendingReschedule | null>(null)
  const [contextMenuJob, setContextMenuJob] = useState<Job | null>(null)
  const [notifyClient, setNotifyClient] = useState(true)
  const [notifyStaff, setNotifyStaff] = useState(true)
  const [savingReschedule, setSavingReschedule] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  // MouseSensor (not PointerSensor, which also listens to touch and would
  // race the TouchSensor below) starts a drag after a small mouse movement.
  // TouchSensor needs a brief press-and-hold with a movement tolerance, so a
  // quick tap on a job block still opens it instead of being swallowed as an
  // accidental drag.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

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
      const rangeEnd = new Date(weekStart)
      rangeEnd.setDate(rangeEnd.getDate() + numWeeks * 7)

      const { data } = await supabase
        .from('jobs')
        .select('id, title, job_type, status, scheduled_date, location, client_id, staff_id, staff(name), clients(name), sites(address)')
        .gte('scheduled_date', weekKey)
        .lt('scheduled_date', toDateKey(rangeEnd))
        .order('scheduled_date')

      if (!cancelled) {
        setJobs((data as unknown as ScheduleJob[]) ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, numWeeks])

  const weekStarts = Array.from({ length: numWeeks }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i * 7)
    return d
  })

  const jobsByDate = jobs.reduce<Record<string, Job[]>>((acc, job) => {
    const key = job.scheduled_date?.split('T')[0]
    if (!key) return acc
    if (!acc[key]) acc[key] = []
    acc[key].push(job)
    return acc
  }, {})

  function shiftRange(delta: number) {
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

  function openReschedulePicker(job: Job) {
    setNotifyClient(true)
    setNotifyStaff(true)
    setContextMenuJob(job)
  }

  // Shared by both the drag-and-drop confirm flow and the right-click/long-press
  // date-picker flow — same DB update, same notification queueing, same toast.
  async function applyReschedule(job: Job, toKey: string) {
    const { error } = await supabase
      .from('jobs')
      .update({ scheduled_date: toKey })
      .eq('id', job.id)

    if (error) {
      console.error('[Reschedule] update failed:', error)
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

    setToast(`Job rescheduled to ${formatModalDate(toKey)}`)
  }

  async function handleConfirmReschedule() {
    if (!pendingReschedule) return
    setSavingReschedule(true)
    await applyReschedule(pendingReschedule.job, pendingReschedule.toKey)
    setSavingReschedule(false)
    setPendingReschedule(null)
  }

  function handleCancelReschedule() {
    setPendingReschedule(null)
  }

  async function handleConfirmPickerReschedule(newDateKey: string) {
    if (!contextMenuJob) return
    setSavingReschedule(true)
    await applyReschedule(contextMenuJob, newDateKey)
    setSavingReschedule(false)
    setContextMenuJob(null)
  }

  function handleCancelPickerReschedule() {
    setContextMenuJob(null)
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Schedule</h1>
          <p className="mt-0.5 text-sm text-gray-500">{formatRange(weekStart, numWeeks)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="px-3 py-3 sm:py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center rounded-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => shiftRange(-numWeeks * 7)}
              className="p-3.5 sm:p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors border-r border-gray-200"
              aria-label="Previous period"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => shiftRange(numWeeks * 7)}
              className="p-3.5 sm:p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="Next period"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
          <div className="inline-flex rounded-md border border-gray-200 overflow-hidden shrink-0">
            {(['1week', '2weeks'] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewLength(v)}
                className="px-3.5 py-3 sm:py-2 text-sm font-medium transition-colors"
                style={
                  viewLength === v
                    ? { background: '#B8922A', color: '#fff' }
                    : { background: '#fff', color: '#6b7280' }
                }
              >
                {v === '1week' ? '1 Week' : '2 Weeks'}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-md border border-gray-200 overflow-hidden shrink-0">
            {(['calendar', 'map'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); if (v === 'map') setMapEverShown(true) }}
                className="px-3.5 py-3 sm:py-2 text-sm font-medium transition-colors"
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
          { label: viewLength === '2weeks' ? 'Jobs These 2 Weeks' : 'Jobs This Week', value: String(jobs.length) },
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {weekStarts.map((ws, wi) => {
              const weekDays = buildWeekDays(ws)
              return (
                <div key={wi}>
                  {wi > 0 && (
                    <div className="px-3 py-1.5 border-t border-b border-gray-100" style={{ background: '#fafafa' }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Week {wi + 1} — {formatWeekRange(ws)}
                      </p>
                    </div>
                  )}

                  {/* Day headers */}
                  <div className="grid grid-cols-7 border-b border-gray-100">
                    {weekDays.map((day, i) => {
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
                      {weekDays.map((day, i) => {
                        const key = toDateKey(day)
                        const dayJobs = jobsByDate[key] ?? []
                        const isToday = key === todayKey
                        return (
                          <DayColumn key={i} id={key} isToday={isToday}>
                            {dayJobs.map(job => (
                              <JobBlock key={job.id} job={job} onReschedule={openReschedulePicker} />
                            ))}
                          </DayColumn>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
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
          No jobs scheduled for this {viewLength === '2weeks' ? 'period' : 'week'}
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

      {contextMenuJob && (
        <ReschedulePickerModal
          job={contextMenuJob}
          notifyClient={notifyClient}
          notifyStaff={notifyStaff}
          onToggleClient={setNotifyClient}
          onToggleStaff={setNotifyStaff}
          saving={savingReschedule}
          onConfirm={handleConfirmPickerReschedule}
          onCancel={handleCancelPickerReschedule}
        />
      )}

      {toast && <Toast message={toast} />}
    </>
  )
}
