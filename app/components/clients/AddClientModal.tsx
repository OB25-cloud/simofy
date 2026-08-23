'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClass =
  'w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1A1A2E] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent'

export default function AddClientModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    business_name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    is_active: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setLoading(true)
    setError('')

    const { error: dbError } = await supabase.from('clients').insert({
      name: form.name.trim(),
      business_name: form.business_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    router.refresh()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-xl shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#1A1A2E]">Add Client</h2>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1A1A2E] transition-colors p-3.5 -m-3.5 md:p-0 md:m-0"
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
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Name <span style={{ color: '#C9A84C' }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="Full name"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Business Name
            </label>
            <input
              type="text"
              value={form.business_name}
              onChange={set('business_name')}
              placeholder="Company or trading name"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="email@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="021 xxx xxxx"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={set('address')}
              placeholder="Street address"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Any relevant notes…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs font-medium text-[#6B7280]">Status</p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {form.is_active ? 'Active client' : 'Inactive client'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
              className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
              style={{ background: form.is_active ? '#C9A84C' : '#E5E7EB' }}
              aria-label="Toggle active status"
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200"
                style={{ transform: form.is_active ? 'translateX(22px)' : 'translateX(4px)' }}
              />
            </button>
          </div>

          {error && <p className="text-xs text-[#EF4444]">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 sm:py-2 text-sm font-medium bg-white border border-[#E5E7EB] text-[#1A1A2E] rounded-md hover:bg-[#F4F5F7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 sm:py-2 text-sm font-medium text-[#1A1A2E] font-semibold rounded-md transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#C9A84C' }}
            >
              {loading ? 'Saving…' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
