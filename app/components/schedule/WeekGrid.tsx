'use client'

import { useState } from 'react'
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
import { colorForStaff, colorForStatus, UNASSIGNED_KEY } from './scheduleColors'
import { useLongPressReschedule } from './useLongPressReschedule'
import { useScheduleSensors } from './dndSensors'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export type WeekDragReschedulePayload = {
  job: Job
  toStaffKey: string
  toDateKey: string
}

interface Props {
  jobs: Job[]
  weekDays: Date[]
  todayKey: string
  toDateKey: (d: Date) => string
  onOpenDetail: (job: Job) => void
  onReschedulePicker: (job: Job) => void
  onJumpToDay: (date: Date) => void
  onEmptyDayClick: (dateKey: string) => void
  onDragReschedule: (payload: WeekDragReschedulePayload) => void
}

function timeSort(a: Job, b: Job): number {
  return (a.start_time ?? '').localeCompare(b.start_time ?? '')
}

// ─── compact job card ─────────────────────────────────────────────────────────

function JobCard({
  job, onOpen, onReschedule,
}: {
  job: Job
  onOpen: (job: Job) => void
  onReschedule: (job: Job) => void
}) {
  const statusColor = colorForStatus(job.status)
  const staffColor = colorForStaff(job.staff_id)
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
      className="cursor-pointer rounded-md px-2 py-1.5 flex items-start gap-1.5 hover:brightness-125 transition-[filter] select-none"
      style={{
        background: `${statusColor.solid}29`,
        borderLeft: `3px solid ${statusColor.solid}`,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white mt-0.5"
        style={{ background: staffColor.solid }}
        title={job.staff?.name ?? 'Unassigned'}
      >
        {job.staff?.name ? job.staff.name.charAt(0).toUpperCase() : '?'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold leading-snug text-white truncate">
          {job.title ?? job.job_type ?? 'Untitled'}
        </p>
        <p className="text-[10px] leading-snug text-white/70 truncate">
          {formatTime(job.start_time)}{job.clients?.name ? ` · ${job.clients.name}` : ''}
        </p>
      </div>
    </div>
  )
}

// ─── day column (droppable) ──────────────────────────────────────────────────

function DayColumn({
  date, dateKey, isToday, dayJobs, onOpen, onReschedule, onJumpToDay, onEmptyClick,
}: {
  date: Date
  dateKey: string
  isToday: boolean
  dayJobs: Job[]
  onOpen: (job: Job) => void
  onReschedule: (job: Job) => void
  onJumpToDay: (date: Date) => void
  onEmptyClick: (dateKey: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey })
  const staffCount = new Set(dayJobs.filter(j => j.staff_id).map(j => j.staff_id)).size
  const sorted = [...dayJobs].sort(timeSort)

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full" style={{ borderRight: '1px solid #262626' }}>
      <button
        onClick={() => onJumpToDay(date)}
        className="shrink-0 px-2 py-2.5 text-center hover:bg-white/[0.04] transition-colors"
        style={{ borderBottom: isToday ? '2px solid var(--accent-bright)' : '1px solid #262626' }}
      >
        <p className="text-[13px] font-bold" style={{ color: isToday ? 'var(--accent-bright)' : '#fff' }}>
          {DAY_NAMES[(date.getDay() + 6) % 7]}
        </p>
        <p className="text-[11px] mt-0.5 text-gray-500">
          {date.getDate()} {date.toLocaleDateString('en-NZ', { month: 'short' })}
        </p>
        <p className="text-[10px] mt-1 text-gray-500">
          {dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''} · {staffCount} staff
        </p>
      </button>

      <div
        ref={setNodeRef}
        onClick={() => onEmptyClick(dateKey)}
        className="flex-1 min-h-0 overflow-y-auto px-1.5 py-1.5 space-y-1.5 cursor-pointer"
        style={{ background: isOver ? 'rgba(74, 222, 128,0.08)' : 'transparent' }}
      >
        {sorted.length === 0 ? (
          <p className="text-[11px] text-gray-600 text-center pt-4">No jobs</p>
        ) : (
          sorted.map(job => <JobCard key={job.id} job={job} onOpen={onOpen} onReschedule={onReschedule} />)
        )}
      </div>
    </div>
  )
}

// ─── main grid ──────────────────────────────────────────────────────────────

export default function WeekGrid({
  jobs, weekDays, todayKey, toDateKey,
  onOpenDetail, onReschedulePicker, onJumpToDay, onEmptyDayClick, onDragReschedule,
}: Props) {
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const sensors = useScheduleSensors()

  const jobsByDay: Record<string, Job[]> = {}
  jobs.forEach(job => {
    const dateKey = job.scheduled_date?.split('T')[0]
    if (!dateKey) return
    if (!jobsByDay[dateKey]) jobsByDay[dateKey] = []
    jobsByDay[dateKey].push(job)
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
    const toDateKeyStr = String(over.id)
    if (!fromDateKey || fromDateKey === toDateKeyStr) return

    // Week view reassigns by day only — staff stays the same as when it was
    // dragged (the day-columns layout has no staff axis to drop onto). Pass
    // the job's current staff key back unchanged so the reschedule resolves
    // to the same assignment (UNASSIGNED_KEY for null, not an empty string).
    onDragReschedule({ job, toStaffKey: job.staff_id ?? UNASSIGNED_KEY, toDateKey: toDateKeyStr })
  }

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col rounded-lg overflow-hidden" style={{ background: 'var(--charcoal)' }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0 flex">
          {weekDays.map(day => {
            const dateKey = toDateKey(day)
            return (
              <DayColumn
                key={dateKey}
                date={day}
                dateKey={dateKey}
                isToday={dateKey === todayKey}
                dayJobs={jobsByDay[dateKey] ?? []}
                onOpen={onOpenDetail}
                onReschedule={onReschedulePicker}
                onJumpToDay={onJumpToDay}
                onEmptyClick={onEmptyDayClick}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeJob && (
            <div
              className="rounded-md px-2 py-1.5 w-40"
              style={{
                background: `${colorForStatus(activeJob.status).solid}29`,
                borderLeft: `3px solid ${colorForStatus(activeJob.status).solid}`,
              }}
            >
              <p className="text-[11px] font-semibold text-white truncate">{activeJob.title ?? activeJob.job_type ?? 'Untitled'}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
