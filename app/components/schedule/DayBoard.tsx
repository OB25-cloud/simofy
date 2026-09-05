'use client'

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useDroppable } from '@dnd-kit/core'
import Link from 'next/link'
import { minutesToTime } from '@/lib/timeOptions'
import { colorForStatus } from './scheduleColors'
import {
  SNAP_MIN, VIEW_END_MIN, VIEW_RANGE_MIN, VIEW_START_MIN,
  assignLanes, compactTime, durationLabel, jobDurationMin, jobEndMin, jobStartMin, snapMinutes,
  type ScheduleJob,
} from './scheduleDates'
import { useDropPreview } from './dragPreviewStore'
import { DayJobBlock } from './JobBlock'
import StaffAvatar from './StaffAvatar'

export const STAFF_COL_W = 200
export const HEADER_H = 40
// Taller lanes so blocks read (and tap) easily: 80px lane → 72px block.
const LANE_H = 80
const ROW_PAD = 8
// Below this the track scrolls horizontally instead of squeezing further —
// sized so a 1440px laptop with the sidebar and unassigned panel open fits.
const MIN_HOUR_PX = 52
const DEFAULT_NEW_JOB_MIN = 120

export type StaffRow = { id: string; name: string }

export function rowIdFor(staffId: string): string {
  return `row:${staffId}`
}
export function staffIdFromRowId(rowId: string): string | null {
  return rowId.startsWith('row:') ? rowId.slice(4) : null
}

// Row track elements, registered by the board and read by the scheduler's
// drag handlers to translate a pointer position into a staff row + snapped
// start time (a track's width is exactly VIEW_RANGE_MIN × pxPerMin).
export type BoardGeometry = {
  rows: Map<string, HTMLElement>
}

interface Props {
  jobs: ScheduleJob[]
  staffRows: StaffRow[]
  isToday: boolean
  hideFree: boolean
  geometry: MutableRefObject<BoardGeometry>
  onOpen: (job: ScheduleJob) => void
  onReschedulePicker: (job: ScheduleJob) => void
  onEmptySlotClick: (staffId: string, startTime: string, endTime: string) => void
  onResizeEnd: (job: ScheduleJob, newEndTime: string) => void
}

const HOURS = Array.from({ length: VIEW_RANGE_MIN / 60 + 1 }, (_, i) => VIEW_START_MIN + i * 60)

function hourLabel(mins: number): string {
  const h = mins / 60
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function useNowMinutes(enabled: boolean): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    // Subscribing to the wall clock — nothing in React state to derive from.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!enabled) { setNow(null); return }
    const tick = () => { const d = new Date(); setNow(d.getHours() * 60 + d.getMinutes()) }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [enabled])
  return now
}

// ─── staff row ───────────────────────────────────────────────────────────────

interface RowProps {
  staff: StaffRow
  jobs: ScheduleJob[]
  pxPerMin: number
  trackWidth: number
  geometry: MutableRefObject<BoardGeometry>
  onOpen: (job: ScheduleJob) => void
  onReschedulePicker: (job: ScheduleJob) => void
  onEmptySlotClick: (staffId: string, startTime: string, endTime: string) => void
  onResizeEnd: (job: ScheduleJob, newEndTime: string) => void
}

function StaffRowInner({ staff, jobs, pxPerMin, trackWidth, geometry, onOpen, onReschedulePicker, onEmptySlotClick, onResizeEnd }: RowProps) {
  const rowId = rowIdFor(staff.id)
  const { setNodeRef, isOver } = useDroppable({ id: rowId })
  const preview = useDropPreview(rowId)
  const [hoverMin, setHoverMin] = useState<number | null>(null)

  const { laneByJob, laneCount } = useMemo(() => assignLanes(jobs), [jobs])
  const rowHeight = laneCount * LANE_H + ROW_PAD * 2
  const hourPx = 60 * pxPerMin

  const totalMin = jobs.reduce((sum, j) => sum + jobDurationMin(j), 0)
  const summary = jobs.length === 0
    ? 'Free all day'
    : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} · ${durationLabel(totalMin)}`

  function minutesAt(clientX: number, el: HTMLElement): number {
    const rect = el.getBoundingClientRect()
    const raw = VIEW_START_MIN + (clientX - rect.left) / pxPerMin
    return Math.max(VIEW_START_MIN, Math.min(snapMinutes(raw), VIEW_END_MIN - SNAP_MIN))
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) { if (hoverMin != null) setHoverMin(null); return }
    const m = minutesAt(e.clientX, e.currentTarget)
    if (m !== hoverMin) setHoverMin(m)
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    const start = minutesAt(e.clientX, e.currentTarget)
    const end = Math.min(start + DEFAULT_NEW_JOB_MIN, VIEW_END_MIN)
    onEmptySlotClick(staff.id, minutesToTime(start), minutesToTime(end))
  }

  const ghostStart = hoverMin
  const ghostEnd = ghostStart != null ? Math.min(ghostStart + 60, VIEW_END_MIN) : null
  const previewColor = preview ? colorForStatus(jobs.find(j => j.id === preview.jobId)?.status ?? 'scheduled') : null

  return (
    <div className="flex border-b border-line-soft last:border-b-0" style={{ height: rowHeight }}>
      {/* Staff cell — sticky so names stay put on horizontal scroll */}
      <div
        className="sticky left-0 z-20 shrink-0 flex items-center gap-3 px-4 bg-white border-r border-line"
        style={{ width: STAFF_COL_W, boxShadow: isOver ? 'inset 3px 0 0 var(--accent)' : undefined, transition: 'box-shadow 120ms' }}
      >
        <StaffAvatar staffId={staff.id} name={staff.name} size="md" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink truncate leading-tight">{staff.name}</p>
          <p className={['text-[11px] truncate mt-0.5', jobs.length === 0 ? 'text-ink-faint' : 'text-ink-muted'].join(' ')}>{summary}</p>
        </div>
      </div>

      {/* Track */}
      <div
        ref={(el) => {
          setNodeRef(el)
          if (el) geometry.current.rows.set(rowId, el)
          else geometry.current.rows.delete(rowId)
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverMin(null)}
        onClick={handleClick}
        className="relative shrink-0 cursor-cell transition-colors duration-150"
        style={{
          width: trackWidth,
          background: isOver ? 'var(--accent-soft)' : 'transparent',
          backgroundImage: `linear-gradient(to right, var(--line-soft) 1px, transparent 1px), linear-gradient(to right, var(--line) 1px, transparent 1px)`,
          backgroundSize: `${hourPx / 2}px 100%, ${hourPx}px 100%`,
        }}
      >
        {/* Hover "add here" ghost */}
        {ghostStart != null && ghostEnd != null && !preview && (
          <div
            className="absolute rounded-lg border border-dashed border-accent/50 bg-accent-soft/70 flex items-center justify-center gap-1 pointer-events-none text-[11px] font-semibold text-accent"
            style={{ left: (ghostStart - VIEW_START_MIN) * pxPerMin + 1, width: (ghostEnd - ghostStart) * pxPerMin - 2, top: ROW_PAD, height: LANE_H - 4 }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {compactTime(minutesToTime(ghostStart))}
          </div>
        )}

        {/* Live drop preview */}
        {preview && previewColor && (
          <div
            className="absolute rounded-lg pointer-events-none z-30 flex items-end"
            style={{
              left: (preview.startMin - VIEW_START_MIN) * pxPerMin + 1,
              width: (preview.endMin - preview.startMin) * pxPerMin - 2,
              top: ROW_PAD, height: LANE_H - 4,
              background: previewColor.tintStrong,
              border: `1.5px dashed ${previewColor.solid}`,
            }}
          >
            <span
              className="absolute -top-6 left-0 text-[10.5px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md text-white whitespace-nowrap shadow-sm"
              style={{ background: previewColor.solid }}
            >
              {compactTime(minutesToTime(preview.startMin))} – {compactTime(minutesToTime(preview.endMin))}
            </span>
          </div>
        )}

        {jobs.map(job => {
          const start = Math.max(jobStartMin(job), VIEW_START_MIN)
          const end = Math.min(jobEndMin(job), VIEW_END_MIN)
          if (end <= start) return null
          const lane = laneByJob.get(job.id) ?? 0
          return (
            <DayJobBlock
              key={job.id}
              job={job}
              left={(start - VIEW_START_MIN) * pxPerMin + 1}
              width={(end - start) * pxPerMin - 2}
              top={ROW_PAD + lane * LANE_H}
              height={LANE_H - 4}
              pxPerMin={pxPerMin}
              onOpen={onOpen}
              onReschedulePicker={onReschedulePicker}
              onResizeEnd={onResizeEnd}
            />
          )
        })}
      </div>
    </div>
  )
}

const StaffRowView = memo(StaffRowInner)

// ─── board ───────────────────────────────────────────────────────────────────

export default function DayBoard({ jobs, staffRows, isToday, hideFree, geometry, onOpen, onReschedulePicker, onEmptySlotClick, onResizeEnd }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [containerW, setContainerW] = useState(0)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setContainerW(entry.contentRect.width)
    })
    ro.observe(el)
    setContainerW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const trackWidth = Math.max(containerW - STAFF_COL_W, MIN_HOUR_PX * (VIEW_RANGE_MIN / 60))
  const pxPerMin = trackWidth / VIEW_RANGE_MIN

  const jobsByStaff = useMemo(() => {
    const map = new Map<string, ScheduleJob[]>()
    for (const job of jobs) {
      if (!job.staff_id) continue
      const list = map.get(job.staff_id)
      if (list) list.push(job)
      else map.set(job.staff_id, [job])
    }
    return map
  }, [jobs])

  const EMPTY: ScheduleJob[] = useMemo(() => [], [])
  const visibleRows = hideFree ? staffRows.filter(s => (jobsByStaff.get(s.id)?.length ?? 0) > 0) : staffRows

  const nowMin = useNowMinutes(isToday)
  const showNow = nowMin != null && nowMin >= VIEW_START_MIN && nowMin <= VIEW_END_MIN
  const nowX = showNow ? STAFF_COL_W + (nowMin! - VIEW_START_MIN) * pxPerMin : 0

  // Scroll the current time into view on first paint of today's board when
  // the track is wider than the viewport.
  const scrolledRef = useRef(false)
  useEffect(() => {
    if (scrolledRef.current || !showNow || !scrollRef.current) return
    const el = scrollRef.current
    if (el.scrollWidth <= el.clientWidth + 4) return
    el.scrollLeft = Math.max(0, nowX - el.clientWidth / 2)
    scrolledRef.current = true
  }, [showNow, nowX])

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-surface overflow-hidden">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto overscroll-contain">
        <div className="relative" style={{ minWidth: STAFF_COL_W + trackWidth }}>
          {/* Header */}
          <div className="sticky top-0 z-30 flex bg-surface-muted/95 backdrop-blur-sm border-b border-line" style={{ height: HEADER_H }}>
            <div className="sticky left-0 z-40 shrink-0 flex items-center px-4 bg-surface-muted border-r border-line" style={{ width: STAFF_COL_W }}>
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                Staff <span className="text-ink-faint font-medium normal-case tracking-normal">· {visibleRows.length}</span>
              </span>
            </div>
            <div className="relative shrink-0" style={{ width: trackWidth }}>
              {HOURS.map(h => {
                const x = (h - VIEW_START_MIN) * pxPerMin
                const last = h === VIEW_END_MIN
                return (
                  <div key={h} className="absolute inset-y-0" style={{ left: x }}>
                    <span className="absolute bottom-0 w-px h-2 bg-line" />
                    {!last && (
                      <span className="absolute top-1/2 -translate-y-1/2 left-1.5 text-[11px] font-medium tabular-nums text-ink-muted whitespace-nowrap">
                        {hourLabel(h)}
                      </span>
                    )}
                  </div>
                )
              })}
              {Array.from({ length: VIEW_RANGE_MIN / 60 }, (_, i) => (
                <span key={i} className="absolute bottom-0 w-px h-1 bg-line-soft" style={{ left: (i * 60 + 30) * pxPerMin }} />
              ))}
              {showNow && (
                <span
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md text-white shadow-sm z-10"
                  style={{ left: nowX - STAFF_COL_W, background: 'var(--accent)' }}
                >
                  {compactTime(minutesToTime(nowMin!))}
                </span>
              )}
            </div>
          </div>

          {/* Rows */}
          {visibleRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <p className="text-sm font-medium text-ink">{staffRows.length === 0 ? 'No active staff yet' : 'Everyone is free today'}</p>
              <p className="text-xs text-ink-muted mt-1">
                {staffRows.length === 0
                  ? <>Add your crew on the <Link href="/staff" className="text-accent font-semibold hover:underline">Staff page</Link> to start scheduling.</>
                  : 'Turn off "Hide free staff" to see every row.'}
              </p>
            </div>
          ) : (
            visibleRows.map(staff => (
              <StaffRowView
                key={staff.id}
                staff={staff}
                jobs={jobsByStaff.get(staff.id) ?? EMPTY}
                pxPerMin={pxPerMin}
                trackWidth={trackWidth}
                geometry={geometry}
                onOpen={onOpen}
                onReschedulePicker={onReschedulePicker}
                onEmptySlotClick={onEmptySlotClick}
                onResizeEnd={onResizeEnd}
              />
            ))
          )}

          {/* Current time line — below sticky staff cells (z-20), above tracks */}
          {showNow && visibleRows.length > 0 && (
            <div className="absolute pointer-events-none z-10" style={{ left: nowX, top: HEADER_H, bottom: 0 }}>
              <div className="w-px h-full" style={{ background: 'var(--accent)', boxShadow: '0 0 0 1px rgba(21,128,61,0.12)' }} />
              <span className="absolute -top-1 -translate-x-1/2 left-px w-2 h-2 rounded-full ring-2 ring-white" style={{ background: 'var(--accent)' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
