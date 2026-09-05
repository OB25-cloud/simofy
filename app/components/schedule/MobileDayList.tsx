'use client'

import { useMemo } from 'react'
import { colorForStatus } from './scheduleColors'
import { compactRange, durationLabel, jobDurationMin, jobLabel, type ScheduleJob } from './scheduleDates'
import StaffAvatar from './StaffAvatar'
import { StatusPill } from './JobBlock'

interface Props {
  jobs: ScheduleJob[]
  dateLabel: string
  onOpen: (job: ScheduleJob) => void
  onAddJob: () => void
}

function timeSort(a: ScheduleJob, b: ScheduleJob): number {
  return (a.start_time ?? '').localeCompare(b.start_time ?? '')
}

// Mobile fallback: a simple list of the selected day's jobs sorted by time,
// with unassigned jobs called out at the top. Drag-and-drop stays desktop.
export default function MobileDayList({ jobs, dateLabel, onOpen, onAddJob }: Props) {
  const sorted = useMemo(() => [...jobs].sort(timeSort), [jobs])
  const unassigned = sorted.filter(j => !j.staff_id)
  const assigned = sorted.filter(j => j.staff_id)

  function Item({ job }: { job: ScheduleJob }) {
    const color = colorForStatus(job.status)
    return (
      <button
        onClick={() => onOpen(job)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover active:bg-surface-muted transition-colors"
      >
        <span className="shrink-0 w-1 h-10 rounded-full" style={{ background: color.solid }} />
        <div className="w-[72px] shrink-0">
          <p className="text-[12px] font-semibold text-ink tabular-nums leading-tight">{compactRange(job).split(' – ')[0]}</p>
          <p className="text-[10.5px] text-ink-faint tabular-nums leading-tight mt-0.5">{durationLabel(jobDurationMin(job))}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{jobLabel(job)}</p>
          <p className="text-xs text-ink-muted truncate mt-0.5">{job.clients?.name ?? 'No client'}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusPill status={job.status} size="xs" />
          <span className="inline-flex items-center gap-1 text-[10.5px] text-ink-muted">
            <StaffAvatar staffId={job.staff_id} name={job.staff?.name} size="xs" />
            <span className="max-w-[72px] truncate">{job.staff?.name?.split(' ')[0] ?? 'Unassigned'}</span>
          </span>
        </div>
      </button>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white py-12 px-6 text-center shadow-card">
        <p className="text-sm font-semibold text-ink">Nothing scheduled</p>
        <p className="text-xs text-ink-muted mt-1">{dateLabel} is clear.</p>
        <button onClick={onAddJob} className="mt-4 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-accent hover:brightness-110 transition-[filter]">
          + Add a job
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {unassigned.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-card overflow-hidden">
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-800">Unassigned</p>
            <span className="text-[11px] font-bold text-amber-800 tabular-nums">{unassigned.length}</span>
          </div>
          <div className="divide-y divide-line-soft">{unassigned.map(j => <Item key={j.id} job={j} />)}</div>
        </div>
      )}
      {assigned.length > 0 && (
        <div className="bg-white rounded-xl border border-line shadow-card overflow-hidden">
          <div className="px-4 py-2 bg-surface-muted border-b border-line flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{dateLabel}</p>
            <span className="text-[11px] font-bold text-ink-muted tabular-nums">{assigned.length} {assigned.length === 1 ? 'job' : 'jobs'}</span>
          </div>
          <div className="divide-y divide-line-soft">{assigned.map(j => <Item key={j.id} job={j} />)}</div>
        </div>
      )}
    </div>
  )
}
