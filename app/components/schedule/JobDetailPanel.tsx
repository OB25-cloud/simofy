'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Client, Staff } from '@/lib/types'
import EditJobModal from '@/app/components/jobs/EditJobModal'
import { colorForStatus, STATUS_ORDER, statusLabelFor } from './scheduleColors'
import { compactRange, durationLabel, formatLongDate, jobAddress, jobDateKey, jobDurationMin, jobLabel, type ScheduleJob } from './scheduleDates'
import StaffAvatar from './StaffAvatar'
import { StatusPill } from './JobBlock'

interface Props {
  job: ScheduleJob
  staffList: Pick<Staff, 'id' | 'name'>[]
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  onClose: () => void
  onReschedule: (job: ScheduleJob) => void
  onAssign: (job: ScheduleJob, staffId: string | null) => Promise<void>
  onStatusChange: (job: ScheduleJob, status: string) => Promise<void>
}

const QUICK_STATUSES = STATUS_ORDER.filter(s => s !== 'invoiced')

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

// Slide-over detail panel — opened by clicking any job block. Quick edits
// that the scheduler cares about (status, assignee, date/time) save
// immediately; everything else goes through the full Edit Job modal or the
// job page.
export default function JobDetailPanel({ job, staffList, clients, onClose, onReschedule, onAssign, onStatusChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [savingStatus, setSavingStatus] = useState<string | null>(null)
  const [savingStaff, setSavingStaff] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !editing) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, editing])

  const color = colorForStatus(job.status)
  const address = jobAddress(job)
  const dateKey = jobDateKey(job)

  async function changeStatus(status: string) {
    if (status === job.status || savingStatus) return
    setSavingStatus(status)
    await onStatusChange(job, status)
    setSavingStatus(null)
  }

  async function changeStaff(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value || null
    if (next === (job.staff_id ?? null)) return
    setSavingStaff(true)
    await onAssign(job, next)
    setSavingStaff(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 tab-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-[420px] h-full bg-white shadow-2xl flex flex-col animate-[panel-in_180ms_ease-out]">
        <style>{`@keyframes panel-in { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
        <div className="h-1 shrink-0" style={{ background: color.solid }} />

        <div className="px-6 pt-5 pb-4 border-b border-line shrink-0">
          <div className="flex items-start justify-between gap-3">
            <StatusPill status={job.status} />
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 -mr-2 -mt-1 rounded-md flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <h2 className="mt-2.5 text-lg font-bold tracking-tight text-ink leading-snug">{jobLabel(job)}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {job.clients?.name ?? 'No client'}
            {job.clients?.business_name && <span className="text-ink-faint"> · {job.clients.business_name}</span>}
            {job.job_type && <span className="text-ink-faint"> · {job.job_type}</span>}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
          <Section title="Status">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_STATUSES.map(s => {
                const c = colorForStatus(s)
                const active = job.status === s
                const busy = savingStatus === s
                return (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    disabled={!!savingStatus}
                    className={[
                      'inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg transition-[background-color,box-shadow,color] duration-150 disabled:cursor-wait',
                      active ? '' : 'bg-white hover:bg-surface-muted text-ink-muted',
                    ].join(' ')}
                    style={active
                      ? { background: c.tintStrong, color: c.text, boxShadow: `inset 0 0 0 1.5px ${c.solid}` }
                      : { boxShadow: 'inset 0 0 0 1px var(--line)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.solid }} />
                    {busy ? 'Saving…' : statusLabelFor(s)}
                  </button>
                )
              })}
            </div>
          </Section>

          <Section
            title="When"
            action={
              <button onClick={() => onReschedule(job)} className="text-[11.5px] font-semibold text-accent hover:text-accent-hover transition-colors">
                Reschedule
              </button>
            }
          >
            <div className="rounded-lg border border-line bg-surface-muted/60 px-3.5 py-3">
              <p className="text-sm font-semibold text-ink">{dateKey ? formatLongDate(dateKey) : 'Not scheduled'}</p>
              <p className="text-xs text-ink-muted mt-0.5 tabular-nums">
                {compactRange(job)} <span className="text-ink-faint">· {durationLabel(jobDurationMin(job))}</span>
              </p>
            </div>
          </Section>

          <Section title="Assigned to">
            <div className="flex items-center gap-3">
              <StaffAvatar staffId={job.staff_id} name={job.staff?.name} size="md" />
              <div className="relative flex-1">
                <select
                  value={job.staff_id ?? ''}
                  onChange={changeStaff}
                  disabled={savingStaff}
                  className="w-full appearance-none border border-line rounded-lg pl-3 pr-8 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent disabled:opacity-60"
                >
                  <option value="">Unassigned</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
            {!job.staff_id && <p className="mt-2 text-[11.5px] text-amber-700">Nobody is assigned yet — pick a crew member or drag the job onto a row.</p>}
          </Section>

          <Section title="Where">
            {address ? (
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 text-ink-faint shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                </span>
                <p className="text-sm text-ink leading-snug">{address}</p>
              </div>
            ) : (
              <p className="text-sm text-ink-faint">No address on this job or its site.</p>
            )}
          </Section>

          {job.notes && (
            <Section title="Notes">
              <p className="text-sm text-ink-muted whitespace-pre-wrap leading-relaxed">{job.notes}</p>
            </Section>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line shrink-0 flex items-center gap-2.5">
          <button
            onClick={() => setEditing(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-white border border-line text-ink rounded-lg hover:bg-surface-muted transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Edit job
          </button>
          <Link
            href={`/jobs/${job.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white rounded-lg bg-accent hover:brightness-110 transition-[filter]"
          >
            Open job
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
        </div>
      </div>

      {editing && (
        <EditJobModal job={job} clients={clients} staff={staffList} onClose={() => setEditing(false)} />
      )}
    </div>
  )
}
