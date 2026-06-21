'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const inputClass =
  'w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#B8922A] bg-white'

export default function AddStaffModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'field',
    pay_rate: '',
    is_active: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
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

    const { error: dbError } = await supabase.from('staff').insert({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role || null,
      pay_rate: form.pay_rate ? parseFloat(form.pay_rate) : null,
      is_active: form.is_active,
    })

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
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-xl shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Add Staff Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-3.5 -m-3.5 md:p-0 md:m-0" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Name <span style={{ color: '#B8922A' }}>*</span>
            </label>
            <input type="text" value={form.name} onChange={set('name')} placeholder="Full name" className={inputClass} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="021 xxx xxxx" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
              <select value={form.role} onChange={set('role')} className={inputClass}>
                <option value="field">Field</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Pay Rate ($/hr)</label>
              <input
                type="number"
                value={form.pay_rate}
                onChange={set('pay_rate')}
                placeholder="e.g. 25.00"
                step="0.01"
                min="0"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs font-medium text-gray-600">Status</p>
              <p className="text-xs text-gray-400 mt-0.5">{form.is_active ? 'Active' : 'Inactive'}</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
              className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
              style={{ background: form.is_active ? '#B8922A' : '#e5e7eb' }}
              aria-label="Toggle active status"
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200"
                style={{ transform: form.is_active ? 'translateX(22px)' : 'translateX(4px)' }}
              />
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-3 sm:py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 sm:py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#B8922A' }}
            >
              {loading ? 'Saving…' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
