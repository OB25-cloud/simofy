'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClass =
  'w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#B8922A]'

export default function AddSiteModal({
  clientId,
  onClose,
}: {
  clientId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    address: '',
    location: '',
    access_notes: '',
    hazard_notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.address.trim()) {
      setError('Address is required.')
      return
    }
    setLoading(true)
    setError('')

    const { error: dbError } = await supabase.from('sites').insert({
      client_id: clientId,
      address: form.address.trim(),
      location: form.location.trim() || null,
      access_notes: form.access_notes.trim() || null,
      hazard_notes: form.hazard_notes.trim() || null,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Add Site</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-3.5 -m-3.5 md:p-0 md:m-0"
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
              Address <span style={{ color: '#B8922A' }}>*</span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={set('address')}
              placeholder="Site street address"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Location Description
            </label>
            <input
              type="text"
              value={form.location}
              onChange={set('location')}
              placeholder="e.g. Back garden, Front lawn"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Access Notes
            </label>
            <textarea
              value={form.access_notes}
              onChange={set('access_notes')}
              placeholder="e.g. Gate code is 1234, park on driveway…"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Hazard Notes
            </label>
            <textarea
              value={form.hazard_notes}
              onChange={set('hazard_notes')}
              placeholder="e.g. Uneven ground near fence, dog on property…"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 sm:py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 sm:py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#B8922A' }}
            >
              {loading ? 'Saving…' : 'Add Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
