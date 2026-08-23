'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  DAY_START_MIN, DAY_END_MIN, SLOT_MINUTES, timeToMinutes, minutesToTime,
  formatTime, DEFAULT_START_TIME, DEFAULT_END_TIME,
} from '@/lib/timeOptions'
import { colorForStaff, glassCardStyle, UNASSIGNED_KEY } from './scheduleColors'
import { useLongPressReschedule } from './useLongPressReschedule'
import { useScheduleSensors } from './dndSensors'

const ROW_PX = 56
const SLOT_COUNT = (DAY_END_MIN - DAY_START_MIN) / SLOT_MINUTES
const GRID_HEIGHT = SLOT_COUNT * ROW_PX
const AXIS_WIDTH = 64

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
  hasUnassigned: boolean
  isToday: boolean
  onReschedulePicker: (job: Job) => void
  onHover: (job: Job, x: number, y: number) => void
  onMove: (x: number, y: number) => void
  onLeave: () => void
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

function timeAxisLabel(mins: number): string | null {
  if (mins % 60 !== 0) return null
  const h24 = Math.floor(mins / 60)
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const ampm = h24 < 12 ? 'AM' : 'PM'
  return `${h12} ${ampm}`
}

// ─── job block ──────────────────────────────────────────────────────────────

function JobBlock({
  job, top, height, leftPct, widthPct, onReschedule, onHover, onMove, onLeave,
}: {
  job: Job
  top: number
  height: number
  leftPct: number
  widthPct: number
  onReschedule: (job: Job) => void
  onHover: (job: Job, x: number, y: number) => void
  onMove: (x: number, y: number) => void
  onLeave: () => void
}) {
  const router = useRouter()
  const color = colorForStaff(job.staff_id)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id, data: { job } })
  const { elRef, longPressFiredRef } = useLongPressReschedule(job, onReschedule)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (longPressFiredRef.current) { longPressFiredRef.current = false; return }
    router.push(`/jobs/${job.id}`)
  }
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onReschedule(job)
  }

  const showTime = height >= 38
  const showClient = height >= 68

  return (
    <div
      ref={(el) => { setNodeRef(el); elRef.current = el }}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={(e) => onHover(job, e.clientX, e.clientY)}
      onMouseMove={(e) => onMove(e.clientX, e.clientY)}
      onMouseLeave={onLeave}
      className="absolute rounded-lg px-2 py-1 overflow-hidden cursor-pointer select-none transition-[filter] hover:brightness-110"
      style={{
        top,
        height: Math.max(height - 2, 26),
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        ...glassCardStyle(color.rgb),
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 0 : 1,
      }}
    >
      <p className="text-[12px] font-bold leading-snug text-white truncate">
        {job.title ?? job.job_type ?? 'Untitled'}
      </p>
      {showTime && (
        <p className="text-[10px] leading-snug text-white/70 truncate">
          {formatTime(job.start_time)} – {formatTime(job.end_time)}
        </p>
      )}
      {showClient && job.clients?.name && (
        <p className="text-[10px] leading-snug text-white/60 truncate">{job.clients.name}</p>
      )}
    </div>
  )
}

// ─── staff column (droppable) ────────────────────────────────────────────────

function DayColumn({
  staffKey, dayJobs, onEmptySlotClick, onReschedule, onHover, onMove, onLeave,
}: {
  staffKey: string
  dayJobs: Job[]
  onEmptySlotClick: (staffKey: string, startTime: string, endTime: string) => void
  onReschedule: (job: Job) => void
  onHover: (job: Job, x: number, y: number) => void
  onMove: (x: number, y: number) => void
  onLeave: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: staffKey })
  const { laneByJob, totalLanes } = useMemo(() => assignLanes(dayJobs), [dayJobs])

  return (
    <div
      ref={setNodeRef}
      className="relative flex-1 min-w-0 border-r"
      style={{ height: GRID_HEIGHT, background: isOver ? 'rgba(201, 168, 76,0.08)' : 'transparent', borderColor: 'rgba(96,165,250,0.1)' }}
    >
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const slotStart = DAY_START_MIN + i * SLOT_MINUTES
        const isHourMark = slotStart % 60 === 0
        return (
          <div
            key={i}
            onClick={() => {
              const endMin = Math.min(slotStart + 120, DAY_END_MIN)
              onEmptySlotClick(staffKey, minutesToTime(slotStart), minutesToTime(endMin))
            }}
            className="cursor-pointer hover:bg-white/[0.02] transition-colors"
            style={{
              height: ROW_PX,
              borderTop: `1px solid ${isHourMark ? 'rgba(96,165,250,0.16)' : 'rgba(96,165,250,0.06)'}`,
            }}
          />
        )
      })}

      {dayJobs.map(job => {
        const start = jobStart(job)
        const end = jobEnd(job)
        const top = ((start - DAY_START_MIN) / SLOT_MINUTES) * ROW_PX
        const height = ((end - start) / SLOT_MINUTES) * ROW_PX
        const lane = laneByJob.get(job.id) ?? 0
        const widthPct = 100 / totalLanes
        return (
          <JobBlock
            key={job.id}
            job={job}
            top={top}
            height={height}
            leftPct={lane * widthPct}
            widthPct={widthPct}
            onReschedule={onReschedule}
            onHover={onHover}
            onMove={onMove}
            onLeave={onLeave}
          />
        )
      })}
    </div>
  )
}

// ─── main grid ──────────────────────────────────────────────────────────────

export default function DayTimeGrid({
  jobs, staffRows, hasUnassigned, isToday,
  onReschedulePicker, onHover, onMove, onLeave, onEmptySlotClick, onDragReschedule,
}: Props) {
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const sensors = useScheduleSensors()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [nowMin, setNowMin] = useState<number | null>(null)

  useEffect(() => {
    // Subscribing to the live clock — there's no React state this could be
    // derived from instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isToday) { setNowMin(null); return }
    setNowMin(minutesNow())
    const interval = setInterval(() => setNowMin(minutesNow()), 60000)
    return () => clearInterval(interval)
  }, [isToday])

  // Skip the early-morning dead zone by default so the working hours are in view.
  useEffect(() => {
    if (!containerRef.current) return
    const anchor = isToday && nowMin != null ? Math.max(nowMin - 60, DAY_START_MIN) : 7 * 60
    containerRef.current.scrollTop = ((anchor - DAY_START_MIN) / SLOT_MINUTES) * ROW_PX
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday])

  const jobsByStaff: Record<string, Job[]> = {}
  jobs.forEach(job => {
    const key = job.staff_id ?? UNASSIGNED_KEY
    if (!jobsByStaff[key]) jobsByStaff[key] = []
    jobsByStaff[key].push(job)
  })

  function handleDragStart(event: DragStartEvent) {
    setActiveJob((event.active.data.current?.job as Job | undefined) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null)
    const { active, over, delta } = event
    if (!over) return
    const job = active.data.current?.job as Job | undefined
    if (!job) return

    const fromStaffKey = job.staff_id ?? UNASSIGNED_KEY
    const toStaffKey = String(over.id)
    const fromStart = jobStart(job)
    const duration = jobEnd(job) - fromStart

    const rawNewStart = fromStart + Math.round(delta.y / ROW_PX) * SLOT_MINUTES
    const newStart = Math.max(DAY_START_MIN, Math.min(rawNewStart, DAY_END_MIN - duration))

    if (toStaffKey === fromStaffKey && newStart === fromStart) return

    onDragReschedule({
      job,
      toStaffKey,
      newStartTime: minutesToTime(newStart),
      newEndTime: minutesToTime(newStart + duration),
    })
  }

  const nowTop = nowMin != null
    ? Math.max(0, Math.min(((nowMin - DAY_START_MIN) / SLOT_MINUTES) * ROW_PX, GRID_HEIGHT))
    : null

  const columns = [
    ...staffRows.map(s => ({ key: s.id, label: s.name })),
    ...(hasUnassigned ? [{ key: UNASSIGNED_KEY, label: 'Unassigned' }] : []),
  ]

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 1200px 460px at 50% 0%, rgba(59,130,246,0.14), transparent 70%), #1A1A2E',
        boxShadow: '0 0 50px rgba(59,130,246,0.1), inset 0 0 0 1px rgba(96,165,250,0.14)',
      }}
    >
      <div ref={containerRef} className="overflow-y-auto overflow-x-hidden h-[calc(100vh-230px)]">
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="min-w-full">
            {/* Header row */}
            <div className="flex sticky top-0 z-20">
              <div
                className="shrink-0 sticky left-0 z-30 flex items-end justify-center pb-2"
                style={{ width: AXIS_WIDTH, background: '#1A1A2E', borderBottom: '1px solid rgba(96,165,250,0.16)', borderRight: '1px solid rgba(96,165,250,0.12)' }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-300/40">Time</span>
              </div>
              {columns.map(col => (
                <div
                  key={col.key}
                  className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1.5 py-3 px-2"
                  style={{
                    background: '#1A1A2E',
                    borderBottom: isToday ? '2px solid #C9A84C' : '1px solid rgba(96,165,250,0.16)',
                    boxShadow: isToday ? 'inset 0 -10px 14px -10px rgba(201, 168, 76,0.4)' : undefined,
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{
                      background: col.key === UNASSIGNED_KEY ? '#475569' : '#C9A84C',
                      boxShadow: col.key === UNASSIGNED_KEY ? undefined : '0 0 10px rgba(201, 168, 76,0.5)',
                    }}
                  >
                    {col.label.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[12px] font-medium text-white/85 truncate max-w-full">{col.label}</span>
                </div>
              ))}
            </div>

            {/* Body */}
            <div className="relative flex" style={{ height: GRID_HEIGHT }}>
              <div
                className="shrink-0 sticky left-0 z-10"
                style={{ width: AXIS_WIDTH, background: '#1A1A2E', borderRight: '1px solid rgba(96,165,250,0.12)' }}
              >
                {Array.from({ length: SLOT_COUNT }, (_, i) => {
                  const mins = DAY_START_MIN + i * SLOT_MINUTES
                  const label = timeAxisLabel(mins)
                  return (
                    <div key={i} style={{ height: ROW_PX }} className="relative">
                      {label && (
                        <span className="absolute -top-2 right-2 text-[10px] text-blue-200/40 font-medium">
                          {label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {columns.map(col => (
                <DayColumn
                  key={col.key}
                  staffKey={col.key}
                  dayJobs={jobsByStaff[col.key] ?? []}
                  onEmptySlotClick={onEmptySlotClick}
                  onReschedule={onReschedulePicker}
                  onHover={onHover}
                  onMove={onMove}
                  onLeave={onLeave}
                />
              ))}

              {nowTop != null && (
                <>
                  <div
                    className="absolute pointer-events-none"
                    style={{ top: nowTop, left: AXIS_WIDTH, right: 0, height: 2, background: '#C9A84C', boxShadow: '0 0 8px #C9A84C, 0 0 2px #C9A84C' }}
                  />
                  <div
                    className="absolute pointer-events-none rounded-full"
                    style={{ top: nowTop - 4, left: AXIS_WIDTH - 5, width: 10, height: 10, background: '#C9A84C', boxShadow: '0 0 8px #C9A84C' }}
                  />
                </>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeJob && (
              <div
                className="rounded-lg px-2 py-1 w-40"
                style={{
                  height: Math.max(((jobEnd(activeJob) - jobStart(activeJob)) / SLOT_MINUTES) * ROW_PX - 2, 26),
                  ...glassCardStyle(colorForStaff(activeJob.staff_id).rgb),
                }}
              >
                <p className="text-[12px] font-bold text-white truncate">{activeJob.title ?? activeJob.job_type ?? 'Untitled'}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
