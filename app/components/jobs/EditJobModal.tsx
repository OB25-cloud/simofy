'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Job, Client, Site, Staff } from '@/lib/types'

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
    notes: job.notes ?? '',
  })
  const [sites, setSites] = useState<Site[]>([])
  const [loadingSites, setLoadingSites] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!job.client_id) return
    setLoadingSites(true)
    supabase.from('sites').select('*').eq('client_id', job.client_id).order('address')
      .then(({ data }) => { setSites(data ?? []); setLoadingSites(false) })
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
    setLoading(true)
    setError('')

    const { error: dbError } = await supabase.from('jobs').update({
      title: form.title.trim(),
      job_type: form.job_type || null,
      status: form.status,
      staff_id: form.staff_id || null,
      client_id: form.client_id || null,
      site_id: form.site_id || null,
      location: form.location.trim() || null,
      scheduled_date: form.scheduled_date || null,
      notes: form.notes.trim() || null,
    }).eq('id', job.id)

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
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
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

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
