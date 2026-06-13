'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Quote, Client, Job, QuoteLineItem } from '@/lib/types'

const STATUS_OPTIONS = [
  { value: 'draft',    label: 'Draft' },
  { value: 'sent',     label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired',  label: 'Expired' },
]

const inputClass = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#B8922A] bg-white'
const numClass   = 'w-full border border-gray-200 rounded-md px-2 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#B8922A] bg-white text-right'

type LineItem = { id: string; description: string; quantity: string; unit_price: string }

function uid() { return Math.random().toString(36).slice(2) }
function emptyItem(): LineItem { return { id: uid(), description: '', quantity: '1', unit_price: '' } }
function fromDB(item: QuoteLineItem): LineItem {
  return {
    id: uid(),
    description: item.description ?? '',
    quantity: String(item.quantity ?? 1),
    unit_price: String(item.unit_price ?? 0),
  }
}

interface Props {
  quote: Quote
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  jobs: Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
  onClose: () => void
}

export default function EditQuoteModal({ quote, clients, jobs, onClose }: Props) {
  const [form, setForm] = useState({
    client_id: quote.client_id ?? '',
    job_id: quote.job_id ?? '',
    status: quote.status ?? 'draft',
    valid_until: quote.valid_until ? quote.valid_until.split('T')[0] : '',
    notes: quote.notes ?? '',
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyItem()])
  const [loadingItems, setLoadingItems] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quote.id)
      .order('sort_order')
      .then(({ data }: { data: QuoteLineItem[] | null }) => {
        setLineItems(data && data.length > 0 ? data.map(fromDB) : [emptyItem()])
        setLoadingItems(false)
      })
  }, [quote.id])

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))
  }

  function setItem(id: string, field: keyof Omit<LineItem, 'id'>, value: string) {
    setLineItems(p => p.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  function addItem() { setLineItems(p => [...p, emptyItem()]) }
  function removeItem(id: string) { setLineItems(p => p.length > 1 ? p.filter(item => item.id !== id) : p) }

  const calc = useMemo(() => {
    const amounts = lineItems.map(item => (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))
    const subtotal = amounts.reduce((a, b) => a + b, 0)
    const gst = subtotal * 0.15
    return { amounts, subtotal, gst, total: subtotal + gst }
  }, [lineItems])

  const filteredJobs = form.client_id ? jobs.filter(j => j.client_id === form.client_id) : jobs

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id) { setError('Client is required.'); return }
    const validItems = lineItems.filter(i => i.description.trim())
    if (validItems.length === 0) { setError('Add at least one line item with a description.'); return }

    setLoading(true)
    setError('')

    const { error: qErr } = await supabase
      .from('quotes')
      .update({
        client_id: form.client_id,
        job_id: form.job_id || null,
        status: form.status,
        valid_until: form.valid_until || null,
        notes: form.notes.trim() || null,
        subtotal: calc.subtotal,
        gst: calc.gst,
        total: calc.total,
      })
      .eq('id', quote.id)

    if (qErr) { setError(qErr.message); setLoading(false); return }

    // Replace all line items
    await supabase.from('quote_line_items').delete().eq('quote_id', quote.id)
    const { error: liErr } = await supabase.from('quote_line_items').insert(
      validItems.map((item, i) => ({
        quote_id: quote.id,
        description: item.description.trim(),
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        amount: (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0),
        sort_order: i,
      }))
    )

    if (liErr) { setError(liErr.message); setLoading(false); return }

    onClose()
    window.location.reload()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full h-full sm:h-[92vh] sm:max-w-2xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Edit Quote</h2>
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
                <select value={form.client_id} onChange={e => { setForm(p => ({ ...p, client_id: e.target.value, job_id: '' })) }} className={inputClass}>
                  <option value="">Select client…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.business_name ? ` — ${c.business_name}` : ''}</option>
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
                    <option key={j.id} value={j.id}>{j.title ?? j.job_type ?? `Job ${j.id.slice(0,6)}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Valid Until</label>
                <input type="date" value={form.valid_until} onChange={setField('valid_until')} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={setField('notes')} rows={2} className={`${inputClass} resize-none`} />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Line Items</p>
                <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70" style={{ color: '#B8922A' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add line item
                </button>
              </div>

              {loadingItems ? (
                <p className="text-xs text-gray-400 py-3 text-center">Loading items…</p>
              ) : (
                <div className="space-y-3">
                  {lineItems.map((item, idx) => (
                    <div key={item.id} className="space-y-1.5">
                      <textarea value={item.description} onChange={e => setItem(item.id, 'description', e.target.value)} placeholder="Description…" rows={2} className={`${inputClass} resize-none`} />
                      <div className="grid grid-cols-[60px_1fr_80px_28px] gap-2 items-center">
                        <input type="number" value={item.quantity} onChange={e => setItem(item.id, 'quantity', e.target.value)} min="0" step="0.01" className={numClass} />
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                          <input type="number" value={item.unit_price} onChange={e => setItem(item.id, 'unit_price', e.target.value)} min="0" step="0.01" placeholder="0.00" className={`${numClass} pl-6`} />
                        </div>
                        <span className="text-sm text-right text-gray-600 tabular-nums">${calc.amounts[idx].toFixed(2)}</span>
                        <button type="button" onClick={() => removeItem(item.id)} disabled={lineItems.length === 1} className="flex items-center justify-center w-6 h-6 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-0" aria-label="Remove">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <div className="w-52 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span><span className="tabular-nums">${calc.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>GST (15%)</span><span className="tabular-nums">${calc.gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span><span className="tabular-nums">${calc.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || loadingItems} className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: '#B8922A' }}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
