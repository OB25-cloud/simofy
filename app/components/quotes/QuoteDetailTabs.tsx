'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Quote, QuoteLineItem } from '@/lib/types'

const TABS = ['Overview', 'Line Items', 'Activity'] as const
type Tab = typeof TABS[number]

const GOLD = '#B8922A'

function fmt(n: number | null | undefined) {
  return n != null ? `$${n.toFixed(2)}` : '—'
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  quote: Quote
  lineItems: QuoteLineItem[]
}

export default function QuoteDetailTabs({ quote, lineItems }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState('')

  async function handleAccept() {
    setAccepting(true)
    await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quote.id)
    router.refresh()
    setAccepting(false)
  }

  async function handleDecline() {
    setDeclining(true)
    await supabase.from('quotes').update({ status: 'declined' }).eq('id', quote.id)
    router.refresh()
    setDeclining(false)
  }

  async function handleConvertToInvoice() {
    setConverting(true)
    setConvertError('')

    const subtotal = quote.subtotal ?? 0
    const gst = quote.gst ?? 0
    const total = quote.total ?? 0

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        client_id: quote.client_id,
        job_id: quote.job_id ?? null,
        quote_id: quote.id,
        amount: subtotal,
        tax: gst,
        total: total,
        status: 'draft',
      })
      .select('id')
      .single()

    if (error || !data) {
      setConvertError(error?.message ?? 'Failed to create invoice')
      setConverting(false)
      return
    }

    window.location.href = `/invoices/${data.id}`
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{
              color: activeTab === tab ? '#111827' : '#6b7280',
            }}
          >
            {tab}
            {activeTab === tab && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                style={{ background: GOLD }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'Overview' && (
        <div className="space-y-4">
          {/* Client + Details cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client</p>
              {quote.clients ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">{quote.clients.name}</p>
                  {quote.clients.email && <p className="text-sm text-gray-500">{quote.clients.email}</p>}
                  {quote.clients.phone && <p className="text-sm text-gray-500">{quote.clients.phone}</p>}
                </div>
              ) : (
                <p className="text-sm text-gray-300">No client</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</p>
              <dl className="space-y-2">
                {quote.jobs && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-xs text-gray-400">Linked Job</dt>
                    <dd className="text-xs text-gray-700 text-right truncate max-w-[160px]">
                      {quote.jobs.title ?? quote.jobs.job_type ?? '—'}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-xs text-gray-400">Status</dt>
                  <dd className="text-xs text-gray-700 capitalize">{quote.status ?? '—'}</dd>
                </div>
                {quote.valid_until && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-xs text-gray-400">Valid Until</dt>
                    <dd className="text-xs text-gray-700">{fmtDate(quote.valid_until)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-xs text-gray-400">Created</dt>
                  <dd className="text-xs text-gray-700">{fmtDate(quote.created_at)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="rounded-lg border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Quick actions */}
          <div className="rounded-lg border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleAccept}
                disabled={accepting || quote.status === 'accepted'}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: '#15803d' }}
              >
                {accepting ? 'Updating…' : 'Accept'}
              </button>
              <button
                onClick={handleDecline}
                disabled={declining || quote.status === 'declined'}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {declining ? 'Updating…' : 'Decline'}
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <button
                onClick={handleConvertToInvoice}
                disabled={converting}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: GOLD }}
              >
                {converting ? 'Creating…' : 'Convert to Invoice'}
              </button>
            </div>
            {convertError && <p className="mt-2 text-xs text-red-500">{convertError}</p>}
          </div>
        </div>
      )}

      {/* Line Items */}
      {activeTab === 'Line Items' && (
        <div>
          <div className="rounded-lg border border-gray-100 overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Line Items</p>
            </div>
            {lineItems.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-300">No line items</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Description</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 w-20">Qty</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 w-28">Unit Price</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={item.id} style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}>
                      <td className="px-5 py-3 text-gray-700">{item.description ?? '—'}</td>
                      <td className="px-5 py-3 text-right text-gray-600 tabular-nums">{item.quantity ?? 0}</td>
                      <td className="px-5 py-3 text-right text-gray-600 tabular-nums">{fmt(item.unit_price)}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900 tabular-nums">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-56 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{fmt(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>GST (15%)</span>
                <span className="tabular-nums">{fmt(quote.gst)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="tabular-nums">{fmt(quote.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity */}
      {activeTab === 'Activity' && (
        <div className="rounded-lg border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Activity</p>
          <ol className="relative border-l border-gray-200 ml-2 space-y-6">
            <li className="pl-5">
              <span
                className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                style={{ background: GOLD }}
              />
              <p className="text-xs font-medium text-gray-700">Quote created</p>
              <p className="text-xs text-gray-400 mt-0.5">{fmtDate(quote.created_at)}</p>
            </li>

            {(quote.status === 'sent' || quote.status === 'accepted' || quote.status === 'declined') && (
              <li className="pl-5 relative">
                <span
                  className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#3b82f6' }}
                />
                <p className="text-xs font-medium text-gray-700">Quote sent to client</p>
                <p className="text-xs text-gray-400 mt-0.5">Date not recorded</p>
              </li>
            )}

            {quote.status === 'accepted' && (
              <li className="pl-5 relative">
                <span
                  className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#22c55e' }}
                />
                <p className="text-xs font-medium text-gray-700">Quote accepted</p>
              </li>
            )}

            {quote.status === 'declined' && (
              <li className="pl-5 relative">
                <span
                  className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#ef4444' }}
                />
                <p className="text-xs font-medium text-gray-700">Quote declined</p>
              </li>
            )}

            {quote.status === 'expired' && (
              <li className="pl-5 relative">
                <span
                  className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#f97316' }}
                />
                <p className="text-xs font-medium text-gray-700">Quote expired</p>
                {quote.valid_until && (
                  <p className="text-xs text-gray-400 mt-0.5">Valid until {fmtDate(quote.valid_until)}</p>
                )}
              </li>
            )}
          </ol>
        </div>
      )}
    </div>
  )
}
