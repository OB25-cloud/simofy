'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatTime } from '@/lib/timeOptions'
import { colorForStatus, statusLabelFor } from './scheduleColors'
import { compactRange, durationLabel, formatShortDate, jobAddress, jobDateKey, jobDurationMin, jobLabel, type ScheduleJob } from './scheduleDates'
import StaffAvatar from './StaffAvatar'

// ─── hover controller ────────────────────────────────────────────────────────
// One tooltip for the whole scheduler. Blocks call show/move/hide from their
// mouse events; the provider debounces the reveal (so sweeping the cursor
// across a busy row doesn't flash cards) and hides it for the duration of a
// drag via `suspend`.

type HoverState = { job: ScheduleJob; x: number; y: number }

type HoverApi = {
  show: (job: ScheduleJob, x: number, y: number) => void
  move: (x: number, y: number) => void
  hide: () => void
  suspend: (on: boolean) => void
}

const HoverContext = createContext<HoverApi | null>(null)

const SHOW_DELAY_MS = 180
const CARD_W = 300
const CARD_EST_H = 260
const OFFSET = 14

export function useJobHover(): HoverApi {
  const api = useContext(HoverContext)
  if (!api) throw new Error('useJobHover must be used inside <JobHoverProvider>')
  return api
}

// Spreadable mouse handlers for any hoverable job element.
export function useJobHoverHandlers(job: ScheduleJob) {
  const { show, move, hide } = useJobHover()
  return useMemo(() => ({
    onMouseEnter: (e: React.MouseEvent) => show(job, e.clientX, e.clientY),
    onMouseMove: (e: React.MouseEvent) => move(e.clientX, e.clientY),
    onMouseLeave: () => hide(),
  }), [job, show, move, hide])
}

export function JobHoverProvider({ children }: { children: React.ReactNode }) {
  const [hover, setHover] = useState<HoverState | null>(null)
  const [visible, setVisible] = useState(false)
  const suspendedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<HoverState | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])

  const hide = useCallback(() => {
    clearTimer()
    pendingRef.current = null
    setVisible(false)
    setHover(null)
  }, [clearTimer])

  const show = useCallback((job: ScheduleJob, x: number, y: number) => {
    if (suspendedRef.current) return
    clearTimer()
    pendingRef.current = { job, x, y }
    timerRef.current = setTimeout(() => {
      if (suspendedRef.current || !pendingRef.current) return
      setHover(pendingRef.current)
      setVisible(true)
    }, SHOW_DELAY_MS)
  }, [clearTimer])

  const move = useCallback((x: number, y: number) => {
    if (pendingRef.current) pendingRef.current = { ...pendingRef.current, x, y }
    setHover(prev => (prev ? { ...prev, x, y } : prev))
  }, [])

  const suspend = useCallback((on: boolean) => {
    suspendedRef.current = on
    if (on) hide()
  }, [hide])

  useEffect(() => clearTimer, [clearTimer])

  const api = useMemo<HoverApi>(() => ({ show, move, hide, suspend }), [show, move, hide, suspend])

  return (
    <HoverContext.Provider value={api}>
      {children}
      {hover && visible && <TooltipCard job={hover.job} x={hover.x} y={hover.y} />}
    </HoverContext.Provider>
  )
}

// ─── card ────────────────────────────────────────────────────────────────────

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-[3px] w-3.5 h-3.5 text-ink-faint shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint leading-3">{label}</p>
        <div className="text-[12.5px] text-ink leading-snug mt-0.5 break-words">{children}</div>
      </div>
    </div>
  )
}

const I = {
  client: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  tag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
  staff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
}

function TooltipCard({ job, x, y }: { job: ScheduleJob; x: number; y: number }) {
  const color = colorForStatus(job.status)
  const address = jobAddress(job)
  const dateKey = jobDateKey(job)
  const duration = jobDurationMin(job)

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = x + OFFSET + CARD_W > vw - 8 ? Math.max(8, x - OFFSET - CARD_W) : x + OFFSET
  const top = y + OFFSET + CARD_EST_H > vh - 8 ? Math.max(8, y - OFFSET - CARD_EST_H) : y + OFFSET

  return createPortal(
    <div
      role="tooltip"
      className="fixed z-[80] pointer-events-none rounded-xl bg-white border border-line shadow-[0_2px_4px_rgba(17,24,39,0.06),0_16px_40px_-12px_rgba(17,24,39,0.28)] overflow-hidden tab-fade-in"
      style={{ left, top, width: CARD_W }}
    >
      <div className="h-1" style={{ background: color.solid }} />
      <div className="px-4 pt-3 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13.5px] font-semibold text-ink leading-snug">{jobLabel(job)}</p>
          <span
            className="shrink-0 inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset"
            style={{ background: color.tint, color: color.text, boxShadow: `inset 0 0 0 1px rgba(${color.rgb}, 0.25)` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color.solid }} />
            {statusLabelFor(job.status)}
          </span>
        </div>

        <div className="mt-3 space-y-2.5">
          <Row icon={I.client} label="Client">
            {job.clients?.name ?? <span className="text-ink-faint">No client</span>}
            {job.clients?.business_name && <span className="text-ink-muted"> · {job.clients.business_name}</span>}
          </Row>
          <Row icon={I.pin} label="Address">
            {address ?? <span className="text-ink-faint">Not set</span>}
          </Row>
          <Row icon={I.tag} label="Job type">
            {job.job_type ?? <span className="text-ink-faint">Not set</span>}
          </Row>
          <Row icon={I.staff} label="Staff">
            <span className="inline-flex items-center gap-1.5">
              <StaffAvatar staffId={job.staff_id} name={job.staff?.name} size="xs" />
              {job.staff?.name ?? <span className="text-amber-700 font-medium">Unassigned</span>}
            </span>
          </Row>
          <Row icon={I.clock} label="Time">
            {dateKey ? formatShortDate(dateKey) : 'Unscheduled'}
            {job.start_time && (
              <>
                <span className="text-ink-faint"> · </span>
                {compactRange(job)}
                <span className="text-ink-muted"> ({durationLabel(duration)})</span>
              </>
            )}
            {!job.start_time && job.end_time && <span className="text-ink-muted"> · until {formatTime(job.end_time)}</span>}
          </Row>
        </div>
      </div>
      <div className="px-4 py-2 bg-surface-muted border-t border-line-soft text-[10.5px] text-ink-faint flex items-center gap-3">
        <span><kbd className="font-sans font-semibold text-ink-muted">Click</kbd> to open</span>
        <span><kbd className="font-sans font-semibold text-ink-muted">Drag</kbd> to move</span>
        <span><kbd className="font-sans font-semibold text-ink-muted">Right-click</kbd> to reschedule</span>
      </div>
    </div>,
    document.body,
  )
}
