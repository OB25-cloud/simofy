'use client'

import { memo, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import Link from 'next/link'
import { durationLabel, jobDateKey, jobDurationMin, toDateKey, type ScheduleJob } from './scheduleDates'
import { WeekJobCard } from './JobBlock'
import StaffAvatar from './StaffAvatar'
import { STAFF_COL_W, type StaffRow } from './DayBoard'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MIN_DAY_W = 148
const HEADER_H = 56

export function cellIdFor(staffId: string, dateKey: string): string {
  return `cell:${staffId}:${dateKey}`
}
export function parseCellId(id: string): { staffId: string; dateKey: string } | null {
  if (!id.startsWith('cell:')) return null
  const rest = id.slice(5)
  const idx = rest.lastIndexOf(':')
  if (idx === -1) return null
  return { staffId: rest.slice(0, idx), dateKey: rest.slice(idx + 1) }
}

interface Props {
  jobs: ScheduleJob[]
  staffRows: StaffRow[]
  weekDays: Date[]
  todayKey: string
  hideFree: boolean
  onOpen: (job: ScheduleJob) => void
  onReschedulePicker: (job: ScheduleJob) => void
  onJumpToDay: (date: Date) => void
  onEmptyCellClick: (staffId: string, dateKey: string) => void
}

function timeSort(a: ScheduleJob, b: ScheduleJob): number {
  return (a.start_time ?? '').localeCompare(b.start_time ?? '')
}

// ─── cell ────────────────────────────────────────────────────────────────────

interface CellProps {
  staffId: string
  dateKey: string
  isToday: boolean
  isWeekend: boolean
  jobs: ScheduleJob[]
  onOpen: (job: ScheduleJob) => void
  onReschedulePicker: (job: ScheduleJob) => void
  onEmptyCellClick: (staffId: string, dateKey: string) => void
}

function CellInner({ staffId, dateKey, isToday, isWeekend, jobs, onOpen, onReschedulePicker, onEmptyCellClick }: CellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: cellIdFor(staffId, dateKey) })
  const sorted = useMemo(() => [...jobs].sort(timeSort), [jobs])

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => { if (e.target === e.currentTarget) onEmptyCellClick(staffId, dateKey) }}
      className={[
        'group/cell relative flex-1 min-w-0 border-r border-line-soft last:border-r-0 p-1.5 space-y-1.5 cursor-cell transition-colors duration-150',
        isOver ? 'bg-accent-soft' : isToday ? 'bg-accent-soft/35' : isWeekend ? 'bg-surface-muted/50' : '',
      ].join(' ')}
      style={{ minWidth: MIN_DAY_W }}
    >
      {sorted.map(job => (
        <WeekJobCard key={job.id} job={job} onOpen={onOpen} onReschedulePicker={onReschedulePicker} />
      ))}
      {sorted.length === 0 && !isOver && (
        <span className="pointer-events-none absolute inset-1.5 rounded-md border border-dashed border-transparent group-hover/cell:border-accent/40 flex items-center justify-center text-[11px] font-semibold text-accent opacity-0 group-hover/cell:opacity-100 transition-opacity">
          + Add job
        </span>
      )}
      {isOver && (
        <span className="pointer-events-none absolute inset-1.5 rounded-md border-[1.5px] border-dashed border-accent" />
      )}
    </div>
  )
}

const Cell = memo(CellInner)

// ─── board ───────────────────────────────────────────────────────────────────

export default function WeekBoard({ jobs, staffRows, weekDays, todayKey, hideFree, onOpen, onReschedulePicker, onJumpToDay, onEmptyCellClick }: Props) {
  const dayKeys = useMemo(() => weekDays.map(toDateKey), [weekDays])

  const byStaffDay = useMemo(() => {
    const map = new Map<string, ScheduleJob[]>()
    for (const job of jobs) {
      const key = jobDateKey(job)
      if (!job.staff_id || !key) continue
      const id = `${job.staff_id}|${key}`
      const list = map.get(id)
      if (list) list.push(job)
      else map.set(id, [job])
    }
    return map
  }, [jobs])

  const perDayCounts = useMemo(() => {
    const counts: Record<string, { jobs: number; staff: Set<string> }> = {}
    for (const key of dayKeys) counts[key] = { jobs: 0, staff: new Set() }
    for (const job of jobs) {
      const key = jobDateKey(job)
      if (!key || !counts[key]) continue
      counts[key].jobs += 1
      if (job.staff_id) counts[key].staff.add(job.staff_id)
    }
    return counts
  }, [jobs, dayKeys])

  const EMPTY: ScheduleJob[] = useMemo(() => [], [])
  const visibleRows = hideFree
    ? staffRows.filter(s => dayKeys.some(k => (byStaffDay.get(`${s.id}|${k}`)?.length ?? 0) > 0))
    : staffRows

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-surface overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto overscroll-contain">
        <div style={{ minWidth: STAFF_COL_W + MIN_DAY_W * 7 }}>
          {/* Header */}
          <div className="sticky top-0 z-30 flex bg-surface-muted/95 backdrop-blur-sm border-b border-line" style={{ height: HEADER_H }}>
            <div className="sticky left-0 z-40 shrink-0 flex items-center px-4 bg-surface-muted border-r border-line" style={{ width: STAFF_COL_W }}>
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                Staff <span className="text-ink-faint font-medium normal-case tracking-normal">· {visibleRows.length}</span>
              </span>
            </div>
            {weekDays.map((day, i) => {
              const key = dayKeys[i]
              const isToday = key === todayKey
              const c = perDayCounts[key]
              return (
                <button
                  key={key}
                  onClick={() => onJumpToDay(day)}
                  className={[
                    'flex-1 min-w-0 flex items-center gap-2.5 px-3 text-left border-r border-line-soft last:border-r-0 transition-colors hover:bg-white/70',
                    isToday ? 'bg-accent-soft/60' : '',
                  ].join(' ')}
                  style={{ minWidth: MIN_DAY_W }}
                  title="Open day view"
                >
                  <span
                    className={[
                      'w-8 h-8 rounded-lg flex items-center justify-center text-[15px] font-bold tabular-nums shrink-0',
                      isToday ? 'bg-accent text-white shadow-[0_1px_2px_rgba(17,24,39,0.15)]' : 'text-ink',
                    ].join(' ')}
                  >
                    {day.getDate()}
                  </span>
                  <span className="min-w-0">
                    <span className={['block text-[12px] font-semibold leading-tight', isToday ? 'text-accent' : 'text-ink'].join(' ')}>
                      {DAY_NAMES[i]}{isToday ? ' · Today' : ''}
                    </span>
                    <span className="block text-[10.5px] text-ink-muted leading-tight mt-0.5 truncate">
                      {c.jobs === 0 ? 'No jobs' : `${c.jobs} ${c.jobs === 1 ? 'job' : 'jobs'} · ${c.staff.size} staff`}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Rows */}
          {visibleRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <p className="text-sm font-medium text-ink">{staffRows.length === 0 ? 'No active staff yet' : 'Nothing scheduled this week'}</p>
              <p className="text-xs text-ink-muted mt-1">
                {staffRows.length === 0
                  ? <>Add your crew on the <Link href="/staff" className="text-accent font-semibold hover:underline">Staff page</Link> to start scheduling.</>
                  : 'Turn off "Hide free staff" to see every row.'}
              </p>
            </div>
          ) : (
            visibleRows.map(staff => {
              const weekJobs = dayKeys.reduce((n, k) => n + (byStaffDay.get(`${staff.id}|${k}`)?.length ?? 0), 0)
              const weekMin = dayKeys.reduce((n, k) => n + (byStaffDay.get(`${staff.id}|${k}`) ?? []).reduce((s, j) => s + jobDurationMin(j), 0), 0)
              return (
                <div key={staff.id} className="flex border-b border-line-soft last:border-b-0" style={{ minHeight: 108 }}>
                  <div className="sticky left-0 z-20 shrink-0 flex items-center gap-3 px-4 bg-white border-r border-line" style={{ width: STAFF_COL_W }}>
                    <StaffAvatar staffId={staff.id} name={staff.name} size="md" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink truncate leading-tight">{staff.name}</p>
                      <p className={['text-[11px] truncate mt-0.5', weekJobs === 0 ? 'text-ink-faint' : 'text-ink-muted'].join(' ')}>
                        {weekJobs === 0 ? 'Free this week' : `${weekJobs} ${weekJobs === 1 ? 'job' : 'jobs'} · ${durationLabel(weekMin)}`}
                      </p>
                    </div>
                  </div>
                  {dayKeys.map((key, i) => (
                    <Cell
                      key={key}
                      staffId={staff.id}
                      dateKey={key}
                      isToday={key === todayKey}
                      isWeekend={i >= 5}
                      jobs={byStaffDay.get(`${staff.id}|${key}`) ?? EMPTY}
                      onOpen={onOpen}
                      onReschedulePicker={onReschedulePicker}
                      onEmptyCellClick={onEmptyCellClick}
                    />
                  ))}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
