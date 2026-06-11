'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'

const STATUS_OPTIONS = [
  { value: 'new',       label: 'New'       },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost',      label: 'Lost'      },
]

const SOURCE_OPTIONS = [
  'Website',
  'Referral',
  'Social Media',
  'Google',
  'Phone',
  'Other',
]

const inputClass = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#B8922A] bg-white'

interface Props {
  lead: Lead
  onClose: () => void
}

export default function EditLeadModal({ lead, onClose }: Props) {
  const [form, setForm] = useState({
    name:    lead.name    ?? '',
    email:   lead.email   ?? '',
    phone:   lead.phone   ?? '',
    message: lead.message ?? '',
    source:  lead.source  ?? '',
    status:  lead.status  ?? 'new',
    notes:   lead.notes   ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }

    setLoading(true)
    setError('')

    const { error: dbErr } = await supabase
      .from('leads')
      .update({
        name:    form.name.trim(),
        email:   form.email.trim()   || null,
        phone:   form.phone.trim()   || null,
        message: form.message.trim() || null,
        source:  form.source         || null,
        status:  form.status,
        notes:   form.notes.trim()   || null,
      })
      .eq('id', lead.id)

    if (dbErr) { setError(dbErr.message); setLoading(false); return }

    onClose()
    window.location.reload()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full h-full sm:h-[92vh] sm:max-w-lg sm:rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Edit Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-4">

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Name <span style={{ color: '#B8922A' }}>*</span>
              </label>
              <input type="text" value={form.name} onChange={setField('name')} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={setField('email')} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={setField('phone')} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Source</label>
                <select value={form.source} onChange={setField('source')} className={inputClass}>
                  <option value="">Select sourceâ€¦</option>
                  {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                <select value={form.status} onChange={setField('status')} className={inputClass}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Message</label>
              <textarea value={form.message} onChange={setField('message')} rows={3} className={`${inputClass} resize-none`} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={setField('notes')} rows={2} className={`${inputClass} resize-none`} />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: '#B8922A' }}>
              {loading ? 'Savingâ€¦' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
