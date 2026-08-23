'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { Job } from '@/lib/types'
import { SLOT_MINUTES, timeToMinutes, minutesToTime, formatTime, DEFAULT_START_TIME, DEFAULT_END_TIME } from '@/lib/timeOptions'
import { colorForStaff, colorForStatus, STATUS_LABELS, UNASSIGNED_KEY } from './scheduleColors'
import { useLongPressReschedule } from './useLongPressReschedule'
import { useScheduleSensors } from './dndSensors'

// Day view shows a fixed 7am–6pm working window, compressed to fill
// whatever height is available (no vertical scrolling) — independent of the
// wider 6am–7pm range lib/timeOptions.ts exposes for the job time pickers.
const VIEW_START_MIN = 7 * 60
const VIEW_END_MIN = 18 * 60
const VIEW_RANGE_MIN = VIEW_END_MIN - VIEW_START_MIN
const MIN_BLOCK_PX = 50
const MAX_VISIBLE_STAFF = 6
const AXIS_WIDTH = 48

export type StaffRow = { id: string; name: string }

export type DragReschedulePayload = {
  job: Job
  toStaffKey: string
  newStartTime: string
  newEndTime: string
}

interface Props {
  jobs: Job[]
  staffRows: StaffRow[]
  isToday: boolean
  onOpenDetail: (job: Job) => void
  onReschedulePicker: (job: Job) => void
  onEmptySlotClick: (staffKey: string, startTime: string, endTime: string) => void
  onDragReschedule: (payload: DragReschedulePayload) => void
}

function minutesNow(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
function jobStart(job: Job): number {
  return timeToMinutes(job.start_time?.slice(0, 5) ?? DEFAULT_START_TIME)
}
function jobEnd(job: Job): number {
  return timeToMinutes(job.end_time?.slice(0, 5) ?? DEFAULT_END_TIME)
}
function firstName(name: string): string {
  return name.split(' ')[0] ?? name
}
// jobs.location is a strict enum on this schema (see scheduleColors.ts/MapView
// comments) — the real per-job address usually lives on the linked site.
function jobAddress(job: Job): string | null {
  return job.location ?? (job as Job & { sites?: { address: string | null } | null }).sites?.address ?? null
}
function pctOf(mins: number): number {
  return Math.max(0, Math.min(100, ((mins - VIEW_START_MIN) / VIEW_RANGE_MIN) * 100))
}

// Side-by-side lane assignment for jobs that overlap in time within the same
// staff column — without this, a double-booking would render one job
// completely hidden behind another instead of visibly side-by-side.
function assignLanes(jobs: Job[]): { laneByJob: Map<string, number>; totalLanes: number } {
  const sorted = [...jobs].sort((a, b) => jobStart(a) - jobStart(b))
  const laneEnds: number[] = []
  const laneByJob = new Map<string, number>()
  for (const job of sorted) {
    const start = jobStart(job)
    let lane = laneEnds.findIndex(end => end <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(jobEnd(job))
    } else {
      laneEnds[lane] = jobEnd(job)
    }
    laneByJob.set(job.id, lane)
  }
  return { laneByJob, totalLanes: Math.max(laneEnds.length, 1) }
}

const HOUR_MARKS = Array.from(
  { length: VIEW_RANGE_MIN / 60 + 1 },
  (_, i) => VIEW_START_MIN + i * 60,
)

function hourLabel(mins: number): string {
  const h24 = Math.floor(mins / 60)
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12} ${h24 < 12 ? 'AM' : 'PM'}`
}

// ─── hover card ─────────────────────────────────────────────────────────────

const HOVER_CARD_WIDTH = 288 // w-72

function JobHoverCard({ job, x, y }: { job: Job; x: number; y: number }) {
  const color = colorForStatus(job.status)
  const statusLabel = STATUS_LABELS[job.status ?? ''] ?? job.status ?? 'Pending'
  const address = jobAddress(job)

  // Flip to the cursor's left once the card would run off the right edge of
  // the viewport — same threshold either way (card width + the 16px offset).
  const overflowsRight = typeof window !== 'undefined' && x > window.innerWidth - 300
  const left = overflowsRight ? x - 16 - HOVER_CARD_WIDTH : x + 16

  return (
    <div
      className="fixed z-[70] pointer-events-none w-72 rounded-xl bg-white shadow-xl p-4 text-sm"
      style={{ left, top: y + 16 }}
    >
      <p className="font-semibold text-[#1A1A2E] mb-1.5 truncate">{job.title ?? job.job_type ?? 'Untitled job'}</p>
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mb-2.5"
        style={{ background: `${color.solid}1F`, color: color.solid }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color.solid }} />
        {statusLabel}
      </span>
      <dl className="space-y-1 text-xs text-[#6B7280]">
        <p><span className="font-medium text-[#1A1A2E]">Client:</span> {job.clients?.name ?? 'No client'}</p>
        <p><span className="font-medium text-[#1A1A2E]">Location:</span> {address ?? 'Not set'}</p>
        <p><span className="font-medium text-[#1A1A2E]">Type:</span> {job.job_type ?? 'Not set'}</p>
        <p><span className="font-medium text-[#1A1A2E]">Time:</span> {formatTime(job.start_time)} – {formatTime(job.end_time)}</p>
        <p><span className="font-medium text-[#1A1A2E]">Staff:</span> {job.staff?.name ?? 'Unassigned'}</p>
      </dl>
    </div>
  )
}

// ─── job block ──────────────────────────────────────────────────────────────

function JobBlock({
  job, topPct, heightPct, leftPct, widthPct, onOpen, onReschedule, onHover, onHoverMove, onHoverLeave,
}: {
  job: Job
  topPct: number
  heightPct: number
  leftPct: number
  widthPct: number
  onOpen: (job: Job) => void
  onReschedule: (job: Job) => void
  onHover: (job: Job, x: number, y: number) => void
  onHoverMove: (x: number, y: number) => void
  onHoverLeave: () => void
}) {
  const color = colorForStatus(job.status)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id, data: { job } })
  const { elRef, longPressFiredRef } = useLongPressReschedule(job, onReschedule)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (longPressFiredRef.current) { longPressFiredRef.current = false; return }
    onOpen(job)
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
      onMouseEnter={(e) => onHover(job, e.clientX, e.clientY)}
      onMouseMove={(e) => onHoverMove(e.clientX, e.clientY)}
      onMouseLeave={onHoverLeave}
      className="absolute rounded-md px-2 py-1 overflow-hidden cursor-pointer select-none transition-[filter] hover:brightness-125"
      style={{
        top: `${topPct}%`,
        height: `${heightPct}%`,
        minHeight: MIN_BLOCK_PX,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        background: `${color.solid}29`,
        borderLeft: `3px solid ${color.solid}`,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 0 : 1,
      }}
    >
      <p className="text-[12px] font-semibold leading-snug text-white truncate">
        {job.title ?? job.job_type ?? 'Untitled'}
      </p>
      <p className="text-[11px] leading-snug text-white/70 truncate">
        {job.clients?.name ?? 'No client'}
      </p>
    </div>
  )
}

// ─── staff column (droppable) ────────────────────────────────────────────────

function DayColumn({
  staffKey, dayJobs, onEmptySlotClick, onOpen, onReschedule, onHover, onHoverMove, onHoverLeave,
}: {
  staffKey: string
  dayJobs: Job[]
  onEmptySlotClick: (staffKey: string, startTime: string, endTime: string) => void
  onOpen: (job: Job) => void
  onReschedule: (job: Job) => void
  onHover: (job: Job, x: number, y: number) => void
  onHoverMove: (x: number, y: number) => void
  onHoverLeave: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: staffKey })
  const { laneByJob, totalLanes } = useMemo(() => assignLanes(dayJobs), [dayJobs])
  const isEmpty = dayJobs.length === 0

  function handleGridClick(e: React.MouseEvent) {
    // Approximate slot from click position within the column.
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientY - rect.top) / rect.height
    const rawStart = VIEW_START_MIN + pct * VIEW_RANGE_MIN
    const snapped = Math.round(rawStart / SLOT_MINUTES) * SLOT_MINUTES
    const startMin = Math.max(VIEW_START_MIN, Math.min(snapped, VIEW_END_MIN - SLOT_MINUTES))
    const endMin = Math.min(startMin + 120, VIEW_END_MIN)
    onEmptySlotClick(staffKey, minutesToTime(startMin), minutesToTime(endMin))
  }

  return (
    <div
      ref={setNodeRef}
      onClick={handleGridClick}
      className="relative flex-1 min-w-0 h-full cursor-pointer"
      style={{
        background: isOver ? 'rgba(201,168,76,0.08)' : 'transparent',
        borderRight: '1px solid #262626',
        borderLeft: isEmpty ? '1px dashed #3A3A3A' : undefined,
        borderTop: isEmpty ? '1px dashed #3A3A3A' : undefined,
        borderBottom: isEmpty ? '1px dashed #3A3A3A' : undefined,
      }}
    >
      {HOUR_MARKS.map(mark => (
        <div
          key={mark}
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: `${pctOf(mark)}%`, borderTop: '1px solid #262626' }}
        />
      ))}

      {dayJobs.map(job => {
        const start = Math.max(jobStart(job), VIEW_START_MIN)
        const end = Math.min(jobEnd(job), VIEW_END_MIN)
        const lane = laneByJob.get(job.id) ?? 0
        const widthPct = 100 / totalLanes
        return (
          <JobBlock
            key={job.id}
            job={job}
            topPct={pctOf(start)}
            heightPct={pctOf(end) - pctOf(start)}
            leftPct={lane * widthPct}
            widthPct={widthPct}
            onOpen={onOpen}
            onReschedule={onReschedule}
            onHover={onHover}
            onHoverMove={onHoverMove}
            onHoverLeave={onHoverLeave}
          />
        )
      })}
    </div>
  )
}

// ─── unassigned strip (below the grid) ───────────────────────────────────────

function UnassignedCard({
  job, onOpen, onReschedule, onHover, onHoverMove, onHoverLeave,
}: {
  job: Job
  onOpen: (job: Job) => void
  onReschedule: (job: Job) => void
  onHover: (job: Job, x: number, y: number) => void
  onHoverMove: (x: number, y: number) => void
  onHoverLeave: () => void
}) {
  const color = colorForStatus(job.status)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id, data: { job } })
  const { elRef, longPressFiredRef } = useLongPressReschedule(job, onReschedule)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (longPressFiredRef.current) { longPressFiredRef.current = false; return }
    onOpen(job)
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
      onMouseEnter={(e) => onHover(job, e.clientX, e.clientY)}
      onMouseMove={(e) => onHoverMove(e.clientX, e.clientY)}
      onMouseLeave={onHoverLeave}
      className="shrink-0 w-44 rounded-md px-2.5 py-1.5 cursor-pointer select-none hover:brightness-125 transition-[filter]"
      style={{
        background: `${color.solid}29`,
        borderLeft: `3px solid ${color.solid}`,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <p className="text-[12px] font-semibold leading-snug text-white truncate">{job.title ?? job.job_type ?? 'Untitled'}</p>
      <p className="text-[11px] leading-snug text-white/70 truncate">
        {job.clients?.name ?? 'No client'} · {formatTime(job.start_time)}
      </p>
    </div>
  )
}

function UnassignedStrip({
  jobs, onOpen, onReschedule, onAddClick, onHover, onHoverMove, onHoverLeave,
}: {
  jobs: Job[]
  onOpen: (job: Job) => void
  onReschedule: (job: Job) => void
  onAddClick: () => void
  onHover: (job: Job, x: number, y: number) => void
  onHoverMove: (x: number, y: number) => void
  onHoverLeave: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGNED_KEY })
  return (
    <div className="shrink-0 mt-3 h-20 rounded-lg flex flex-col" style={{ background: '#1A1A2E' }}>
      <div className="shrink-0 flex items-center gap-2 px-4 pt-2 pb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Unassigned</span>
        {jobs.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(107,114,128,0.3)', color: '#9CA3AF' }}>
            {jobs.length}
          </span>
        )}
        <button
          onClick={onAddClick}
          className="ml-auto text-[11px] font-medium text-gray-500 hover:text-white transition-colors"
        >
          + Add job
        </button>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 min-h-0 flex items-center gap-2 px-4 pb-2 overflow-x-auto"
        style={{ background: isOver ? 'rgba(201,168,76,0.08)' : 'transparent' }}
      >
        {jobs.length === 0 ? (
          <p className="text-xs text-gray-600">No unassigned jobs today</p>
        ) : (
          jobs.map(job => (
            <UnassignedCard
              key={job.id}
              job={job}
              onOpen={onOpen}
              onReschedule={onReschedule}
              onHover={onHover}
              onHoverMove={onHoverMove}
              onHoverLeave={onHoverLeave}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── current-time indicator ───────────────────────────────────────────────────
// Its own component (rather than state on the main grid) so its poll interval
// only re-renders this tiny bit of absolutely-positioned markup, not the
// whole grid — lets it update genuinely "in real time" without that cost.

function NowIndicator({ isToday }: { isToday: boolean }) {
  const [nowMin, setNowMin] = useState<number | null>(null)

  useEffect(() => {
    // Subscribing to the live clock — there's no React state this could be
    // derived from instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isToday) { setNowMin(null); return }
    setNowMin(minutesNow())
    const interval = setInterval(() => setNowMin(minutesNow()), 15000)
    return () => clearInterval(interval)
  }, [isToday])

  if (nowMin == null || nowMin < VIEW_START_MIN || nowMin > VIEW_END_MIN) return null
  const nowPct = pctOf(nowMin)

  return (
    <>
      <div
        className="absolute pointer-events-none"
        style={{ top: `${nowPct}%`, left: AXIS_WIDTH, right: 0, height: 2, background: '#C9A84C', boxShadow: '0 0 6px #C9A84C' }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{ top: `calc(${nowPct}% - 4px)`, left: AXIS_WIDTH - 5, width: 10, height: 10, background: '#C9A84C', boxShadow: '0 0 6px #C9A84C' }}
      />
    </>
  )
}

// ─── main grid ──────────────────────────────────────────────────────────────

export default function DayTimeGrid({
  jobs, staffRows, isToday,
  onOpenDetail, onReschedulePicker, onEmptySlotClick, onDragReschedule,
}: Props) {
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const sensors = useScheduleSensors()
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [staffPage, setStaffPage] = useState(0)
  const [hoverJob, setHoverJob] = useState<{ job: Job; x: number; y: number } | null>(null)

  // staffRows is the whole active roster, not just staff working this day —
  // with more than MAX_VISIBLE_STAFF active staff, alphabetical pagination
  // could put a staff member with a job today on a page that isn't shown by
  // default, making that job silently disappear from the grid. Put staff who
  // have a job on the visible day first (alphabetically within each group)
  // so today's jobs always land on page one whenever they'd fit.
  const orderedStaffRows = useMemo(() => {
    const staffWithJobs = new Set(jobs.filter(j => j.staff_id).map(j => j.staff_id))
    const withJobs = staffRows.filter(s => staffWithJobs.has(s.id))
    const withoutJobs = staffRows.filter(s => !staffWithJobs.has(s.id))
    return [...withJobs, ...withoutJobs]
  }, [staffRows, jobs])

  // Clamp rather than correct via effect — staffRows can shrink (e.g. a
  // staff member's last job today gets reassigned away) leaving staffPage
  // pointing past the new last page.
  const pageCount = Math.max(1, Math.ceil(orderedStaffRows.length / MAX_VISIBLE_STAFF))
  const safeStaffPage = Math.min(staffPage, pageCount - 1)
  const visibleStaff = orderedStaffRows.slice(safeStaffPage * MAX_VISIBLE_STAFF, safeStaffPage * MAX_VISIBLE_STAFF + MAX_VISIBLE_STAFF)

  const jobsByStaff: Record<string, Job[]> = {}
  const unassignedJobs: Job[] = []
  jobs.forEach(job => {
    if (!job.staff_id) { unassignedJobs.push(job); return }
    if (!jobsByStaff[job.staff_id]) jobsByStaff[job.staff_id] = []
    jobsByStaff[job.staff_id].push(job)
  })

  function handleDragStart(event: DragStartEvent) {
    setActiveJob((event.active.data.current?.job as Job | undefined) ?? null)
    setHoverJob(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null)
    const { active, over, delta } = event
    if (!over) return
    const job = active.data.current?.job as Job | undefined
    if (!job) return

    const fromStaffKey = job.staff_id ?? UNASSIGNED_KEY
    const toStaffKey = String(over.id)

    // Dragging into/within the Unassigned strip never moves it in time —
    // just changes (or keeps) the assignment.
    if (toStaffKey === UNASSIGNED_KEY) {
      if (fromStaffKey === UNASSIGNED_KEY) return
      const { start, end } = { start: jobStart(job), end: jobEnd(job) }
      onDragReschedule({ job, toStaffKey, newStartTime: minutesToTime(start), newEndTime: minutesToTime(end) })
      return
    }

    const pxPerMin = (bodyRef.current?.clientHeight ?? VIEW_RANGE_MIN) / VIEW_RANGE_MIN
    const fromStart = jobStart(job)
    const duration = jobEnd(job) - fromStart
    const deltaMinutes = Math.round((delta.y / pxPerMin) / SLOT_MINUTES) * SLOT_MINUTES
    const rawNewStart = fromStart + deltaMinutes
    const newStart = Math.max(VIEW_START_MIN, Math.min(rawNewStart, VIEW_END_MIN - duration))

    if (toStaffKey === fromStaffKey && newStart === fromStart) return

    onDragReschedule({
      job,
      toStaffKey,
      newStartTime: minutesToTime(newStart),
      newEndTime: minutesToTime(newStart + duration),
    })
  }

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col rounded-lg overflow-hidden" style={{ background: '#1A1A2E' }}>
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Header row */}
          <div className="flex items-center shrink-0" style={{ borderBottom: '1px solid #262626' }}>
            <div className="shrink-0 flex items-center justify-center" style={{ width: AXIS_WIDTH }}>
              {pageCount > 1 && (
                <button
                  onClick={() => setStaffPage(p => Math.max(0, p - 1))}
                  disabled={safeStaffPage === 0}
                  className="p-1 text-gray-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
                  aria-label="Previous staff"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}
            </div>
            {visibleStaff.map(col => {
              const staffColor = colorForStaff(col.id)
              return (
                <div key={col.id} className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2.5 px-2">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ background: staffColor.solid }}
                  >
                    {col.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[12px] font-medium text-white/85 truncate max-w-full">{firstName(col.name)}</span>
                </div>
              )
            })}
            <div className="shrink-0 flex items-center justify-center" style={{ width: AXIS_WIDTH }}>
              {pageCount > 1 && (
                <button
                  onClick={() => setStaffPage(p => Math.min(pageCount - 1, p + 1))}
                  disabled={safeStaffPage >= pageCount - 1}
                  className="p-1 text-gray-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
                  aria-label="Next staff"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div ref={bodyRef} className="relative flex-1 min-h-0 flex">
            <div className="shrink-0 relative" style={{ width: AXIS_WIDTH }}>
              {HOUR_MARKS.map(mark => (
                <span
                  key={mark}
                  className="absolute right-1.5 text-xs text-gray-500 -translate-y-1/2"
                  style={{ top: `${pctOf(mark)}%` }}
                >
                  {hourLabel(mark)}
                </span>
              ))}
            </div>

            {visibleStaff.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-500">No staff to display</p>
              </div>
            ) : (
              visibleStaff.map(col => (
                <DayColumn
                  key={col.id}
                  staffKey={col.id}
                  dayJobs={jobsByStaff[col.id] ?? []}
                  onEmptySlotClick={onEmptySlotClick}
                  onOpen={onOpenDetail}
                  onReschedule={onReschedulePicker}
                  onHover={(job, x, y) => setHoverJob({ job, x, y })}
                  onHoverMove={(x, y) => setHoverJob(prev => (prev ? { ...prev, x, y } : prev))}
                  onHoverLeave={() => setHoverJob(null)}
                />
              ))
            )}

            <NowIndicator isToday={isToday} />
          </div>
        </div>

        <UnassignedStrip
          jobs={unassignedJobs}
          onOpen={onOpenDetail}
          onReschedule={onReschedulePicker}
          onAddClick={() => onEmptySlotClick(UNASSIGNED_KEY, '08:00', '10:00')}
          onHover={(job, x, y) => setHoverJob({ job, x, y })}
          onHoverMove={(x, y) => setHoverJob(prev => (prev ? { ...prev, x, y } : prev))}
          onHoverLeave={() => setHoverJob(null)}
        />

        {hoverJob && <JobHoverCard job={hoverJob.job} x={hoverJob.x} y={hoverJob.y} />}

        <DragOverlay>
          {activeJob && (
            <div
              className="rounded-md px-2 py-1 w-40"
              style={{
                minHeight: MIN_BLOCK_PX,
                background: `${colorForStatus(activeJob.status).solid}29`,
                borderLeft: `3px solid ${colorForStatus(activeJob.status).solid}`,
              }}
            >
              <p className="text-[12px] font-semibold text-white truncate">{activeJob.title ?? activeJob.job_type ?? 'Untitled'}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
