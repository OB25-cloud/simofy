'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Job, Staff, Client } from '@/lib/types'
import { DEFAULT_START_TIME, DEFAULT_END_TIME, TIME_OPTIONS, formatTime } from '@/lib/timeOptions'
import MapView, { type ScheduleJob } from './MapView'
import AddJobModal from '@/app/components/jobs/AddJobModal'
import DayTimeGrid, { type DragReschedulePayload } from './DayTimeGrid'
import WeekGrid, { type WeekDragReschedulePayload } from './WeekGrid'
import { UNASSIGNED_KEY } from './scheduleColors'
import { StatCard } from '@/app/components/ui/StatCard'

// ─── status colours (hover-tooltip status badge only) ────────────────────────

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  pending:     { bg: '#F4F5F7', text: '#6B7280' },
  scheduled:   { bg: '#dbeafe', text: '#1e40af' },
  in_progress: { bg: '#fdf0d5', text: '#92400e' },
  complete:    { bg: '#DCFCE7', text: '#15803D' },
  invoiced:    { bg: '#ede9fe', text: '#5b21b6' },
  cancelled:   { bg: '#fee2e2', text: '#b91c1c' },
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  complete: 'Complete',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
}

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
  const end = addDays(start, 5) // Mon–Sat
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

function buildWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
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

type PendingReschedule = {
  job: Job
  fromDateKey: string
  toDateKey: string
  fromStaffId: string | null
  toStaffId: string | null
  fromStaffName: string
  toStaffName: string
  fromStartTime: string
  toStartTime: string
  fromEndTime: string
  toEndTime: string
}

function RescheduleModal({
  pending, notifyClient, notifyStaff, onToggleClient, onToggleStaff, saving, onConfirm, onCancel,
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

  const {
    job, fromDateKey, toDateKey, fromStaffId, toStaffId, fromStaffName, toStaffName,
    fromStartTime, toStartTime, fromEndTime, toEndTime,
  } = pending
  const dateChanged = fromDateKey !== toDateKey
  const staffChanged = fromStaffId !== toStaffId
  const timeChanged = fromStartTime !== toStartTime || fromEndTime !== toEndTime

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#E5E7EB] shrink-0" style={{ background: 'rgba(201, 168, 76,0.12)' }}>
          <h2 className="text-sm font-semibold text-[#1A1A2E]">Confirm Reschedule</h2>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-[#1A1A2E]">{job.title ?? job.job_type ?? 'Untitled job'}</p>
            {dateChanged && (
              <p className="text-sm text-[#6B7280]">
                Move from <span className="font-semibold text-[#6B7280]">{formatModalDate(fromDateKey)}</span> to{' '}
                <span className="font-semibold" style={{ color: '#C9A84C' }}>{formatModalDate(toDateKey)}</span>
              </p>
            )}
            {timeChanged && (
              <p className="text-sm text-[#6B7280]">
                Change time from{' '}
                <span className="font-semibold text-[#6B7280]">{formatTime(fromStartTime)} – {formatTime(fromEndTime)}</span> to{' '}
                <span className="font-semibold" style={{ color: '#C9A84C' }}>{formatTime(toStartTime)} – {formatTime(toEndTime)}</span>
              </p>
            )}
            {staffChanged && (
              <p className="text-sm text-[#6B7280]">
                Reassign from <span className="font-semibold text-[#6B7280]">{fromStaffName}</span> to{' '}
                <span className="font-semibold" style={{ color: '#C9A84C' }}>{toStaffName}</span>
              </p>
            )}
          </div>

          <NotifyCheckboxes
            clientName={job.client_id && job.clients?.name ? job.clients.name : null}
            staffName={toStaffId && toStaffName ? toStaffName : null}
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
            onClick={onConfirm}
            disabled={saving}
            className="px-4 py-3 md:py-2 text-sm font-medium text-[#1A1A2E] font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: '#C9A84C' }}
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

// ─── glass tooltip ────────────────────────────────────────────────────────────

function JobTooltip({ job, x, y }: { job: Job; x: number; y: number }) {
  const badge = STATUS_BADGE[job.status ?? ''] ?? STATUS_BADGE.pending
  const label = STATUS_LABEL[job.status ?? ''] ?? job.status ?? 'Pending'

  return (
    <div
      className="fixed z-[60] pointer-events-none w-64 rounded-lg bg-[#1A1A2E] text-white px-3.5 py-3 text-xs"
      style={{
        left: x + 14,
        top: y + 14,
        border: '1px solid rgba(96,165,250,0.25)',
        boxShadow: '0 0 24px rgba(59,130,246,0.25), 0 10px 30px rgba(0,0,0,0.45)',
      }}
    >
      <p className="text-sm font-semibold mb-1.5">{job.title ?? job.job_type ?? 'Untitled job'}</p>
      <span
        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2"
        style={{ background: badge.bg, color: badge.text }}
      >
        {label}
      </span>
      <div className="space-y-1 text-gray-300">
        {job.clients?.name && <p><span className="text-[#6B7280]">Client:</span> {job.clients.name}</p>}
        {job.job_type && <p><span className="text-[#6B7280]">Type:</span> {job.job_type}</p>}
        {job.location && <p><span className="text-[#6B7280]">Location:</span> {job.location}</p>}
        {job.scheduled_date && (
          <p><span className="text-[#6B7280]">Scheduled:</span> {formatModalDate(job.scheduled_date.split('T')[0])}</p>
        )}
        {job.start_time && job.end_time && (
          <p><span className="text-[#6B7280]">Time:</span> {formatTime(job.start_time)} – {formatTime(job.end_time)}</p>
        )}
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
        style={{ background: '#1A1A2E' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {message}
      </div>
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
  const [todayKey, setTodayKey] = useState('')
  useEffect(() => { setTodayKey(toDateKey(new Date())) }, [])

  const [pendingReschedule, setPendingReschedule] = useState<PendingReschedule | null>(null)
  const [contextMenuJob, setContextMenuJob] = useState<Job | null>(null)
  const [notifyClient, setNotifyClient] = useState(true)
  const [notifyStaff, setNotifyStaff] = useState(true)
  const [savingReschedule, setSavingReschedule] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [addJobPrefill, setAddJobPrefill] = useState<AddJobPrefill | null>(null)
  const [hoverTooltip, setHoverTooltip] = useState<{ job: Job; x: number; y: number } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    async function loadStaffAndClients() {
      const [{ data: staffData }, { data: clientData }] = await Promise.all([
        supabase.from('staff').select('id, name').eq('is_active', true).order('name'),
        supabase.from('clients').select('id, name, business_name').order('name'),
      ])
      setStaffList(staffData ?? [])
      setClients(clientData ?? [])
    }
    loadStaffAndClients()
  }, [])

  const isDayMode = view === 'map' ? gridMode === 'day' : view === 'day'
  const dayKey = toDateKey(dayDate)
  const weekKey = toDateKey(weekStart)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const rangeStart = isDayMode ? dayKey : weekKey
      const rangeEnd = isDayMode ? addDays(dayDate, 1) : addDays(weekStart, 6)

      const { data } = await supabase
        .from('jobs')
        .select('id, title, job_type, status, scheduled_date, start_time, end_time, location, client_id, staff_id, staff(name), clients(name), sites(address)')
        .gte('scheduled_date', rangeStart)
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
  }, [isDayMode, dayKey, weekKey])

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

  function openReschedulePicker(job: Job) {
    setNotifyClient(true)
    setNotifyStaff(true)
    setContextMenuJob(job)
  }

  function handleWeekDragReschedule({ job, toStaffKey, toDateKey: toDateKeyStr }: WeekDragReschedulePayload) {
    const from = resolveStaffKey(job.staff_id ?? UNASSIGNED_KEY)
    const to = resolveStaffKey(toStaffKey)
    const fromDateKey = job.scheduled_date?.split('T')[0] ?? toDateKeyStr
    const { start, end } = jobTimes(job)
    setNotifyClient(true)
    setNotifyStaff(true)
    setPendingReschedule({
      job, fromDateKey, toDateKey: toDateKeyStr,
      fromStaffId: job.staff_id, toStaffId: to.id, fromStaffName: from.name, toStaffName: to.name,
      fromStartTime: start, toStartTime: start, fromEndTime: end, toEndTime: end,
    })
  }

  function handleDayDragReschedule({ job, toStaffKey, newStartTime, newEndTime }: DragReschedulePayload) {
    const from = resolveStaffKey(job.staff_id ?? UNASSIGNED_KEY)
    const to = resolveStaffKey(toStaffKey)
    const { start, end } = jobTimes(job)
    setNotifyClient(true)
    setNotifyStaff(true)
    setPendingReschedule({
      job, fromDateKey: dayKey, toDateKey: dayKey,
      fromStaffId: job.staff_id, toStaffId: to.id, fromStaffName: from.name, toStaffName: to.name,
      fromStartTime: start, toStartTime: newStartTime, fromEndTime: end, toEndTime: newEndTime,
    })
  }

  // Shared by the drag-and-drop confirm flow and the right-click/long-press
  // picker flow — same DB update, same notification queueing, same toast.
  async function applyReschedule(
    job: Job, toDateKey: string, toStartTime: string, toEndTime: string, toStaffId: string | null, toStaffName: string,
  ) {
    const { error } = await supabase
      .from('jobs')
      .update({ scheduled_date: toDateKey, start_time: toStartTime, end_time: toEndTime, staff_id: toStaffId })
      .eq('id', job.id)

    if (error) {
      console.error('[Reschedule] update failed:', error)
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
    if (notifyClient && job.client_id) {
      rows.push({ client_id: job.client_id, job_id: job.id, type: 'reschedule', recipient: 'client', status: 'pending', scheduled_for: nowIso })
    }
    if (notifyStaff && toStaffId) {
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

    const fromDateKey = job.scheduled_date?.split('T')[0]
    const { start: fromStart } = jobTimes(job)
    if (fromDateKey !== toDateKey) setToast(`Job rescheduled to ${formatModalDate(toDateKey)}`)
    else if (fromStart !== toStartTime) setToast(`Job moved to ${formatTime(toStartTime)}`)
    else if ((job.staff_id ?? null) !== toStaffId) setToast(`Job reassigned to ${toStaffName}`)
    else setToast('Job updated')
  }

  async function handleConfirmReschedule() {
    if (!pendingReschedule) return
    setSavingReschedule(true)
    const p = pendingReschedule
    await applyReschedule(p.job, p.toDateKey, p.toStartTime, p.toEndTime, p.toStaffId, p.toStaffName)
    setSavingReschedule(false)
    setPendingReschedule(null)
  }

  function handleCancelReschedule() {
    setPendingReschedule(null)
  }

  async function handleConfirmPickerReschedule(newDateKey: string, newStartTime: string, newEndTime: string) {
    if (!contextMenuJob) return
    setSavingReschedule(true)
    await applyReschedule(contextMenuJob, newDateKey, newStartTime, newEndTime, contextMenuJob.staff_id, contextMenuJob.staff?.name ?? '')
    setSavingReschedule(false)
    setContextMenuJob(null)
  }

  function handleCancelPickerReschedule() {
    setContextMenuJob(null)
  }

  const headerLabel = isDayMode
    ? dayDate.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : formatWeekRange(weekStart)

  return (
    <>
      {/* Page header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label={isDayMode ? "Today's Jobs" : "This Week's Jobs"} value={String(jobs.length)} />
        <StatCard label="Staff Scheduled" value={String(staffRows.length)} />
        <StatCard
          label="Unassigned"
          value={String(jobs.filter(j => !j.staff_id).length)}
          danger={hasUnassigned}
        />
        <StatCard label="Completed" value={String(jobs.filter(j => j.status === 'complete').length)} />
      </div>

      {/* Day grid */}
      <div style={{ display: view === 'day' ? 'block' : 'none' }}>
        {loading ? (
          <div className="rounded-lg py-20 text-center" style={{ background: '#1A1A2E' }}>
            <p className="text-sm text-blue-200/40">Loading schedule…</p>
          </div>
        ) : (
          <DayTimeGrid
            jobs={dayJobs}
            staffRows={staffRows}
            hasUnassigned={hasUnassigned}
            isToday={dayKey === todayKey}
            onReschedulePicker={openReschedulePicker}
            onHover={(j, x, y) => setHoverTooltip({ job: j, x, y })}
            onMove={(x, y) => setHoverTooltip(prev => (prev ? { ...prev, x, y } : prev))}
            onLeave={() => setHoverTooltip(null)}
            onEmptySlotClick={(staffKey, startTime, endTime) => setAddJobPrefill({
              staffId: staffKey === UNASSIGNED_KEY ? '' : staffKey, date: dayKey, startTime, endTime,
            })}
            onDragReschedule={handleDayDragReschedule}
          />
        )}
      </div>

      {/* Week grid */}
      <div style={{ display: view === 'week' ? 'block' : 'none' }}>
        {loading ? (
          <div className="rounded-lg py-20 text-center" style={{ background: '#1A1A2E' }}>
            <p className="text-sm text-blue-200/40">Loading schedule…</p>
          </div>
        ) : (
          <WeekGrid
            jobs={jobs}
            staffRows={staffRows}
            hasUnassigned={hasUnassigned}
            weekDays={weekDays}
            todayKey={todayKey}
            toDateKey={toDateKey}
            onReschedulePicker={openReschedulePicker}
            onHover={(j, x, y) => setHoverTooltip({ job: j, x, y })}
            onMove={(x, y) => setHoverTooltip(prev => (prev ? { ...prev, x, y } : prev))}
            onLeave={() => setHoverTooltip(null)}
            onEmptyCellClick={(staffKey, dateKey) => setAddJobPrefill({
              staffId: staffKey === UNASSIGNED_KEY ? '' : staffKey, date: dateKey,
            })}
            onDragReschedule={handleWeekDragReschedule}
          />
        )}
      </div>

      {/* Map — stays mounted once opened (and across date changes) so
          Leaflet's CDN script and the map instance are never torn down and
          reinitialized; markers just update via the jobs prop instead */}
      {mapEverShown && (
        <div style={{ display: view === 'map' ? 'block' : 'none' }}>
          <MapView jobs={jobs} />
        </div>
      )}
      {!loading && jobs.length === 0 && view !== 'map' && (
        <p className="mt-6 text-center text-sm text-[#6B7280]">
          No jobs scheduled for this {isDayMode ? 'day' : 'week'}
        </p>
      )}

      {hoverTooltip && <JobTooltip job={hoverTooltip.job} x={hoverTooltip.x} y={hoverTooltip.y} />}

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

      {toast && <Toast message={toast} />}
    </>
  )
}
