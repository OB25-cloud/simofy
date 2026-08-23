'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import type { Job } from '@/lib/types'
import { formatTime } from '@/lib/timeOptions'
import { colorForStatus, STATUS_LABELS } from './scheduleColors'

type PanelJob = Job & { sites?: { address: string | null } | null }

interface Props {
  job: PanelJob
  onClose: () => void
}

function formatDate(dateKey: string | null | undefined) {
  if (!dateKey) return null
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-NZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className="text-sm text-[#1A1A2E]">{value}</dd>
    </div>
  )
}

// Slide-over side panel — "click a job block to see full details" without
// leaving the scheduler. Only shows fields the schedule's own query already
// fetches (title/job_type/status/date/time/location/client/staff/site) —
// full editing (checklists, materials, photos) still lives on the job page.
export default function JobDetailPanel({ job, onClose }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const color = colorForStatus(job.status)
  const statusLabel = STATUS_LABELS[job.status ?? ''] ?? job.status ?? 'Pending'
  const address = job.location ?? job.sites?.address ?? null
  const scheduledDateKey = job.scheduled_date?.split('T')[0]

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
              style={{ background: `${color.solid}1F`, color: color.solid }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color.solid }} />
              {statusLabel}
            </span>
            <h2 className="text-base font-semibold text-[#1A1A2E] truncate">
              {job.title ?? job.job_type ?? 'Untitled job'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-[#6B7280] hover:text-[#1A1A2E] transition-colors p-1 -mr-1"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <dl className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <Row label="Client" value={job.clients?.name} />
          <Row label="Assigned To" value={job.staff?.name ?? 'Unassigned'} />
          <Row label="Job Type" value={job.job_type} />
          <Row label="Scheduled" value={formatDate(scheduledDateKey)} />
          <Row
            label="Time"
            value={job.start_time && job.end_time ? `${formatTime(job.start_time)} – ${formatTime(job.end_time)}` : null}
          />
          <Row label="Location" value={address} />
        </dl>

        <div className="px-6 py-4 border-t border-[#E5E7EB] shrink-0">
          <Link
            href={`/jobs/${job.id}`}
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 text-sm font-medium bg-white border border-[#E5E7EB] text-[#1A1A2E] rounded-lg hover:bg-[#F4F5F7] transition-colors"
          >
            View full job page
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
