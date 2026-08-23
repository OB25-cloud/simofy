'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { Job } from '@/lib/types'
import { formatTime } from '@/lib/timeOptions'
import { colorForStaff, glassCardStyle, UNASSIGNED_KEY } from './scheduleColors'
import { useLongPressReschedule } from './useLongPressReschedule'
import { useScheduleSensors } from './dndSensors'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export type StaffRow = { id: string; name: string }

export type WeekDragReschedulePayload = {
  job: Job
  toStaffKey: string
  toDateKey: string
}

interface Props {
  jobs: Job[]
  staffRows: StaffRow[]
  hasUnassigned: boolean
  weekDays: Date[]
  todayKey: string
  toDateKey: (d: Date) => string
  onReschedulePicker: (job: Job) => void
  onHover: (job: Job, x: number, y: number) => void
  onMove: (x: number, y: number) => void
  onLeave: () => void
  onEmptyCellClick: (staffKey: string, dateKey: string) => void
  onDragReschedule: (payload: WeekDragReschedulePayload) => void
}

// ─── job pill ───────────────────────────────────────────────────────────────

function JobPill({
  job, onReschedule, onHover, onMove, onLeave,
}: {
  job: Job
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
      className="cursor-pointer rounded-md px-2 py-1.5 min-h-[40px] flex flex-col justify-center hover:brightness-110 transition-[filter] select-none"
      style={{
        ...glassCardStyle(color.rgb),
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <p className="text-[12px] font-bold leading-snug text-white truncate">
        {job.title ?? job.job_type ?? 'Untitled'}
      </p>
      <p className="text-[10px] leading-snug text-white/70 truncate">
        {formatTime(job.start_time)}{job.clients?.name ? ` · ${job.clients.name}` : ''}
      </p>
    </div>
  )
}

// ─── grid cell (drop target) ─────────────────────────────────────────────────

function GridCell({
  id, isToday, stripe, onEmptyClick, children,
}: {
  id: string
  isToday: boolean
  stripe: boolean
  onEmptyClick: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const background = isOver
    ? 'rgba(201, 168, 76,0.16)'
    : isToday
      ? 'rgba(201, 168, 76,0.07)'
      : stripe
        ? 'rgba(96,165,250,0.05)'
        : 'transparent'

  return (
    <div
      ref={setNodeRef}
      onClick={onEmptyClick}
      className="flex-1 p-1.5 flex flex-col gap-1 min-h-[56px] border-r last:border-r-0 cursor-pointer transition-colors"
      style={{ background, borderColor: 'rgba(96,165,250,0.1)' }}
    >
      {children}
    </div>
  )
}

// ─── main grid ──────────────────────────────────────────────────────────────

export default function WeekGrid({
  jobs, staffRows, hasUnassigned, weekDays, todayKey, toDateKey,
  onReschedulePicker, onHover, onMove, onLeave, onEmptyCellClick, onDragReschedule,
}: Props) {
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const sensors = useScheduleSensors()

  const jobsByCell: Record<string, Job[]> = {}
  jobs.forEach(job => {
    const dateKey = job.scheduled_date?.split('T')[0]
    if (!dateKey) return
    const staffKey = job.staff_id ?? UNASSIGNED_KEY
    const key = `${staffKey}|${dateKey}`
    if (!jobsByCell[key]) jobsByCell[key] = []
    jobsByCell[key].push(job)
  })

  function handleDragStart(event: DragStartEvent) {
    setActiveJob((event.active.data.current?.job as Job | undefined) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null)
    const { active, over } = event
    if (!over) return
    const job = active.data.current?.job as Job | undefined
    if (!job) return

    const fromDateKey = job.scheduled_date?.split('T')[0]
    const fromStaffKey = job.staff_id ?? UNASSIGNED_KEY
    const [toStaffKey, toDateKey] = String(over.id).split('|')
    if (!fromDateKey || !toDateKey) return
    if (fromDateKey === toDateKey && fromStaffKey === toStaffKey) return

    onDragReschedule({ job, toStaffKey, toDateKey })
  }

  const columns = [
    ...staffRows.map(s => ({ key: s.id, name: s.name })),
    ...(hasUnassigned ? [{ key: UNASSIGNED_KEY, name: 'Unassigned' }] : []),
  ]

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 1200px 460px at 50% 0%, rgba(59,130,246,0.14), transparent 70%), #1A1A2E',
        boxShadow: '0 0 50px rgba(59,130,246,0.1), inset 0 0 0 1px rgba(96,165,250,0.14)',
      }}
    >
      <div className="overflow-y-auto overflow-x-hidden h-[calc(100vh-230px)]">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="min-w-full">
            {/* Header row */}
            <div className="flex sticky top-0 z-20">
              <div
                className="w-[160px] shrink-0 sticky left-0 z-30 flex items-center px-4 py-3"
                style={{ background: '#1A1A2E', borderBottom: '1px solid rgba(96,165,250,0.16)', borderRight: '1px solid rgba(96,165,250,0.12)' }}
              >
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-300/40">Staff</span>
              </div>
              {weekDays.map((day, i) => {
                const isToday = toDateKey(day) === todayKey
                return (
                  <div
                    key={i}
                    className="flex-1 px-3 py-2.5 text-center border-r last:border-r-0"
                    style={{
                      borderColor: 'rgba(96,165,250,0.12)',
                      borderBottom: isToday ? '2px solid #C9A84C' : '1px solid rgba(96,165,250,0.16)',
                      boxShadow: isToday ? 'inset 0 -10px 14px -10px rgba(201, 168, 76,0.35)' : undefined,
                    }}
                  >
                    <p className="text-[13px] font-bold" style={{ color: isToday ? '#C9A84C' : '#fff' }}>
                      {DAY_NAMES[i]}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: isToday ? '#C9A84C' : 'rgba(148,180,219,0.55)' }}>
                      {day.getDate()} {day.toLocaleDateString('en-NZ', { month: 'short' })}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Body */}
            {columns.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-sm text-blue-200/40">No active staff to schedule</p>
              </div>
            ) : (
              columns.map((col, rowIndex) => (
                <div key={col.key} className="flex">
                  <div
                    className="w-[160px] shrink-0 sticky left-0 z-10 flex items-center gap-2.5 px-4 py-3"
                    style={{ background: '#1A1A2E', borderRight: '1px solid rgba(96,165,250,0.12)', borderBottom: '1px solid rgba(96,165,250,0.1)' }}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                      style={{
                        background: col.key === UNASSIGNED_KEY ? '#475569' : '#C9A84C',
                        boxShadow: col.key === UNASSIGNED_KEY ? undefined : '0 0 10px rgba(201, 168, 76,0.5)',
                      }}
                    >
                      {col.key === UNASSIGNED_KEY ? '?' : col.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-[13px] font-medium truncate" style={{ color: col.key === UNASSIGNED_KEY ? 'rgba(255,255,255,0.7)' : '#fff' }}>
                      {col.name}
                    </span>
                  </div>
                  <div className="flex flex-1">
                    {weekDays.map((day, i) => {
                      const dateKey = toDateKey(day)
                      const isToday = dateKey === todayKey
                      const cellJobs = jobsByCell[`${col.key}|${dateKey}`] ?? []
                      return (
                        <div key={i} className="flex-1" style={{ borderBottom: '1px solid rgba(96,165,250,0.1)' }}>
                          <GridCell
                            id={`${col.key}|${dateKey}`}
                            isToday={isToday}
                            stripe={rowIndex % 2 === 1}
                            onEmptyClick={() => onEmptyCellClick(col.key, dateKey)}
                          >
                            {cellJobs.map(job => (
                              <JobPill
                                key={job.id}
                                job={job}
                                onReschedule={onReschedulePicker}
                                onHover={onHover}
                                onMove={onMove}
                                onLeave={onLeave}
                              />
                            ))}
                          </GridCell>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <DragOverlay>
            {activeJob && (
              <div
                className="rounded-md px-2 py-1.5 min-h-[40px] flex flex-col justify-center shadow-lg cursor-grabbing"
                style={glassCardStyle(colorForStaff(activeJob.staff_id).rgb)}
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
