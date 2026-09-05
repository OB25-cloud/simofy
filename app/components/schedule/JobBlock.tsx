'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { minutesToTime } from '@/lib/timeOptions'
import { colorForStatus, statusLabelFor } from './scheduleColors'
import {
  SNAP_MIN, VIEW_END_MIN,
  compactRange, compactTime, durationLabel, formatShortDate, jobDateKey, jobDurationMin, jobEndMin, jobLabel, jobStartMin, snapMinutes,
  type ScheduleJob,
} from './scheduleDates'
import { useJobHoverHandlers } from './JobTooltip'
import { useLongPressReschedule } from './useLongPressReschedule'
import { recentlyDragged } from './dndSensors'
import StaffAvatar from './StaffAvatar'

// ─── shared ──────────────────────────────────────────────────────────────────

export type DragSource = 'board' | 'panel'
export type JobDragData = { job: ScheduleJob; source: DragSource }

export function dragIdFor(job: ScheduleJob, source: DragSource): string {
  return `job:${source}:${job.id}`
}

export function StatusPill({ status, size = 'sm', className = '' }: { status: string | null | undefined; size?: 'xs' | 'sm'; className?: string }) {
  const color = colorForStatus(status)
  return (
    <span
      className={[
        'inline-flex items-center gap-1 font-semibold rounded-full whitespace-nowrap',
        size === 'xs' ? 'text-[9.5px] px-1.5 py-px' : 'text-[10.5px] px-2 py-0.5',
        className,
      ].join(' ')}
      style={{ background: color.tintStrong, color: color.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color.solid }} />
      {statusLabelFor(status)}
    </span>
  )
}

type CommonHandlers = {
  onOpen: (job: ScheduleJob) => void
  onReschedulePicker: (job: ScheduleJob) => void
}

function useBlockInteractions(job: ScheduleJob, source: DragSource, { onOpen, onReschedulePicker }: CommonHandlers) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragIdFor(job, source),
    data: { job, source } satisfies JobDragData,
  })
  const { elRef, longPressFiredRef } = useLongPressReschedule(job, onReschedulePicker)
  const hover = useJobHoverHandlers(job)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (longPressFiredRef.current) { longPressFiredRef.current = false; return }
    if (recentlyDragged()) return
    onOpen(job)
  }
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onReschedulePicker(job)
  }
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(job) }
  }

  const ref = (el: HTMLDivElement | null) => { setNodeRef(el); elRef.current = el }

  return { ref, attributes, listeners, isDragging, hover, handleClick, handleContextMenu, handleKeyDown }
}

// ─── day view block (absolute, time-positioned, resizable) ───────────────────

interface DayBlockProps extends CommonHandlers {
  job: ScheduleJob
  left: number
  width: number
  top: number
  height: number
  pxPerMin: number
  onResizeEnd: (job: ScheduleJob, newEndTime: string) => void
}

function DayJobBlockInner({ job, left, width, top, height, pxPerMin, onResizeEnd, onOpen, onReschedulePicker }: DayBlockProps) {
  const color = colorForStatus(job.status)
  const { ref, attributes, listeners, isDragging, hover, handleClick, handleContextMenu, handleKeyDown } =
    useBlockInteractions(job, 'board', { onOpen, onReschedulePicker })

  // Live end-time while dragging the right edge; null when idle.
  const [resizeEnd, setResizeEnd] = useState<number | null>(null)
  const resizeRef = useRef<{ startX: number; origEnd: number; startMin: number; latest: number } | null>(null)
  const justResizedRef = useRef(false)

  useEffect(() => {
    if (resizeEnd == null) return
    function onMove(e: MouseEvent) {
      const r = resizeRef.current
      if (!r) return
      const raw = r.origEnd + (e.clientX - r.startX) / pxPerMin
      const next = Math.max(r.startMin + SNAP_MIN, Math.min(VIEW_END_MIN, snapMinutes(raw)))
      r.latest = next
      setResizeEnd(next)
    }
    function onUp() {
      const r = resizeRef.current
      resizeRef.current = null
      setResizeEnd(null)
      document.body.style.cursor = ''
      if (r && r.latest !== r.origEnd) {
        justResizedRef.current = true
        setTimeout(() => { justResizedRef.current = false }, 250)
        onResizeEnd(job, minutesToTime(r.latest))
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp, { once: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizeEnd != null, pxPerMin, job, onResizeEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  function startResize(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const origEnd = jobEndMin(job)
    resizeRef.current = { startX: e.clientX, origEnd, startMin: jobStartMin(job), latest: origEnd }
    document.body.style.cursor = 'ew-resize'
    setResizeEnd(origEnd)
  }

  const liveWidth = resizeEnd != null ? Math.max(SNAP_MIN * pxPerMin, (resizeEnd - jobStartMin(job)) * pxPerMin) : width
  const compact = liveWidth < 96
  const tiny = liveWidth < 56
  const duration = resizeEnd != null ? resizeEnd - jobStartMin(job) : jobDurationMin(job)

  return (
    <div
      ref={ref}
      {...listeners}
      {...attributes}
      tabIndex={0}
      role="button"
      aria-label={`${jobLabel(job)}, ${compactRange(job)}, ${statusLabelFor(job.status)}`}
      onClick={(e) => { if (justResizedRef.current) { e.stopPropagation(); return } handleClick(e) }}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      {...hover}
      className={[
        'group absolute rounded-lg select-none overflow-hidden outline-none',
        'transition-[box-shadow,transform,opacity] duration-150 ease-out',
        'focus-visible:ring-2 focus-visible:ring-accent/40',
        isDragging ? 'opacity-30' : 'hover:-translate-y-px hover:shadow-[0_4px_12px_-4px_rgba(17,24,39,0.25)] cursor-grab active:cursor-grabbing',
        resizeEnd != null ? 'shadow-[0_4px_12px_-4px_rgba(17,24,39,0.25)] z-20' : 'z-10',
      ].join(' ')}
      style={{
        left, top, width: liveWidth, height,
        background: color.tint,
        boxShadow: `inset 0 0 0 1px rgba(${color.rgb}, 0.28), inset 3px 0 0 ${color.solid}`,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <div className={['h-full flex flex-col justify-center pl-2.5 pr-2 min-w-0', tiny ? 'pl-2 pr-1' : ''].join(' ')}>
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[12px] font-semibold text-ink leading-tight truncate flex-1 min-w-0">{jobLabel(job)}</p>
          {!compact && <StatusPill status={job.status} size="xs" className="shrink-0" />}
        </div>
        {!tiny && (
          <p className="text-[11px] text-ink-muted leading-tight truncate mt-0.5">
            {job.clients?.name ?? <span className="text-ink-faint">No client</span>}
          </p>
        )}
        {!compact && (
          <p className="text-[10.5px] tabular-nums leading-tight truncate mt-0.5" style={{ color: color.text }}>
            {resizeEnd != null
              ? `${compactTime(minutesToTime(jobStartMin(job)))} – ${compactTime(minutesToTime(resizeEnd))} · ${durationLabel(duration)}`
              : `${compactRange(job)} · ${durationLabel(duration)}`}
          </p>
        )}
      </div>

      {/* Resize handle — right edge. Stops propagation so dnd-kit's mouse
          sensor never sees the mousedown and starts a drag instead. */}
      <div
        onMouseDown={startResize}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        aria-hidden
      >
        <span className="w-[3px] h-4 rounded-full" style={{ background: `rgba(${color.rgb}, 0.6)` }} />
      </div>
    </div>
  )
}

export const DayJobBlock = memo(DayJobBlockInner)

// ─── week view compact card ──────────────────────────────────────────────────

interface WeekCardProps extends CommonHandlers {
  job: ScheduleJob
}

function WeekJobCardInner({ job, onOpen, onReschedulePicker }: WeekCardProps) {
  const color = colorForStatus(job.status)
  const { ref, attributes, listeners, isDragging, hover, handleClick, handleContextMenu, handleKeyDown } =
    useBlockInteractions(job, 'board', { onOpen, onReschedulePicker })

  return (
    <div
      ref={ref}
      {...listeners}
      {...attributes}
      tabIndex={0}
      role="button"
      aria-label={`${jobLabel(job)}, ${compactRange(job)}, ${statusLabelFor(job.status)}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      {...hover}
      className={[
        'relative rounded-md px-2 py-1.5 select-none outline-none min-w-0',
        'transition-[box-shadow,transform,opacity] duration-150 ease-out',
        'focus-visible:ring-2 focus-visible:ring-accent/40',
        isDragging ? 'opacity-30' : 'hover:-translate-y-px hover:shadow-[0_4px_12px_-4px_rgba(17,24,39,0.22)] cursor-grab active:cursor-grabbing',
      ].join(' ')}
      style={{
        background: color.tint,
        boxShadow: `inset 0 0 0 1px rgba(${color.rgb}, 0.26), inset 3px 0 0 ${color.solid}`,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <p className="text-[11.5px] font-semibold text-ink leading-tight truncate">{jobLabel(job)}</p>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color.solid }} title={statusLabelFor(job.status)} />
      </div>
      <p className="text-[10.5px] text-ink-muted leading-tight truncate mt-0.5">
        <span className="tabular-nums" style={{ color: color.text }}>{compactTime(job.start_time)}</span>
        {job.clients?.name ? ` · ${job.clients.name}` : ''}
      </p>
    </div>
  )
}

export const WeekJobCard = memo(WeekJobCardInner)

// ─── unassigned panel card ───────────────────────────────────────────────────

interface PanelCardProps extends CommonHandlers {
  job: ScheduleJob
}

function PanelJobCardInner({ job, onOpen, onReschedulePicker }: PanelCardProps) {
  const color = colorForStatus(job.status)
  const { ref, attributes, listeners, isDragging, hover, handleClick, handleContextMenu, handleKeyDown } =
    useBlockInteractions(job, 'panel', { onOpen, onReschedulePicker })
  const dateKey = jobDateKey(job)

  return (
    <div
      ref={ref}
      {...listeners}
      {...attributes}
      tabIndex={0}
      role="button"
      aria-label={`${jobLabel(job)}, unassigned`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      {...hover}
      className={[
        'relative rounded-lg bg-white border border-line px-3 py-2.5 select-none outline-none',
        'transition-[box-shadow,transform,opacity,border-color] duration-150 ease-out',
        'focus-visible:ring-2 focus-visible:ring-accent/40',
        isDragging ? 'opacity-30' : 'hover:-translate-y-px hover:border-[#d6d3d1] hover:shadow-card-hover cursor-grab active:cursor-grabbing',
      ].join(' ')}
      style={{ boxShadow: `inset 3px 0 0 ${color.solid}`, touchAction: 'none', WebkitTouchCallout: 'none' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-ink leading-snug truncate">{jobLabel(job)}</p>
        <span className="mt-1 text-ink-faint shrink-0" aria-hidden>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="2.5" cy="2.5" r="1.3" /><circle cx="7.5" cy="2.5" r="1.3" /><circle cx="2.5" cy="7" r="1.3" /><circle cx="7.5" cy="7" r="1.3" /><circle cx="2.5" cy="11.5" r="1.3" /><circle cx="7.5" cy="11.5" r="1.3" /></svg>
        </span>
      </div>
      <p className="text-[11px] text-ink-muted truncate mt-0.5">{job.clients?.name ?? 'No client'}</p>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {job.job_type && (
          <span className="text-[10px] font-medium px-1.5 py-px rounded bg-surface-muted text-ink-muted ring-1 ring-inset ring-line truncate max-w-[130px]">{job.job_type}</span>
        )}
        <span className="text-[10.5px] tabular-nums text-ink-muted">
          {dateKey ? formatShortDate(dateKey) : 'No date'}{job.start_time ? ` · ${compactTime(job.start_time)}` : ''}
        </span>
      </div>
    </div>
  )
}

export const PanelJobCard = memo(PanelJobCardInner)

// ─── drag overlay ghost ──────────────────────────────────────────────────────
// What follows the cursor. Mirrors the day block so a drop looks like the
// block sliding into place rather than a different object appearing.

export function DragGhost({ job, width, staffName }: { job: ScheduleJob; width: number; staffName?: string | null }) {
  const color = colorForStatus(job.status)
  const compact = width < 96
  return (
    <div
      className="rounded-lg overflow-hidden cursor-grabbing"
      style={{
        width, height: 56,
        background: '#fff',
        boxShadow: `inset 0 0 0 1px rgba(${color.rgb}, 0.35), inset 3px 0 0 ${color.solid}, 0 12px 28px -8px rgba(17,24,39,0.35), 0 2px 6px rgba(17,24,39,0.10)`,
        transform: 'scale(1.02)',
      }}
    >
      <div className="h-full flex flex-col justify-center pl-2.5 pr-2 min-w-0" style={{ background: color.tint }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[12px] font-semibold text-ink leading-tight truncate flex-1">{jobLabel(job)}</p>
          {!compact && <StatusPill status={job.status} size="xs" />}
        </div>
        <p className="text-[11px] text-ink-muted leading-tight truncate mt-0.5">{job.clients?.name ?? 'No client'}</p>
        {!compact && (
          <p className="text-[10.5px] tabular-nums leading-tight truncate mt-0.5 flex items-center gap-1" style={{ color: color.text }}>
            {compactRange(job)}
            {staffName !== undefined && (
              <span className="inline-flex items-center gap-1 text-ink-muted">
                · <StaffAvatar staffId={job.staff_id} name={staffName} size="xs" /> {staffName ?? 'Unassigned'}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
