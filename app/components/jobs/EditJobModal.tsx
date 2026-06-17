'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Job, Client, Site, Staff } from '@/lib/types'
import { buildOccurrences } from '@/lib/recurrence'

const RECURRENCE_OPTIONS = [
  { value: 'none',        label: 'None (one-off)' },
  { value: 'weekly',      label: 'Weekly'         },
  { value: 'fortnightly', label: 'Fortnightly'    },
  { value: 'monthly',     label: 'Monthly'        },
]


const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pending' },
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete',    label: 'Complete' },
  { value: 'invoiced',    label: 'Invoiced' },
  { value: 'cancelled',   label: 'Cancelled' },
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

const inputClass =
  'w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#B8922A] bg-white'

interface Props {
  job: Job
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  staff: Pick<Staff, 'id' | 'name'>[]
  onClose: () => void
}

export default function EditJobModal({ job, clients, staff, onClose }: Props) {
  const [form, setForm] = useState({
    title: job.title ?? '',
    job_type: job.job_type ?? '',
    status: job.status ?? 'pending',
    staff_id: job.staff_id ?? '',
    client_id: job.client_id ?? '',
    site_id: job.site_id ?? '',
    location: job.location ?? '',
    scheduled_date: job.scheduled_date ? job.scheduled_date.split('T')[0] : '',
    recurrence_pattern: job.recurrence_pattern ?? 'none',
    notes: job.notes ?? '',
  })
  const [sites, setSites] = useState<Site[]>([])
  const [loadingSites, setLoadingSites] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notifBanner, setNotifBanner] = useState('')

  useEffect(() => {
    if (!job.client_id) return
    setLoadingSites(true)
    supabase.from('sites').select('*').eq('client_id', job.client_id).order('address')
      .then(({ data }: { data: Site[] | null }) => { setSites(data ?? []); setLoadingSites(false) })
  }, [job.client_id])

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

    if (form.status === 'complete') {
      const { count, error: checklistErr } = await supabase
        .from('job_checklist_items')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', job.id)
        .eq('required', true)
        .eq('completed', false)
      if (checklistErr) {
        setError(checklistErr.message)
        return
      }
      if ((count ?? 0) > 0) {
        setError(`Cannot mark complete — ${count} required checklist item${count === 1 ? '' : 's'} still unchecked.`)
        return
      }
    }

    setLoading(true)
    setError('')

    const isRecurring = form.recurrence_pattern !== 'none'
    const isFirstTimeRecurring = isRecurring && !job.recurring_series_id
    const seriesId: string | null = isRecurring
      ? (job.recurring_series_id ?? crypto.randomUUID())
      : (job.recurring_series_id ?? null)

    const { error: dbError } = await supabase.from('jobs').update({
      title: form.title.trim(),
      job_type: form.job_type || null,
      status: form.status,
      staff_id: form.staff_id || null,
      client_id: form.client_id || null,
      site_id: form.site_id || null,
      location: form.location.trim() || null,
      scheduled_date: form.scheduled_date || null,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? form.recurrence_pattern : null,
      recurring_series_id: seriesId,
      notes: form.notes.trim() || null,
    }).eq('id', job.id)

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    // Check notification settings when status changes to a trigger point
    const prevStatus = job.status
    const newStatus = form.status
    const clientId = form.client_id

    const template = {
      title: form.title.trim() || null,
      job_type: form.job_type || null,
      client_id: form.client_id || null,
      site_id: form.site_id || null,
      staff_id: form.staff_id || null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
    }

    // Generate 8 occurrences upfront when a job is first set to recurring
    if (isFirstTimeRecurring && seriesId && form.scheduled_date) {
      const occurrences = buildOccurrences(form.scheduled_date, form.recurrence_pattern, 8, seriesId, template)
      const { error: seriesErr } = await supabase.from('jobs').insert(occurrences)
      if (seriesErr) console.error('[Recurrence] series generation failed:', seriesErr)
      else console.log('[Recurrence] generated 8 occurrences for series', seriesId)
    }

    // Maintain 8-occurrence horizon when completing a recurring job
    if (isRecurring && seriesId && prevStatus !== 'complete' && newStatus === 'complete') {
      const today = new Date().toISOString().split('T')[0]

      const { data: futureJobs } = await supabase
        .from('jobs')
        .select('id, scheduled_date')
        .eq('recurring_series_id', seriesId)
        .not('status', 'in', '("complete","cancelled","invoiced")')
        .gt('scheduled_date', today)

      const futureCount = futureJobs?.length ?? 0
      const needed = 8 - futureCount
      console.log('[Recurrence] series', seriesId, '— future occurrences:', futureCount, '| needed:', needed)

      if (needed > 0) {
        const { data: lastJob } = await supabase
          .from('jobs')
          .select('scheduled_date')
          .eq('recurring_series_id', seriesId)
          .order('scheduled_date', { ascending: false })
          .limit(1)
          .single()

        const lastDate = (lastJob?.scheduled_date ?? form.scheduled_date ?? today).split('T')[0]
        const topUp = buildOccurrences(lastDate, form.recurrence_pattern, needed, seriesId, template)
        const { error: topUpErr } = await supabase.from('jobs').insert(topUp)
        if (topUpErr) console.error('[Recurrence] horizon top-up failed:', topUpErr)
        else console.log('[Recurrence] topped up', needed, 'occurrences from', lastDate)
      }
    }

    console.log('[Notifications] Status transition:', prevStatus, '→', newStatus, '| clientId:', clientId)

    if (clientId && prevStatus !== newStatus) {
      const queued: string[] = []

      if (newStatus === 'scheduled') {
        const { data: setting, error: settingErr } = await supabase
          .from('client_notification_settings')
          .select('enabled')
          .eq('client_id', clientId)
          .eq('notification_type', 'job_confirmation')
          .maybeSingle()
        console.log('[Notifications] job_confirmation setting:', setting, '| error:', settingErr)
        if (setting?.enabled ?? true) queued.push('Job Confirmation')
      }

      if (newStatus === 'complete') {
        // Check job_completion setting
        const { data: completionSetting, error: completionSettingErr } = await supabase
          .from('client_notification_settings')
          .select('enabled')
          .eq('client_id', clientId)
          .eq('notification_type', 'job_completion')
          .maybeSingle()
        console.log('[Notifications] job_completion setting:', completionSetting, '| error:', completionSettingErr)

        if (completionSetting?.enabled ?? true) {
          const completionPayload = {
            client_id: clientId,
            job_id: job.id,
            type: 'completion',
            scheduled_for: new Date().toISOString(),
            status: 'pending',
            review_link: 'https://g.page/r/PLACEHOLDER/review',
          }
          console.log('[Notifications] inserting job_completion payload:', completionPayload)
          const { data: completionInsertData, error: completionInsertErr } = await supabase
            .from('notifications')
            .insert(completionPayload)
            .select()
          if (completionInsertErr) {
            console.error('[Notifications] job_completion insert FAILED — code:', completionInsertErr.code, '| message:', completionInsertErr.message, '| details:', completionInsertErr.details, '| hint:', completionInsertErr.hint)
          } else {
            console.log('[Notifications] job_completion insert SUCCESS — data:', completionInsertData)
            queued.push('Job Completion')
          }
        }

        // Check review_request setting and insert into notifications queue
        const { data: reviewSetting, error: reviewSettingErr } = await supabase
          .from('client_notification_settings')
          .select('enabled')
          .eq('client_id', clientId)
          .eq('notification_type', 'review_request')
          .maybeSingle()
        console.log('[Notifications] review_request setting:', reviewSetting, '| error:', reviewSettingErr)

        if (reviewSetting?.enabled ?? true) {
          const { data: reviewDefault, error: reviewDefaultErr } = await supabase
            .from('notification_defaults')
            .select('review_request_delay_hours')
            .eq('notification_type', 'review_request')
            .maybeSingle()
          console.log('[Notifications] notification_defaults row:', reviewDefault, '| error:', reviewDefaultErr)

          const delayHours: number = (reviewDefault as any)?.review_request_delay_hours ?? 24
          const scheduledFor = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString()

          const reviewPayload = {
            client_id: clientId,
            job_id: job.id,
            type: 'review_request',
            scheduled_for: scheduledFor,
            status: 'pending',
            review_link: 'https://g.page/r/PLACEHOLDER/review',
          }
          console.log('[Notifications] inserting review_request payload:', reviewPayload)

          const { data: insertData, error: insertErr } = await supabase
            .from('notifications')
            .insert(reviewPayload)
            .select()
          if (insertErr) {
            console.error('[Notifications] insert FAILED — code:', insertErr.code, '| message:', insertErr.message, '| details:', insertErr.details, '| hint:', insertErr.hint)
          } else {
            console.log('[Notifications] insert SUCCESS — data:', insertData)
          }

          if (!insertErr) queued.push('Review Request')
        }
      }

      console.log('[Notifications] queued array:', queued)
      if (queued.length > 0) {
        setNotifBanner(`✓ ${queued.join(' & ')} notification${queued.length > 1 ? 's' : ''} queued for this client`)
        await new Promise(resolve => setTimeout(resolve, 1800))
      }
    } else {
      console.log('[Notifications] skipped — clientId falsy or status unchanged')
    }

    onClose()
    window.location.reload()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:rounded-xl sm:max-h-[90vh] shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold text-gray-900">Edit Job</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Title <span style={{ color: '#B8922A' }}>*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              className={inputClass}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Job Type</label>
              <select value={form.job_type} onChange={set('job_type')} className={inputClass}>
                <option value="">Select type…</option>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select value={form.status} onChange={set('status')} className={inputClass}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Assign To</label>
            <select value={form.staff_id} onChange={set('staff_id')} className={inputClass}>
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Client</label>
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
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Site</label>
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
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={set('location')}
              placeholder="Street address or area"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Scheduled Date</label>
            <input
              type="date"
              value={form.scheduled_date}
              onChange={set('scheduled_date')}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Recurrence</label>
            <select value={form.recurrence_pattern} onChange={set('recurrence_pattern')} className={inputClass}>
              {RECURRENCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {notifBanner && (
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium" style={{ background: 'rgba(184,146,42,0.1)', color: '#B8922A' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notifBanner}
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#B8922A' }}
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
