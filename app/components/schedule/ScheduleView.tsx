'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { supabase } from '@/lib/supabase'
import { isDemoRoute } from '@/lib/demoGuard'
import type { Client, Job, Staff } from '@/lib/types'
import { minutesToTime } from '@/lib/timeOptions'
import AddJobModal from '@/app/components/jobs/AddJobModal'
import MapView from './MapView'
import DayBoard, { staffIdFromRowId, type BoardGeometry, type StaffRow } from './DayBoard'
import WeekBoard, { parseCellId } from './WeekBoard'
import UnassignedPanel, { PANEL_DROP_ID } from './UnassignedPanel'
import JobDetailPanel from './JobDetailPanel'
import ReschedulePickerModal, { type ReschedulePayload } from './ReschedulePickerModal'
import ScheduleToast, { type ToastState } from './ScheduleToast'
import MobileDayList from './MobileDayList'
import { DragGhost, type JobDragData } from './JobBlock'
import { JobHoverProvider, useJobHover } from './JobTooltip'
import { setDropPreview } from './dragPreviewStore'
import { useScheduleSensors, markDragEnded } from './dndSensors'
import { colorForStatus, STATUS_ORDER, statusLabelFor } from './scheduleColors'
import {
  VIEW_RANGE_MIN, VIEW_START_MIN,
  addDays, buildWeekDays, clampStart, compactTime, formatShortDate, formatWeekRange, fromDateKey, getMonday,
  jobDateKey, jobDurationMin, jobLabel, jobTimes, snapMinutes, startOfDay, toDateKey,
  type ScheduleJob,
} from './scheduleDates'

// ─── constants ───────────────────────────────────────────────────────────────

type View = 'day' | 'week' | 'map'
type StaffLite = Pick<Staff, 'id' | 'name'>
type ClientLite = Pick<Client, 'id' | 'name' | 'business_name'>
type AddJobPrefill = { staffId: string; date: string; startTime?: string; endTime?: string }
type JobPatch = Partial<Pick<Job, 'scheduled_date' | 'start_time' | 'end_time' | 'staff_id' | 'status'>>
type TodayStats = { jobs: number; staff: number; completed: number; inProgress: number }
type CommitOpts = { notifyClient?: boolean; notifyStaff?: boolean; message?: string; undoable?: boolean }

const PANEL_KEY = 'operify:schedule-panel-collapsed'
const HIDE_FREE_KEY = 'operify:schedule-hide-free'
const VIEW_KEY = 'operify:schedule-view'
const UPCOMING_DAYS = 28
const JOB_SELECT = 'id, title, job_type, status, scheduled_date, start_time, end_time, location, notes, client_id, site_id, staff_id, staff(name), clients(name, business_name), sites(address)'

// ─── icons ───────────────────────────────────────────────────────────────────

const Icon = {
  chevronLeft: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>,
  chevronRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  crew: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  inbox: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
}

// ─── small pieces ────────────────────────────────────────────────────────────

function BoardSkeleton() {
  return (
    <div className="flex-1 min-h-0 bg-surface overflow-hidden flex flex-col">
      <div className="h-11 bg-surface-muted border-b border-line flex items-center px-4 gap-3">
        <div className="h-3 w-20 rounded bg-line animate-pulse" />
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex border-b border-line-soft" style={{ height: 88 }}>
          <div className="w-[200px] shrink-0 flex items-center gap-3 px-4 border-r border-line">
            <div className="w-9 h-9 rounded-full bg-line animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-line animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-line-soft animate-pulse" />
            </div>
          </div>
          <div className="flex-1 relative">
            {i % 3 !== 2 && <div className="absolute top-2 h-14 rounded-lg bg-surface-muted animate-pulse" style={{ left: `${8 + i * 9}%`, width: '18%' }} />}
            {i % 2 === 0 && <div className="absolute top-2 h-14 rounded-lg bg-surface-muted animate-pulse" style={{ left: `${45 + i * 5}%`, width: '22%' }} />}
          </div>
        </div>
      ))}
    </div>
  )
}

function BoardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex-1 min-h-0 bg-surface flex items-center justify-center">
      <button onClick={onRetry} className="flex flex-col items-center gap-2 px-6 py-4 text-center group">
        <span className="w-10 h-10 rounded-full bg-red-50 text-error flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        </span>
        <span className="text-sm font-semibold text-ink">Couldn&apos;t load the schedule</span>
        <span className="text-xs text-accent font-semibold group-hover:underline">Try again</span>
      </button>
    </div>
  )
}

// One inline stat for the slim bar at the top of the page.
function Stat({ icon, label, value, hint, danger }: { icon: React.ReactNode; label: string; value: number; hint?: string; danger?: boolean }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className={['w-6 h-6 rounded-md flex items-center justify-center shrink-0', danger ? 'bg-red-50 text-error' : 'bg-accent-soft text-accent'].join(' ')}>
        {icon}
      </span>
      <span className={['text-[15px] font-bold tabular-nums leading-none', danger ? 'text-error' : 'text-ink'].join(' ')}>{value}</span>
      <span className="text-[11px] font-medium text-ink-muted leading-none">{label}</span>
      {hint && <span className="hidden xl:inline text-[10.5px] text-ink-faint leading-none">· {hint}</span>}
    </div>
  )
}

function Legend() {
  return (
    <div className="hidden lg:flex items-center gap-3">
      {STATUS_ORDER.filter(s => s !== 'invoiced').map(s => {
        const c = colorForStatus(s)
        return (
          <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span className="w-2 h-2 rounded-sm" style={{ background: c.solid }} />
            {statusLabelFor(s)}
          </span>
        )
      })}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-[11.5px] font-medium text-ink-muted hover:text-ink transition-colors"
    >
      <span
        className={['relative w-7 h-4 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-line'].join(' ')}
      >
        <span className={['absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-3.5' : 'translate-x-0.5'].join(' ')} />
      </span>
      {label}
    </button>
  )
}

// ─── view ────────────────────────────────────────────────────────────────────

export default function ScheduleView() {
  return (
    <JobHoverProvider>
      <ScheduleInner />
    </JobHoverProvider>
  )
}

function ScheduleInner() {
  const hover = useJobHover()
  const sensors = useScheduleSensors()
  const geometry = useRef<BoardGeometry>({ rows: new Map() })

  // ── view / navigation state
  const [view, setView] = useState<View>('day')
  const [gridMode, setGridMode] = useState<'day' | 'week'>('day')
  const [mapEverShown, setMapEverShown] = useState(false)
  const [dayDate, setDayDate] = useState<Date>(() => startOfDay(new Date()))
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [todayKey, setTodayKey] = useState('')
  // Rail starts collapsed so the grid gets the whole viewport; expanding it
  // is remembered.
  const [panelCollapsed, setPanelCollapsed] = useState(true)
  const [hideFree, setHideFree] = useState(false)

  // ── data
  const [jobs, setJobs] = useState<ScheduleJob[]>([])
  const [extraUnassigned, setExtraUnassigned] = useState<ScheduleJob[]>([])
  const [todayStats, setTodayStats] = useState<TodayStats>({ jobs: 0, staff: 0, completed: 0, inProgress: 0 })
  const [staffList, setStaffList] = useState<StaffLite[]>([])
  const [clients, setClients] = useState<ClientLite[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryTick, setRetryTick] = useState(0)
  const staffClientsLoadedRef = useRef(false)
  // Undo closures need to call the latest commitPatch without the callback
  // referencing itself during its own declaration.
  const commitPatchRef = useRef<((job: ScheduleJob, patch: JobPatch, opts?: CommitOpts) => Promise<boolean>) | null>(null)

  // ── overlays
  const [pickerJob, setPickerJob] = useState<ScheduleJob | null>(null)
  const [savingPicker, setSavingPicker] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [addJobPrefill, setAddJobPrefill] = useState<AddJobPrefill | null>(null)
  const [detailJobId, setDetailJobId] = useState<string | null>(null)
  // Last known copy of the open job, for when it moves out of both lists
  // (e.g. assigned and rescheduled to a day outside the visible range).
  const [detailSnapshot, setDetailSnapshot] = useState<ScheduleJob | null>(null)
  const [activeDrag, setActiveDrag] = useState<{ job: ScheduleJob; width: number } | null>(null)

  useEffect(() => {
    // Client-only reads: today's date (avoids SSR/CSR mismatch) and persisted prefs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayKey(toDateKey(new Date()))
    try {
      if (localStorage.getItem(PANEL_KEY) === '0') setPanelCollapsed(false)
      if (localStorage.getItem(HIDE_FREE_KEY) === '1') setHideFree(true)
      const v = localStorage.getItem(VIEW_KEY)
      if (v === 'week') { setView('week'); setGridMode('week') }
    } catch { /* storage unavailable */ }
    // Deep links: /schedule?view=week&date=2026-09-07 (e.g. from the dashboard).
    const params = new URLSearchParams(window.location.search)
    const paramView = params.get('view')
    const paramDate = params.get('date')
    if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) && !Number.isNaN(fromDateKey(paramDate).getTime())) {
      setDayDate(fromDateKey(paramDate))
      setWeekStart(getMonday(fromDateKey(paramDate)))
    }
    if (paramView === 'day' || paramView === 'week') { setView(paramView); setGridMode(paramView) }
    else if (paramView === 'map') { setView('map'); setMapEverShown(true) }
  }, [])
  useEffect(() => { try { localStorage.setItem(PANEL_KEY, panelCollapsed ? '1' : '0') } catch { /* noop */ } }, [panelCollapsed])
  useEffect(() => { try { localStorage.setItem(HIDE_FREE_KEY, hideFree ? '1' : '0') } catch { /* noop */ } }, [hideFree])
  useEffect(() => { try { if (view !== 'map') localStorage.setItem(VIEW_KEY, view) } catch { /* noop */ } }, [view])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  const isDayMode = view === 'map' ? gridMode === 'day' : view === 'day'
  const dayKey = toDateKey(dayDate)
  const weekKey = toDateKey(weekStart)
  const rangeStartKey = isDayMode ? dayKey : weekKey
  const rangeEndKey = toDateKey(isDayMode ? addDays(dayDate, 1) : addDays(weekStart, 7))
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart])

  const inRange = useCallback(
    (key: string | null) => !!key && key >= rangeStartKey && key < rangeEndKey,
    [rangeStartKey, rangeEndKey],
  )

  // ── load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!todayKey) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(false)
      const needsStaffClients = !staffClientsLoadedRef.current
      const upcomingEndKey = toDateKey(addDays(new Date(`${todayKey}T00:00:00`), UPCOMING_DAYS))

      const [jobsResult, extraResult, todayResult, staffResult, clientResult] = await Promise.all([
        supabase.from('jobs').select(JOB_SELECT)
          .gte('scheduled_date', rangeStartKey).lt('scheduled_date', rangeEndKey)
          .order('scheduled_date').order('start_time'),
        supabase.from('jobs').select(JOB_SELECT)
          .is('staff_id', null)
          .neq('status', 'cancelled')
          .or(`scheduled_date.is.null,and(scheduled_date.gte.${todayKey},scheduled_date.lt.${upcomingEndKey})`)
          .order('scheduled_date', { nullsFirst: false }).order('start_time')
          .limit(60),
        supabase.from('jobs').select('id, staff_id, status').eq('scheduled_date', todayKey),
        needsStaffClients ? supabase.from('staff').select('id, name').eq('is_active', true).order('name') : Promise.resolve(null),
        needsStaffClients ? supabase.from('clients').select('id, name, business_name').order('name') : Promise.resolve(null),
      ])
      if (cancelled) return

      const err = jobsResult.error ?? extraResult.error ?? todayResult.error ?? staffResult?.error ?? clientResult?.error
      if (err) {
        console.error('[Schedule] load failed:', err)
        setLoadError(true)
        setLoading(false)
        return
      }

      const rangeJobs = (jobsResult.data as unknown as ScheduleJob[]) ?? []
      const extra = ((extraResult.data as unknown as ScheduleJob[]) ?? []).filter(j => !inRange(jobDateKey(j)))
      const today = (todayResult.data as { id: string; staff_id: string | null; status: string | null }[]) ?? []
      setJobs(rangeJobs)
      setExtraUnassigned(extra)
      setTodayStats({
        jobs: today.length,
        staff: new Set(today.filter(j => j.staff_id).map(j => j.staff_id)).size,
        completed: today.filter(j => j.status === 'complete' || j.status === 'invoiced').length,
        inProgress: today.filter(j => j.status === 'in_progress').length,
      })
      if (needsStaffClients) {
        setStaffList((staffResult?.data as StaffLite[]) ?? [])
        setClients((clientResult?.data as ClientLite[]) ?? [])
        staffClientsLoadedRef.current = true
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [rangeStartKey, rangeEndKey, todayKey, retryTick, inRange])

  // ── derived ────────────────────────────────────────────────────────────────
  const staffRows: StaffRow[] = useMemo(() => {
    const map = new Map<string, string>()
    staffList.forEach(s => map.set(s.id, s.name))
    jobs.forEach(j => { if (j.staff_id && j.staff?.name && !map.has(j.staff_id)) map.set(j.staff_id, j.staff.name) })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [staffList, jobs])

  const dayJobs = useMemo(() => jobs.filter(j => jobDateKey(j) === dayKey), [jobs, dayKey])
  const unassignedInRange = useMemo(
    () => jobs.filter(j => !j.staff_id && j.status !== 'cancelled').sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? '') || (a.start_time ?? '').localeCompare(b.start_time ?? '')),
    [jobs],
  )

  const detailJob = useMemo(() => {
    if (!detailJobId) return null
    return jobs.find(j => j.id === detailJobId) ?? extraUnassigned.find(j => j.id === detailJobId) ?? detailSnapshot
  }, [detailJobId, jobs, extraUnassigned, detailSnapshot])

  const staffNameFor = useCallback((id: string | null) => (id ? staffRows.find(s => s.id === id)?.name ?? null : null), [staffRows])

  // ── local state placement ──────────────────────────────────────────────────
  // After any change a job belongs in exactly one bucket: the visible range,
  // the "other dates" unassigned list, or nowhere (moved out of view).
  const placeJob = useCallback((updated: ScheduleJob) => {
    const key = jobDateKey(updated)
    const visible = inRange(key)
    setJobs(prev => {
      const without = prev.filter(j => j.id !== updated.id)
      return visible ? [...without, updated] : without
    })
    setExtraUnassigned(prev => {
      const without = prev.filter(j => j.id !== updated.id)
      const belongs = !visible && !updated.staff_id && updated.status !== 'cancelled' && (key == null || (key >= todayKey && key < toDateKey(addDays(new Date(`${todayKey}T00:00:00`), UPCOMING_DAYS))))
      return belongs ? [...without, updated] : without
    })
    setDetailSnapshot(prev => (prev && prev.id === updated.id ? updated : prev))
  }, [inRange, todayKey])

  const bumpTodayStats = useCallback((before: ScheduleJob, after: ScheduleJob) => {
    const wasToday = jobDateKey(before) === todayKey
    const isToday = jobDateKey(after) === todayKey
    if (!wasToday && !isToday) return
    setTodayStats(s => {
      let { jobs: n, completed, inProgress } = s
      const done = (j: ScheduleJob) => j.status === 'complete' || j.status === 'invoiced'
      if (wasToday) { n -= 1; if (done(before)) completed -= 1; if (before.status === 'in_progress') inProgress -= 1 }
      if (isToday) { n += 1; if (done(after)) completed += 1; if (after.status === 'in_progress') inProgress += 1 }
      return { ...s, jobs: n, completed, inProgress }
    })
  }, [todayKey])

  // ── commit a change ────────────────────────────────────────────────────────
  const commitPatch = useCallback(async (
    job: ScheduleJob,
    patch: JobPatch,
    opts: CommitOpts = {},
  ): Promise<boolean> => {
    const current: JobPatch = {
      scheduled_date: jobDateKey(job),
      start_time: jobTimes(job).start,
      end_time: jobTimes(job).end,
      staff_id: job.staff_id ?? null,
      status: job.status ?? null,
    }
    const changed: JobPatch = {}
    const prev: JobPatch = {}
    for (const key of Object.keys(patch) as (keyof JobPatch)[]) {
      const next = patch[key] ?? null
      if (next !== (current[key] ?? null)) {
        ;(changed as Record<string, unknown>)[key] = next
        ;(prev as Record<string, unknown>)[key] = current[key] ?? null
      }
    }
    if (Object.keys(changed).length === 0) return false

    const nextStaffId = changed.staff_id !== undefined ? changed.staff_id : job.staff_id
    const updated: ScheduleJob = {
      ...job,
      ...changed,
      staff: changed.staff_id !== undefined
        ? (nextStaffId ? { name: staffNameFor(nextStaffId) ?? job.staff?.name ?? 'Staff', pay_rate: job.staff?.pay_rate ?? null } : null)
        : job.staff,
    }

    placeJob(updated)
    bumpTodayStats(job, updated)

    const { error } = await supabase.from('jobs').update(changed).eq('id', job.id)
    if (error || isDemoRoute()) {
      placeJob(job)
      bumpTodayStats(updated, job)
      if (error) {
        console.error('[Schedule] update failed:', error)
        setToast({ message: 'Couldn’t save that change', error: true })
      }
      return false
    }

    // Reschedule notifications — same queue the job page uses.
    const timeChanged = 'scheduled_date' in changed || 'start_time' in changed || 'end_time' in changed
    const staffChanged = 'staff_id' in changed
    const rows: { client_id: string | null; job_id: string; type: string; recipient: string; status: string; scheduled_for: string }[] = []
    const nowIso = new Date().toISOString()
    if (opts.notifyClient !== false && timeChanged && job.client_id) {
      rows.push({ client_id: job.client_id, job_id: job.id, type: 'reschedule', recipient: 'client', status: 'pending', scheduled_for: nowIso })
    }
    if (opts.notifyStaff !== false && (timeChanged || staffChanged) && nextStaffId) {
      rows.push({ client_id: null, job_id: job.id, type: 'reschedule', recipient: 'staff', status: 'pending', scheduled_for: nowIso })
    }
    if (rows.length > 0) {
      const { error: notifErr } = await supabase.from('notifications').insert(rows)
      if (notifErr) console.error('[Schedule] notification insert failed:', notifErr.code, notifErr.message)
    }

    const label = jobLabel(job)
    let message = opts.message
    if (!message) {
      if ('scheduled_date' in changed) message = `${label} moved to ${formatShortDate(changed.scheduled_date!)}${'start_time' in changed ? `, ${compactTime(changed.start_time)}` : ''}`
      else if ('start_time' in changed) message = `${label} moved to ${compactTime(changed.start_time)}`
      else if ('end_time' in changed) message = `${label} now ends at ${compactTime(changed.end_time)}`
      else if ('staff_id' in changed) message = nextStaffId ? `${label} assigned to ${staffNameFor(nextStaffId) ?? 'staff'}` : `${label} unassigned`
      else if ('status' in changed) message = `${label} marked ${statusLabelFor(changed.status)}`
      else message = `${label} updated`
      if ('staff_id' in changed && ('scheduled_date' in changed || 'start_time' in changed)) {
        message += nextStaffId ? ` · ${staffNameFor(nextStaffId) ?? 'staff'}` : ' · unassigned'
      }
    }
    setToast({
      message,
      undo: opts.undoable === false ? undefined : () => {
        setToast(null)
        commitPatchRef.current?.(updated, prev, { notifyClient: false, notifyStaff: false, message: 'Change undone', undoable: false })
      },
    })
    return true
  }, [placeJob, bumpTodayStats, staffNameFor])
  useEffect(() => { commitPatchRef.current = commitPatch }, [commitPatch])

  // ── navigation ─────────────────────────────────────────────────────────────
  function goPrev() { if (isDayMode) setDayDate(d => addDays(d, -1)); else setWeekStart(d => addDays(d, -7)) }
  function goNext() { if (isDayMode) setDayDate(d => addDays(d, 1)); else setWeekStart(d => addDays(d, 7)) }
  function goToday() { setDayDate(startOfDay(new Date())); setWeekStart(getMonday(new Date())) }
  function jumpToDay(date: Date) { setDayDate(startOfDay(date)); setView('day'); setGridMode('day') }
  function switchView(v: View) {
    setView(v)
    if (v !== 'map') setGridMode(v)
    else setMapEverShown(true)
    if (v === 'week') setWeekStart(getMonday(dayDate))
    if (v === 'day' && (dayDate < weekStart || dayDate >= addDays(weekStart, 7))) setDayDate(weekStart)
  }

  // Keyboard shortcuts — skipped while typing or while any overlay is open.
  const overlayOpen = !!(pickerJob || addJobPrefill || detailJobId)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (overlayOpen || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      switch (e.key) {
        case 'ArrowLeft': goPrev(); break
        case 'ArrowRight': goNext(); break
        case 't': case 'T': goToday(); break
        case 'd': case 'D': switchView('day'); break
        case 'w': case 'W': switchView('week'); break
        case 'm': case 'M': switchView('map'); break
        case 'u': case 'U': setPanelCollapsed(c => !c); break
        case 'n': case 'N': setAddJobPrefill({ staffId: '', date: isDayMode ? dayKey : todayKey }); break
        default: return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── drag & drop ────────────────────────────────────────────────────────────
  // Pixels per minute on the Day board, measured from any registered row
  // track (its width is exactly the 6am–6pm range).
  function boardPxPerMin(): number | null {
    const first = geometry.current.rows.values().next().value as HTMLElement | undefined
    if (!first) return null
    return first.getBoundingClientRect().width / VIEW_RANGE_MIN
  }

  function dropStartFor(job: ScheduleJob, rowId: string, translatedLeft: number): number | null {
    const el = geometry.current.rows.get(rowId)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const pxPerMin = rect.width / VIEW_RANGE_MIN
    const raw = VIEW_START_MIN + (translatedLeft - rect.left) / pxPerMin
    return clampStart(snapMinutes(raw), jobDurationMin(job))
  }

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as JobDragData | undefined
    if (!data) return
    hover.suspend(true)
    const pxPerMin = view === 'day' ? boardPxPerMin() : null
    const width = pxPerMin ? Math.max(120, jobDurationMin(data.job) * pxPerMin - 2) : 176
    setActiveDrag({ job: data.job, width })
  }

  function handleDragMove(e: DragMoveEvent) {
    if (view !== 'day') return
    const data = e.active.data.current as JobDragData | undefined
    const overId = e.over ? String(e.over.id) : null
    const translated = e.active.rect.current.translated
    if (!data || !overId || !overId.startsWith('row:') || !translated) { setDropPreview(null); return }
    const start = dropStartFor(data.job, overId, translated.left)
    if (start == null) { setDropPreview(null); return }
    setDropPreview({ rowId: overId, startMin: start, endMin: start + jobDurationMin(data.job), jobId: data.job.id })
  }

  function finishDrag() {
    markDragEnded()
    setDropPreview(null)
    setActiveDrag(null)
    hover.suspend(false)
  }

  function handleDragEnd(e: DragEndEvent) {
    const data = e.active.data.current as JobDragData | undefined
    const translated = e.active.rect.current.translated
    finishDrag()
    if (!data || !e.over) return
    const job = data.job
    const overId = String(e.over.id)

    if (overId === PANEL_DROP_ID) {
      if (!job.staff_id) return
      commitPatch(job, { staff_id: null })
      return
    }

    const rowStaff = staffIdFromRowId(overId)
    if (rowStaff) {
      if (!translated) return
      const start = dropStartFor(job, overId, translated.left)
      if (start == null) return
      const duration = jobDurationMin(job)
      commitPatch(job, {
        scheduled_date: dayKey,
        start_time: minutesToTime(start),
        end_time: minutesToTime(start + duration),
        staff_id: rowStaff,
      })
      return
    }

    const cell = parseCellId(overId)
    if (cell) {
      commitPatch(job, { scheduled_date: cell.dateKey, staff_id: cell.staffId })
    }
  }

  // ── other handlers ─────────────────────────────────────────────────────────
  const openDetail = useCallback((job: ScheduleJob) => { setDetailSnapshot(job); setDetailJobId(job.id) }, [])
  const openPicker = useCallback((job: ScheduleJob) => setPickerJob(job), [])
  const handleResizeEnd = useCallback((job: ScheduleJob, newEndTime: string) => {
    commitPatch(job, { end_time: newEndTime })
  }, [commitPatch])

  async function handlePickerConfirm(p: ReschedulePayload) {
    if (!pickerJob) return
    setSavingPicker(true)
    await commitPatch(pickerJob, { scheduled_date: p.dateKey, start_time: p.startTime, end_time: p.endTime, staff_id: p.staffId }, {
      notifyClient: p.notifyClient, notifyStaff: p.notifyStaff,
    })
    setSavingPicker(false)
    setPickerJob(null)
  }

  const handleAssign = useCallback(async (job: ScheduleJob, staffId: string | null) => {
    await commitPatch(job, { staff_id: staffId })
  }, [commitPatch])
  const handleStatusChange = useCallback(async (job: ScheduleJob, status: string) => {
    await commitPatch(job, { status }, { notifyClient: false, notifyStaff: false })
  }, [commitPatch])

  const onEmptySlotClick = useCallback((staffId: string, startTime: string, endTime: string) => {
    setAddJobPrefill({ staffId, date: dayKey, startTime, endTime })
  }, [dayKey])
  const onEmptyCellClick = useCallback((staffId: string, dateKey: string) => {
    setAddJobPrefill({ staffId, date: dateKey })
  }, [])

  // ── header bits ────────────────────────────────────────────────────────────
  const isViewingToday = isDayMode ? dayKey === todayKey : (todayKey >= weekKey && todayKey < rangeEndKey)
  const headerLabel = isDayMode
    ? dayDate.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : formatWeekRange(weekStart)
  const rangeWord = isDayMode ? (dayKey === todayKey ? 'Today' : formatShortDate(dayKey)) : 'This week'
  const ghostStaffName = activeDrag ? staffNameFor(activeDrag.job.staff_id) : null

  const segment = (v: View, label: string) => (
    <button
      key={v}
      onClick={() => switchView(v)}
      className={[
        'px-3 py-1 text-[12px] rounded transition-[background-color,color,box-shadow] duration-150',
        view === v ? 'bg-white text-ink font-semibold shadow-[0_1px_2px_rgba(17,24,39,0.12),0_0_0_1px_rgba(17,24,39,0.05)]' : 'text-ink-muted hover:text-ink font-medium',
      ].join(' ')}
    >
      {label}
    </button>
  )

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* ── Stat bar — one slim line, ≤48px ── */}
      <div className="shrink-0 h-10 md:h-11 flex items-center gap-x-5 gap-y-1 px-4 border-b border-line bg-surface-muted/60 overflow-x-auto scrollbar-hidden">
        <Stat icon={Icon.calendar} label="Today's jobs" value={todayStats.jobs} hint={todayStats.inProgress > 0 ? `${todayStats.inProgress} in progress` : undefined} />
        <Stat icon={Icon.crew} label="Staff scheduled" value={todayStats.staff} hint={`of ${staffList.length}`} />
        <Stat icon={Icon.inbox} label="Unassigned" value={unassignedInRange.length} danger={unassignedInRange.length > 0} hint={extraUnassigned.length > 0 ? `${rangeWord.toLowerCase()} · ${extraUnassigned.length} other dates` : rangeWord.toLowerCase()} />
        <Stat icon={Icon.check} label="Completed today" value={todayStats.completed} hint={todayStats.jobs > 0 ? `of ${todayStats.jobs}` : undefined} />
      </div>

      {/* ── Toolbar ── */}
      <div className="shrink-0 min-h-11 flex items-center gap-2 px-3 py-1.5 border-b border-line bg-surface flex-wrap">
        <button
          onClick={goToday}
          className="px-2.5 py-1 text-[12px] font-medium bg-white border border-line text-ink rounded-md hover:bg-surface-muted hover:border-[#d6d3d1] transition-colors"
        >
          Today
        </button>
        <div className="flex items-center rounded-md border border-line bg-white overflow-hidden">
          <button onClick={goPrev} className="p-1 text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors border-r border-line" aria-label={isDayMode ? 'Previous day' : 'Previous week'}>
            {Icon.chevronLeft}
          </button>
          <button onClick={goNext} className="p-1 text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors" aria-label={isDayMode ? 'Next day' : 'Next week'}>
            {Icon.chevronRight}
          </button>
        </div>
        <p className="text-[13px] font-semibold text-ink whitespace-nowrap flex items-center gap-1.5 ml-1">
          {headerLabel}
          {isViewingToday && <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] px-1.5 py-px rounded bg-accent-soft text-accent">Today</span>}
        </p>
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-surface-muted border border-line ml-1">
          {segment('day', 'Day')}
          {segment('week', 'Week')}
          {segment('map', 'Map')}
        </div>

        <div className="hidden md:flex items-center gap-4 ml-auto">
          {view !== 'map' && <Legend />}
          {view !== 'map' && <Toggle checked={hideFree} onChange={setHideFree} label="Hide free staff" />}
          <span className="hidden 2xl:inline text-[10.5px] text-ink-faint">
            <kbd className="font-sans font-semibold text-ink-muted">←</kbd> <kbd className="font-sans font-semibold text-ink-muted">→</kbd> navigate · <kbd className="font-sans font-semibold text-ink-muted">T</kbd> today · <kbd className="font-sans font-semibold text-ink-muted">N</kbd> new job
          </span>
        </div>
        <button
          onClick={() => setAddJobPrefill({ staffId: '', date: isDayMode ? dayKey : todayKey })}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold text-white rounded-md bg-accent hover:brightness-110 active:brightness-95 transition-[filter] ml-auto md:ml-0"
        >
          {Icon.plus} New job
        </button>
      </div>

      {/* ── Desktop board — fills the rest of the viewport ── */}
      <div className="hidden md:flex flex-1 min-h-0 flex-col">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={finishDrag}
        >
          <div className="flex-1 min-h-0 flex">
            {view !== 'map' && !loading && !loadError && (
              <UnassignedPanel
                inRange={unassignedInRange}
                upcoming={extraUnassigned}
                rangeLabel={rangeWord}
                collapsed={panelCollapsed}
                onToggle={() => setPanelCollapsed(c => !c)}
                onOpen={openDetail}
                onReschedulePicker={openPicker}
                onAddJob={() => setAddJobPrefill({ staffId: '', date: isDayMode ? dayKey : todayKey })}
              />
            )}

            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
              {view === 'day' && (
                loading ? <BoardSkeleton /> : loadError ? <BoardError onRetry={() => setRetryTick(t => t + 1)} /> : (
                  <DayBoard
                    key={dayKey}
                    jobs={dayJobs}
                    staffRows={staffRows}
                    isToday={dayKey === todayKey}
                    hideFree={hideFree}
                    geometry={geometry}
                    onOpen={openDetail}
                    onReschedulePicker={openPicker}
                    onEmptySlotClick={onEmptySlotClick}
                    onResizeEnd={handleResizeEnd}
                  />
                )
              )}
              {view === 'week' && (
                loading ? <BoardSkeleton /> : loadError ? <BoardError onRetry={() => setRetryTick(t => t + 1)} /> : (
                  <WeekBoard
                    jobs={jobs}
                    staffRows={staffRows}
                    weekDays={weekDays}
                    todayKey={todayKey}
                    hideFree={hideFree}
                    onOpen={openDetail}
                    onReschedulePicker={openPicker}
                    onJumpToDay={jumpToDay}
                    onEmptyCellClick={onEmptyCellClick}
                  />
                )
              )}
              {/* Map stays mounted once opened so Leaflet's CDN script and map
                  instance are never torn down; markers update via props. */}
              {mapEverShown && (
                <div className="flex-1 min-h-0 flex-col p-3" style={{ display: view === 'map' ? 'flex' : 'none' }}>
                  <MapView jobs={jobs} />
                </div>
              )}
            </div>
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }} zIndex={100}>
            {activeDrag && <DragGhost job={activeDrag.job} width={activeDrag.width} staffName={ghostStaffName} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* ── Mobile: simple day list ── */}
      <div className="md:hidden flex-1 min-h-0 overflow-y-auto flex flex-col p-3 bg-page">
        {view === 'week' && (
          <div className="mb-3 flex items-center justify-between gap-2">
            <button onClick={() => setDayDate(d => addDays(d, -1))} className="p-2.5 rounded-lg border border-line bg-white text-ink-muted" aria-label="Previous day">{Icon.chevronLeft}</button>
            <p className="text-sm font-semibold text-ink">{formatShortDate(dayKey)}</p>
            <button onClick={() => setDayDate(d => addDays(d, 1))} className="p-2.5 rounded-lg border border-line bg-white text-ink-muted" aria-label="Next day">{Icon.chevronRight}</button>
          </div>
        )}
        {loading ? (
          <div className="rounded-xl border border-line bg-white p-4 space-y-3 shadow-card">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-surface-muted animate-pulse" />)}
          </div>
        ) : loadError ? (
          <BoardError onRetry={() => setRetryTick(t => t + 1)} />
        ) : (
          <MobileDayList
            jobs={jobs.filter(j => jobDateKey(j) === dayKey)}
            dateLabel={dayKey === todayKey ? 'Today' : formatShortDate(dayKey)}
            onOpen={openDetail}
            onAddJob={() => setAddJobPrefill({ staffId: '', date: dayKey })}
          />
        )}
      </div>

      {/* ── Overlays ── */}
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

      {pickerJob && (
        <ReschedulePickerModal
          job={pickerJob}
          staffList={staffList}
          saving={savingPicker}
          onConfirm={handlePickerConfirm}
          onCancel={() => setPickerJob(null)}
        />
      )}

      {detailJob && (
        <JobDetailPanel
          job={detailJob}
          staffList={staffList}
          clients={clients}
          onClose={() => setDetailJobId(null)}
          onReschedule={(job) => { setDetailJobId(null); setPickerJob(job) }}
          onAssign={handleAssign}
          onStatusChange={handleStatusChange}
        />
      )}

      {toast && <ScheduleToast toast={toast} />}
    </div>
  )
}
