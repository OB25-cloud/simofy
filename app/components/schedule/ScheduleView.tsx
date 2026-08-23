'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Job, Staff, Client } from '@/lib/types'
import { DEFAULT_START_TIME, DEFAULT_END_TIME, TIME_OPTIONS, formatTime } from '@/lib/timeOptions'
import MapView, { type ScheduleJob } from './MapView'
import AddJobModal from '@/app/components/jobs/AddJobModal'
import DayTimeGrid, { type DragReschedulePayload } from './DayTimeGrid'
import WeekGrid, { type WeekDragReschedulePayload } from './WeekGrid'
import JobDetailPanel from './JobDetailPanel'
import { UNASSIGNED_KEY, colorForStatus, STATUS_LABELS } from './scheduleColors'
import { StatCard } from '@/app/components/ui/StatCard'

// ─── date helpers ───────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfDay(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6) // Mon–Sun
  const opts: Intl.DateTimeFormatOptions = { month: 'long' }
  const startMonth = start.toLocaleDateString('en-NZ', opts)
  const endMonth = end.toLocaleDateString('en-NZ', opts)
  const year = end.getFullYear()
  if (startMonth === endMonth) {
    return `${start.getDate()} – ${end.getDate()} ${startMonth} ${year}`
  }
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${year}`
}

function formatModalDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-NZ', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// Mon–Sun, 7 days.
function buildWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

function jobTimes(job: Job): { start: string; end: string } {
  return {
    start: job.start_time?.slice(0, 5) ?? DEFAULT_START_TIME,
    end: job.end_time?.slice(0, 5) ?? DEFAULT_END_TIME,
  }
}

// ─── shared notify checkboxes ────────────────────────────────────────────────

function NotifyCheckboxes({
  clientName, staffName, notifyClient, notifyStaff, onToggleClient, onToggleStaff,
}: {
  clientName: string | null
  staffName: string | null
  notifyClient: boolean
  notifyStaff: boolean
  onToggleClient: (v: boolean) => void
  onToggleStaff: (v: boolean) => void
}) {
  if (!clientName && !staffName) return null

  return (
    <div className="space-y-1 pt-1">
      {clientName && (
        <label className="flex items-center gap-2.5 py-2 md:py-0 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyClient}
            onChange={(e) => onToggleClient(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer shrink-0"
            style={{ accentColor: '#C9A84C' }}
          />
          <span className="text-sm text-[#6B7280]">Notify client of this schedule change?</span>
        </label>
      )}
      {staffName && (
        <label className="flex items-center gap-2.5 py-2 md:py-0 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyStaff}
            onChange={(e) => onToggleStaff(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer shrink-0"
            style={{ accentColor: '#C9A84C' }}
          />
          <span className="text-sm text-[#6B7280]">Notify {staffName} of this schedule change?</span>
        </label>
      )}
    </div>
  )
}

// ─── reschedule confirmation modal (drag & drop result) ──────────────────────

// ─── reschedule picker modal (right-click / long-press) ──────────────────────

function ReschedulePickerModal({
  job, showTime, notifyClient, notifyStaff, onToggleClient, onToggleStaff, saving, onConfirm, onCancel,
}: {
  job: Job
  showTime: boolean
  notifyClient: boolean
  notifyStaff: boolean
  onToggleClient: (v: boolean) => void
  onToggleStaff: (v: boolean) => void
  saving: boolean
  onConfirm: (newDateKey: string, newStartTime: string, newEndTime: string) => void
  onCancel: () => void
}) {
  const currentKey = job.scheduled_date?.split('T')[0] ?? toDateKey(new Date())
  const { start: currentStart, end: currentEnd } = jobTimes(job)
  const [dateKey, setDateKey] = useState(currentKey)
  const [startTime, setStartTime] = useState(currentStart)
  const [endTime, setEndTime] = useState(currentEnd)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const unchanged = dateKey === currentKey && (!showTime || (startTime === currentStart && endTime === currentEnd))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#E5E7EB] shrink-0" style={{ background: 'rgba(201, 168, 76,0.12)' }}>
          <h2 className="text-sm font-semibold text-[#1A1A2E]">Reschedule Job</h2>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div>
            <p className="text-sm font-medium text-[#1A1A2E]">{job.title ?? job.job_type ?? 'Untitled job'}</p>
            <p className="mt-1.5 text-sm text-[#6B7280]">
              Currently {formatModalDate(currentKey)}{showTime && <> · {formatTime(currentStart)} – {formatTime(currentEnd)}</>}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">New date</label>
            <input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent bg-white"
            />
          </div>

          {showTime && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Start Time</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-md px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent bg-white"
                >
                  {TIME_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1.5">End Time</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-md px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent bg-white"
                >
                  {TIME_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          )}

          <NotifyCheckboxes
            clientName={job.client_id && job.clients?.name ? job.clients.name : null}
            staffName={job.staff_id && job.staff?.name ? job.staff.name : null}
            notifyClient={notifyClient}
            notifyStaff={notifyStaff}
            onToggleClient={onToggleClient}
            onToggleStaff={onToggleStaff}
          />
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-3 md:py-2 text-sm bg-white border border-[#E5E7EB] text-[#1A1A2E] rounded-lg hover:bg-[#F4F5F7] transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(dateKey, startTime, endTime)}
            disabled={saving || unchanged}
            className="px-4 py-3 md:py-2 text-sm font-medium text-[#1A1A2E] font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60 disabled:hover:opacity-60"
            style={{ background: '#C9A84C' }}
          >
            {saving ? 'Rescheduling…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onUndo }: { message: string; onUndo?: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className="flex items-center gap-3 pl-4 pr-2 py-3 rounded-lg shadow-lg text-sm font-medium text-white"
        style={{ background: '#1A1A2E' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{message}</span>
        {onUndo && (
          <button
            onClick={onUndo}
            className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-md hover:bg-white/10 transition-colors"
            style={{ color: '#C9A84C' }}
          >
            Undo
          </button>
        )}
      </div>
    </div>
  )
}

// ─── grid loading / error states ───────────────────────────────────────────────
// Shared by the Day grid, Week grid and mobile list so a slow or failed fetch
// always shows something intentional instead of an empty/half-built layout.

function GridLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-lg" style={{ background: '#1A1A2E' }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <p className="text-sm text-gray-500">Loading schedule…</p>
    </div>
  )
}

function GridError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center rounded-lg" style={{ background: '#1A1A2E' }}>
      <button
        onClick={onRetry}
        className="flex flex-col items-center gap-2 px-6 py-4 text-center hover:opacity-90 transition-opacity"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-sm font-medium text-white">Something went wrong — click to refresh</span>
      </button>
    </div>
  )
}

// ─── mobile list view ─────────────────────────────────────────────────────────
// "On mobile switch to a simple list view of today's jobs sorted by time" —
// always today, regardless of which day/week is selected in the desktop grid.

function MobileJobList({ jobs, todayKey, onOpen }: { jobs: Job[]; todayKey: string; onOpen: (job: Job) => void }) {
  const todaysJobs = useMemo(
    () => jobs
      .filter(j => j.scheduled_date?.split('T')[0] === todayKey)
      .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
    [jobs, todayKey],
  )

  if (todaysJobs.length === 0) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-white py-12 text-center">
        <p className="text-sm text-[#6B7280]">No jobs scheduled for today</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm divide-y divide-[#F4F5F7]">
      {todaysJobs.map(job => {
        const color = colorForStatus(job.status)
        return (
          <button
            key={job.id}
            onClick={() => onOpen(job)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors"
          >
            <span className="shrink-0 w-1 h-10 rounded-full" style={{ background: color.solid }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#1A1A2E] truncate">{job.title ?? job.job_type ?? 'Untitled'}</p>
              <p className="text-xs text-[#6B7280] truncate mt-0.5">
                {formatTime(job.start_time)} · {job.clients?.name ?? 'No client'} · {job.staff?.name ?? 'Unassigned'}
              </p>
            </div>
            <span
              className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${color.solid}1F`, color: color.solid }}
            >
              {STATUS_LABELS[job.status ?? ''] ?? 'Pending'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── main view ──────────────────────────────────────────────────────────────────

type AddJobPrefill = { staffId: string; date: string; startTime?: string; endTime?: string }

export default function ScheduleView() {
  const [view, setView] = useState<'day' | 'week' | 'map'>('day')
  const [gridMode, setGridMode] = useState<'day' | 'week'>('day')
  // MapView is mounted the first time Map View is opened and then never
  // unmounted again — only hidden via CSS when switching back to the grid.
  // Conditionally unmounting/remounting it broke Leaflet's CDN script
  // loading: next/script's onLoad doesn't reliably re-fire for a script
  // that's already loaded elsewhere in the document, so a remounted
  // MapView would wait forever for a load event that never comes.
  const [mapEverShown, setMapEverShown] = useState(false)
  const [dayDate, setDayDate] = useState<Date>(() => startOfDay(new Date()))
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [jobs, setJobs] = useState<ScheduleJob[]>([])
  const [staffList, setStaffList] = useState<Pick<Staff, 'id' | 'name'>[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'business_name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryTick, setRetryTick] = useState(0)
  const [todayKey, setTodayKey] = useState('')
  useEffect(() => { setTodayKey(toDateKey(new Date())) }, [])

  const [contextMenuJob, setContextMenuJob] = useState<Job | null>(null)
  const [notifyClient, setNotifyClient] = useState(true)
  const [notifyStaff, setNotifyStaff] = useState(true)
  const [savingReschedule, setSavingReschedule] = useState(false)
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null)
  const [addJobPrefill, setAddJobPrefill] = useState<AddJobPrefill | null>(null)
  const [detailJob, setDetailJob] = useState<ScheduleJob | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const isDayMode = view === 'map' ? gridMode === 'day' : view === 'day'
  const dayKey = toDateKey(dayDate)
  const weekKey = toDateKey(weekStart)

  // Staff + clients rarely change and don't depend on the selected
  // day/week, so they're only fetched once — but that fetch is folded into
  // the same effect/load cycle as the jobs query (via Promise.all) rather
  // than living in its own separate effect. Two independent effects
  // resolving at different times was exactly the "half-loaded" bug: the
  // jobs fetch could finish (loading -> false, grid renders) while
  // staff/clients were still in flight, or either fetch's error was
  // silently swallowed (data defaulted to []), rendering an empty-looking
  // grid with no indication anything had gone wrong.
  const staffClientsLoadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(false)
      const rangeStart = isDayMode ? dayKey : weekKey
      const rangeEnd = isDayMode ? addDays(dayDate, 1) : addDays(weekStart, 7)
      const needsStaffClients = !staffClientsLoadedRef.current

      const [jobsResult, staffResult, clientResult] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, title, job_type, status, scheduled_date, start_time, end_time, location, client_id, staff_id, staff(name), clients(name), sites(address)')
          .gte('scheduled_date', rangeStart)
          .lt('scheduled_date', toDateKey(rangeEnd))
          .order('scheduled_date'),
        needsStaffClients
          ? supabase.from('staff').select('id, name').eq('is_active', true).order('name')
          : Promise.resolve(null),
        needsStaffClients
          ? supabase.from('clients').select('id, name, business_name').order('name')
          : Promise.resolve(null),
      ])

      if (cancelled) return

      if (jobsResult.error || staffResult?.error || clientResult?.error) {
        console.error('[Schedule] load failed:', jobsResult.error ?? staffResult?.error ?? clientResult?.error)
        setLoadError(true)
        setLoading(false)
        return
      }

      setJobs((jobsResult.data as unknown as ScheduleJob[]) ?? [])
      if (needsStaffClients) {
        setStaffList(staffResult?.data ?? [])
        setClients(clientResult?.data ?? [])
        staffClientsLoadedRef.current = true
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDayMode, dayKey, weekKey, retryTick])

  const weekDays = buildWeekDays(weekStart)

  const staffRows = useMemo(() => {
    const map = new Map<string, string>()
    staffList.forEach(s => map.set(s.id, s.name))
    jobs.forEach(j => {
      if (j.staff_id && j.staff?.name && !map.has(j.staff_id)) map.set(j.staff_id, j.staff.name)
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [staffList, jobs])

  const hasUnassigned = jobs.some(j => !j.staff_id)

  // Safety filter: if a job's date moved out of the displayed day (e.g. via the
  // reschedule picker), it must not linger in the Day grid using stale geometry.
  const dayJobs = useMemo(() => jobs.filter(j => j.scheduled_date?.split('T')[0] === dayKey), [jobs, dayKey])

  function resolveStaffKey(key: string): { id: string | null; name: string } {
    if (key === UNASSIGNED_KEY) return { id: null, name: 'Unassigned' }
    return { id: key, name: staffRows.find(s => s.id === key)?.name ?? 'Unassigned' }
  }

  function handleRetry() {
    setRetryTick(t => t + 1)
  }

  function goPrev() {
    if (isDayMode) setDayDate(d => addDays(d, -1))
    else setWeekStart(d => addDays(d, -7))
  }
  function goNext() {
    if (isDayMode) setDayDate(d => addDays(d, 1))
    else setWeekStart(d => addDays(d, 7))
  }
  function goToday() {
    setDayDate(startOfDay(new Date()))
    setWeekStart(getMonday(new Date()))
  }
  function jumpToDay(date: Date) {
    setDayDate(startOfDay(date))
    setView('day')
    setGridMode('day')
  }

  function openReschedulePicker(job: Job) {
    setNotifyClient(true)
    setNotifyStaff(true)
    setContextMenuJob(job)
  }

  // Drag-and-drop applies immediately — no confirmation modal — since a
  // toast with Undo covers the same "did I mean to do that?" need with far
  // less friction for something done many times a day.
  function handleWeekDragReschedule({ job, toStaffKey, toDateKey: toDateKeyStr }: WeekDragReschedulePayload) {
    const to = resolveStaffKey(toStaffKey)
    const { start, end } = jobTimes(job)
    applyReschedule(job, toDateKeyStr, start, end, to.id, to.name, true, true)
  }

  function handleDayDragReschedule({ job, toStaffKey, newStartTime, newEndTime }: DragReschedulePayload) {
    const to = resolveStaffKey(toStaffKey)
    applyReschedule(job, dayKey, newStartTime, newEndTime, to.id, to.name, true, true)
  }

  // Reverts a reschedule (from the toast's Undo button) — same DB update
  // shape as applyReschedule, but silent: no notifications queued, no
  // follow-up toast beyond a small confirmation.
  async function revertReschedule(
    jobId: string,
    prev: { scheduledDate: string | undefined; startTime: string; endTime: string; staffId: string | null; staffName: string },
  ) {
    const { error } = await supabase
      .from('jobs')
      .update({ scheduled_date: prev.scheduledDate, start_time: prev.startTime, end_time: prev.endTime, staff_id: prev.staffId })
      .eq('id', jobId)

    if (error) {
      console.error('[Reschedule] undo failed:', error)
      return
    }

    setJobs(prevJobs => prevJobs.map(j => (
      j.id === jobId
        ? {
          ...j, scheduled_date: prev.scheduledDate ?? null, start_time: prev.startTime, end_time: prev.endTime, staff_id: prev.staffId,
          staff: prev.staffId ? { name: prev.staffName, pay_rate: j.staff?.pay_rate ?? null } : null,
        }
        : j
    )))
    setToast({ message: 'Reschedule undone' })
  }

  // Shared by the drag-and-drop flow and the right-click/long-press picker
  // flow — same DB update, same notification queueing, same toast (with an
  // Undo button that restores exactly what this call is about to change).
  async function applyReschedule(
    job: Job, toDateKey: string, toStartTime: string, toEndTime: string, toStaffId: string | null, toStaffName: string,
    notifyClientFlag: boolean, notifyStaffFlag: boolean,
  ) {
    const fromDateKey = job.scheduled_date?.split('T')[0]
    const { start: fromStart, end: fromEnd } = jobTimes(job)
    const fromStaffId = job.staff_id
    const fromStaffName = job.staff?.name ?? 'Unassigned'

    const { error } = await supabase
      .from('jobs')
      .update({ scheduled_date: toDateKey, start_time: toStartTime, end_time: toEndTime, staff_id: toStaffId })
      .eq('id', job.id)

    if (error) {
      console.error('[Reschedule] update failed:', error)
      setToast({ message: 'Failed to reschedule job' })
      return
    }

    setJobs(prev => prev.map(j => (
      j.id === job.id
        ? {
          ...j, scheduled_date: toDateKey, start_time: toStartTime, end_time: toEndTime, staff_id: toStaffId,
          staff: toStaffId ? { name: toStaffName, pay_rate: j.staff?.pay_rate ?? null } : null,
        }
        : j
    )))

    const nowIso = new Date().toISOString()
    const rows: { client_id: string | null; job_id: string; type: string; recipient: string; status: string; scheduled_for: string }[] = []
    if (notifyClientFlag && job.client_id) {
      rows.push({ client_id: job.client_id, job_id: job.id, type: 'reschedule', recipient: 'client', status: 'pending', scheduled_for: nowIso })
    }
    if (notifyStaffFlag && toStaffId) {
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

    const jobLabel = job.title ?? job.job_type ?? 'Job'
    let message: string
    if (fromDateKey !== toDateKey) message = `${jobLabel} rescheduled to ${formatModalDate(toDateKey)}`
    else if (fromStart !== toStartTime) message = `${jobLabel} moved to ${formatTime(toStartTime)}`
    else if ((fromStaffId ?? null) !== toStaffId) message = `${jobLabel} reassigned to ${toStaffName}`
    else message = `${jobLabel} updated`

    setToast({
      message,
      undo: () => revertReschedule(job.id, {
        scheduledDate: fromDateKey, startTime: fromStart, endTime: fromEnd, staffId: fromStaffId, staffName: fromStaffName,
      }),
    })
  }

  async function handleConfirmPickerReschedule(newDateKey: string, newStartTime: string, newEndTime: string) {
    if (!contextMenuJob) return
    setSavingReschedule(true)
    await applyReschedule(
      contextMenuJob, newDateKey, newStartTime, newEndTime, contextMenuJob.staff_id, contextMenuJob.staff?.name ?? '',
      notifyClient, notifyStaff,
    )
    setSavingReschedule(false)
    setContextMenuJob(null)
  }

  function handleCancelPickerReschedule() {
    setContextMenuJob(null)
  }

  const headerLabel = isDayMode
    ? dayDate.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : formatWeekRange(weekStart)

  const completedTodayCount = jobs.filter(j => j.status === 'complete' && j.scheduled_date?.split('T')[0] === todayKey).length

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="shrink-0 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Schedule</h1>
          <p className="mt-1 text-xs text-[#6B7280]">{headerLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={goToday}
            className="px-3 py-3 sm:py-1.5 text-sm bg-white border border-[#E5E7EB] text-[#1A1A2E] rounded-lg hover:bg-[#F4F5F7] transition-colors"
          >
            Today
          </button>
          <div className="flex items-center rounded-md border border-[#E5E7EB] overflow-hidden">
            <button
              onClick={goPrev}
              className="p-3.5 sm:p-1.5 text-[#6B7280] hover:text-[#1A1A2E] hover:bg-[#F9FAFB] transition-colors border-r border-[#E5E7EB]"
              aria-label={isDayMode ? 'Previous day' : 'Previous week'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={goNext}
              className="p-3.5 sm:p-1.5 text-[#6B7280] hover:text-[#1A1A2E] hover:bg-[#F9FAFB] transition-colors"
              aria-label={isDayMode ? 'Next day' : 'Next week'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
          <div className="inline-flex rounded-md border border-[#E5E7EB] overflow-hidden shrink-0">
            {(['day', 'week', 'map'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); if (v !== 'map') setGridMode(v); if (v === 'map') setMapEverShown(true) }}
                className={[
                  'px-3.5 py-3 sm:py-2 text-sm transition-colors',
                  view === v ? 'bg-[#C9A84C] text-[#1A1A2E] font-semibold' : 'bg-white text-[#6B7280] hover:bg-[#F4F5F7]',
                ].join(' ')}
              >
                {v === 'day' ? 'Day' : v === 'week' ? 'Week' : 'Map View'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label={isDayMode ? "Today's Jobs" : "This Week's Jobs"} value={String(jobs.length)} />
        <StatCard label="Staff Scheduled" value={String(staffRows.length)} />
        <StatCard
          label="Unassigned"
          value={String(jobs.filter(j => !j.staff_id).length)}
          danger={hasUnassigned}
        />
        <StatCard label="Completed Today" value={String(completedTodayCount)} />
      </div>

      {/* Desktop grid / week / map — hidden on mobile in favour of the simple list below */}
      <div className="hidden md:flex flex-1 min-h-0 flex-col">
        {/* Day grid */}
        <div className="flex-1 min-h-0 flex-col" style={{ display: view === 'day' ? 'flex' : 'none' }}>
          {loading ? (
            <GridLoading />
          ) : loadError ? (
            <GridError onRetry={handleRetry} />
          ) : (
            <DayTimeGrid
              // Remounts on date navigation so all of the grid's internal
              // state — staff column pagination, hover card, active drag —
              // starts clean rather than carrying over stale state (e.g. a
              // staff page index) from whatever day was viewed before.
              key={dayKey}
              jobs={dayJobs}
              staffRows={staffRows}
              isToday={dayKey === todayKey}
              onOpenDetail={setDetailJob}
              onReschedulePicker={openReschedulePicker}
              onEmptySlotClick={(staffKey, startTime, endTime) => setAddJobPrefill({
                staffId: staffKey === UNASSIGNED_KEY ? '' : staffKey, date: dayKey, startTime, endTime,
              })}
              onDragReschedule={handleDayDragReschedule}
            />
          )}
        </div>

        {/* Week grid */}
        <div className="flex-1 min-h-0 flex-col" style={{ display: view === 'week' ? 'flex' : 'none' }}>
          {loading ? (
            <GridLoading />
          ) : loadError ? (
            <GridError onRetry={handleRetry} />
          ) : (
            <WeekGrid
              jobs={jobs}
              weekDays={weekDays}
              todayKey={todayKey}
              toDateKey={toDateKey}
              onOpenDetail={setDetailJob}
              onReschedulePicker={openReschedulePicker}
              onJumpToDay={jumpToDay}
              onEmptyDayClick={(dateKeyStr) => setAddJobPrefill({ staffId: '', date: dateKeyStr })}
              onDragReschedule={handleWeekDragReschedule}
            />
          )}
        </div>

        {/* Map — stays mounted once opened (and across date changes) so
            Leaflet's CDN script and the map instance are never torn down and
            reinitialized; markers just update via the jobs prop instead */}
        {mapEverShown && (
          <div className="flex-1 min-h-0 flex-col" style={{ display: view === 'map' ? 'flex' : 'none' }}>
            <MapView jobs={jobs} />
          </div>
        )}
      </div>

      {/* Mobile — simple list of today's jobs, sorted by time */}
      <div className="md:hidden flex-1 min-h-0 overflow-y-auto flex flex-col">
        {loading ? (
          <GridLoading />
        ) : loadError ? (
          <GridError onRetry={handleRetry} />
        ) : (
          <MobileJobList jobs={jobs} todayKey={todayKey} onOpen={setDetailJob} />
        )}
      </div>

      {addJobPrefill && (
        <AddJobModal
          clients={clients}
          staff={staffList}
          initialStaffId={addJobPrefill.staffId}
          initialDate={addJobPrefill.date}
          initialStartTime={addJobPrefill.startTime}
          initialEndTime={addJobPrefill.endTime}
          onClose={() => setAddJobPrefill(null)}
        />
      )}

      {contextMenuJob && (
        <ReschedulePickerModal
          job={contextMenuJob}
          showTime={isDayMode}
          notifyClient={notifyClient}
          notifyStaff={notifyStaff}
          onToggleClient={setNotifyClient}
          onToggleStaff={setNotifyStaff}
          saving={savingReschedule}
          onConfirm={handleConfirmPickerReschedule}
          onCancel={handleCancelPickerReschedule}
        />
      )}

      {detailJob && <JobDetailPanel job={detailJob} onClose={() => setDetailJob(null)} />}

      {toast && <Toast message={toast.message} onUndo={toast.undo} />}
    </div>
  )
}
