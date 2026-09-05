'use client'

import { useEffect, useState } from 'react'
import { TIME_OPTIONS, formatTime } from '@/lib/timeOptions'
import type { Staff } from '@/lib/types'
import ModalShell from '@/app/components/ui/Modal'
import Button from '@/app/components/ui/Button'
import { inputClass, labelClass } from '@/app/components/ui/input'
import { formatShortDate, jobDateKey, jobLabel, jobTimes, toDateKey, type ScheduleJob } from './scheduleDates'

export type ReschedulePayload = {
  dateKey: string
  startTime: string
  endTime: string
  staffId: string | null
  notifyClient: boolean
  notifyStaff: boolean
}

interface Props {
  job: ScheduleJob
  staffList: Pick<Staff, 'id' | 'name'>[]
  saving: boolean
  onConfirm: (payload: ReschedulePayload) => void
  onCancel: () => void
}

// Right-click / long-press reschedule: explicit date, time and assignee
// picker with notification opt-outs — the deliberate counterpart to
// drag-and-drop, which applies instantly with an Undo toast.
export default function ReschedulePickerModal({ job, staffList, saving, onConfirm, onCancel }: Props) {
  const currentKey = jobDateKey(job) ?? toDateKey(new Date())
  const { start: currentStart, end: currentEnd } = jobTimes(job)
  const [dateKey, setDateKey] = useState(currentKey)
  const [startTime, setStartTime] = useState(currentStart)
  const [endTime, setEndTime] = useState(currentEnd)
  const [staffId, setStaffId] = useState(job.staff_id ?? '')
  const [notifyClient, setNotifyClient] = useState(true)
  const [notifyStaff, setNotifyStaff] = useState(true)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const unchanged =
    dateKey === currentKey && startTime === currentStart && endTime === currentEnd && (staffId || null) === (job.staff_id ?? null)
  const invalidRange = endTime <= startTime
  const targetStaffName = staffList.find(s => s.id === staffId)?.name ?? null

  return (
    <ModalShell title="Reschedule job" onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (unchanged || invalidRange) return
          onConfirm({ dateKey, startTime, endTime, staffId: staffId || null, notifyClient, notifyStaff })
        }}
        className="px-6 py-5 space-y-4"
      >
        <div className="rounded-lg bg-surface-muted/70 border border-line px-3.5 py-3">
          <p className="text-sm font-semibold text-ink">{jobLabel(job)}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Currently {formatShortDate(currentKey)} · {formatTime(currentStart)} – {formatTime(currentEnd)} · {job.staff?.name ?? 'Unassigned'}
          </p>
        </div>

        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} className={inputClass} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Start</label>
            <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass}>
              {TIME_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>End</label>
            <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass}>
              {TIME_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        {invalidRange && <p className="text-xs text-error -mt-2">End time must be after the start time.</p>}

        <div>
          <label className={labelClass}>Assigned to</label>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputClass}>
            <option value="">Unassigned</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {(job.client_id || targetStaffName) && (
          <div className="space-y-1 pt-1">
            {job.client_id && job.clients?.name && (
              <label className="flex items-center gap-2.5 py-1 cursor-pointer">
                <input type="checkbox" checked={notifyClient} onChange={(e) => setNotifyClient(e.target.checked)} className="w-4 h-4 rounded cursor-pointer shrink-0" style={{ accentColor: 'var(--accent)' }} />
                <span className="text-sm text-ink-muted">Notify {job.clients.name} of this change</span>
              </label>
            )}
            {targetStaffName && (
              <label className="flex items-center gap-2.5 py-1 cursor-pointer">
                <input type="checkbox" checked={notifyStaff} onChange={(e) => setNotifyStaff(e.target.checked)} className="w-4 h-4 rounded cursor-pointer shrink-0" style={{ accentColor: 'var(--accent)' }} />
                <span className="text-sm text-ink-muted">Notify {targetStaffName} of this change</span>
              </label>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving || unchanged || invalidRange}>
            {saving ? 'Saving…' : 'Reschedule'}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}
