'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Client, Site, Staff } from '@/lib/types'
import { buildOccurrences } from '@/lib/recurrence'
import { TIME_OPTIONS, DEFAULT_START_TIME, DEFAULT_END_TIME } from '@/lib/timeOptions'
import ModalShell from '@/app/components/ui/Modal'
import Button from '@/app/components/ui/Button'
import { inputClass, labelClass } from '@/app/components/ui/input'

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pending' },
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete',    label: 'Complete' },
  { value: 'invoiced',    label: 'Invoiced' },
  { value: 'cancelled',   label: 'Cancelled' },
]

const RECURRENCE_OPTIONS = [
  { value: 'none',        label: 'None (one-off)' },
  { value: 'weekly',      label: 'Weekly'         },
  { value: 'fortnightly', label: 'Fortnightly'    },
  { value: 'monthly',     label: 'Monthly'        },
]

const JOB_TYPES = [
  'Lawn Mowing',
  'Garden Maintenance',
  'Tree Surgery',
  'Hedging',
  'Planting',
  'Irrigation',
  'Landscaping',
  'Other',
]

interface Props {
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  staff: Pick<Staff, 'id' | 'name'>[]
  onClose: () => void
  initialStaffId?: string
  initialDate?: string
  initialStartTime?: string
  initialEndTime?: string
}

export default function AddJobModal({ clients, staff, onClose, initialStaffId, initialDate, initialStartTime, initialEndTime }: Props) {
  const [form, setForm] = useState({
    title: '',
    job_type: '',
    status: 'pending',
    staff_id: initialStaffId ?? '',
    client_id: '',
    site_id: '',
    location: '',
    scheduled_date: initialDate ?? '',
    start_time: initialStartTime ?? DEFAULT_START_TIME,
    end_time: initialEndTime ?? DEFAULT_END_TIME,
    recurrence_pattern: 'none',
    notes: '',
  })
  const [sites, setSites] = useState<Site[]>([])
  const [loadingSites, setLoadingSites] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const clientId = e.target.value
    setForm((prev) => ({ ...prev, client_id: clientId, site_id: '' }))
    setSites([])

    if (!clientId) return
    setLoadingSites(true)
    const { data } = await supabase.from('sites').select('*').eq('client_id', clientId).order('address')
    setSites(data ?? [])
    setLoadingSites(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    setLoading(true)
    setError('')

    const isRecurring = form.recurrence_pattern !== 'none'
    const seriesId = isRecurring ? crypto.randomUUID() : null

    const { error: dbError } = await supabase.from('jobs').insert({
      title: form.title.trim(),
      job_type: form.job_type || null,
      staff_id: form.staff_id || null,
      client_id: form.client_id || null,
      site_id: form.site_id || null,
      location: form.location.trim() || null,
      scheduled_date: form.scheduled_date || null,
      start_time: form.start_time,
      end_time: form.end_time,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? form.recurrence_pattern : null,
      recurring_series_id: seriesId,
      notes: form.notes.trim() || null,
      status: form.status,
    })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    if (isRecurring && seriesId && form.scheduled_date) {
      const occurrences = buildOccurrences(
        form.scheduled_date,
        form.recurrence_pattern,
        8,
        seriesId,
        {
          title: form.title.trim(),
          job_type: form.job_type || null,
          client_id: form.client_id || null,
          site_id: form.site_id || null,
          staff_id: form.staff_id || null,
          location: form.location.trim() || null,
          notes: form.notes.trim() || null,
          start_time: form.start_time,
          end_time: form.end_time,
        },
      )
      const { error: seriesErr } = await supabase.from('jobs').insert(occurrences)
      if (seriesErr) console.error('[Recurrence] series generation failed:', seriesErr)
      else console.log('[Recurrence] generated 8 occurrences for series', seriesId)
    }

    onClose()
    window.location.reload()
  }

  return (
    <ModalShell title="Add Job" onClose={onClose}>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelClass}>
              Title <span style={{ color: '#C9A84C' }}>*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Spring garden tidy-up"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Job Type</label>
            <select value={form.job_type} onChange={set('job_type')} className={inputClass}>
              <option value="">Select type…</option>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={set('status')} className={inputClass}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Assign To</label>
            <select value={form.staff_id} onChange={set('staff_id')} className={inputClass}>
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Client</label>
            <select value={form.client_id} onChange={handleClientChange} className={inputClass}>
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.business_name ? ` — ${c.business_name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Site</label>
            <select
              value={form.site_id}
              onChange={set('site_id')}
              disabled={!form.client_id || loadingSites}
              className={`${inputClass} disabled:opacity-50`}
            >
              <option value="">
                {loadingSites ? 'Loading sites…' : !form.client_id ? 'Select a client first' : 'Select site…'}
              </option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.address ?? s.location ?? `Site ${s.id.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={form.location}
              onChange={set('location')}
              placeholder="Street address or area"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Scheduled Date</label>
            <input
              type="date"
              value={form.scheduled_date}
              onChange={set('scheduled_date')}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Time</label>
              <select value={form.start_time} onChange={set('start_time')} className={inputClass}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>End Time</label>
              <select value={form.end_time} onChange={set('end_time')} className={inputClass}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Recurrence</label>
            <select value={form.recurrence_pattern} onChange={set('recurrence_pattern')} className={inputClass}>
              {RECURRENCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Any relevant notes…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {error && <p className="text-xs text-[#EF4444]">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving…' : 'Add Job'}
            </Button>
          </div>
        </form>
    </ModalShell>
  )
}
