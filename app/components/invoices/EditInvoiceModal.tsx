'use client'

import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Invoice, Client, Job, Quote } from '@/lib/types'

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'sent',      label: 'Sent' },
  { value: 'paid',      label: 'Paid' },
  { value: 'overdue',   label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
]

const inputClass = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#B8922A] bg-white'

function quoteLabel(id: string) {
  return `Q-${id.slice(0, 6).toUpperCase()}`
}

interface Props {
  invoice: Invoice
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  jobs: Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
  quotes: Pick<Quote, 'id' | 'client_id' | 'total'>[]
  onClose: () => void
}

export default function EditInvoiceModal({ invoice, clients, jobs, quotes, onClose }: Props) {
  const [form, setForm] = useState({
    client_id: invoice.client_id ?? '',
    job_id:    invoice.job_id    ?? '',
    quote_id:  invoice.quote_id  ?? '',
    amount:    String(invoice.amount ?? ''),
    status:    invoice.status    ?? 'draft',
    due_date:  invoice.due_date  ? invoice.due_date.split('T')[0] : '',
    notes:     invoice.notes     ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))
  }

  const calc = useMemo(() => {
    const amount = parseFloat(form.amount) || 0
    const tax = amount * 0.15
    return { amount, tax, total: amount + tax }
  }, [form.amount])

  const filteredJobs   = form.client_id ? jobs.filter(j => j.client_id === form.client_id)   : jobs
  const filteredQuotes = form.client_id ? quotes.filter(q => q.client_id === form.client_id) : quotes

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id) { setError('Client is required.'); return }
    if (!form.amount || calc.amount <= 0) { setError('Amount must be greater than 0.'); return }

    setLoading(true)
    setError('')

    const { error: dbErr } = await supabase
      .from('invoices')
      .update({
        client_id: form.client_id,
        job_id:    form.job_id   || null,
        quote_id:  form.quote_id || null,
        amount:    calc.amount,
        tax:       calc.tax,
        total:     calc.total,
        status:    form.status,
        due_date:  form.due_date || null,
        notes:     form.notes.trim() || null,
      })
      .eq('id', invoice.id)

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
          <h2 className="text-sm font-semibold text-gray-900">Edit Invoice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-4">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Client <span style={{ color: '#B8922A' }}>*</span>
                </label>
                <select
                  value={form.client_id}
                  onChange={e => setForm(p => ({ ...p, client_id: e.target.value, job_id: '', quote_id: '' }))}
                  className={inputClass}
                >
                  <option value="">Select client…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.business_name ? ` â€” ${c.business_name}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                <select value={form.status} onChange={setField('status')} className={inputClass}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Linked Job</label>
                <select value={form.job_id} onChange={setField('job_id')} className={inputClass}>
                  <option value="">No linked job</option>
                  {filteredJobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title ?? j.job_type ?? `Job ${j.id.slice(0, 6)}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Linked Quote</label>
                <select value={form.quote_id} onChange={setField('quote_id')} className={inputClass}>
                  <option value="">No linked quote</option>
                  {filteredQuotes.map(q => (
                    <option key={q.id} value={q.id}>{quoteLabel(q.id)}{q.total != null ? ` â€” $${q.total.toFixed(2)}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Due Date</label>
              <input type="date" value={form.due_date} onChange={setField('due_date')} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Amount (excl. GST) <span style={{ color: '#B8922A' }}>*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                <input
                  type="number"
                  value={form.amount}
                  onChange={setField('amount')}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={`${inputClass} pl-7`}
                />
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="tabular-nums">${calc.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>GST (15%)</span>
                <span className="tabular-nums">${calc.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="tabular-nums">${calc.total.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={setField('notes')} rows={3} className={`${inputClass} resize-none`} />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: '#B8922A' }}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
