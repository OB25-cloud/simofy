'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Invoice } from '@/lib/types'

const TABS = ['Overview', 'Payment', 'Activity'] as const
type Tab = typeof TABS[number]

const GOLD = '#C9A84C'

function fmt(n: number | null | undefined) {
  return n != null ? `$${n.toFixed(2)}` : '—'
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function quoteNumber(id: string) {
  return `Q-${id.slice(0, 6).toUpperCase()}`
}

interface Props {
  invoice: Invoice
}

export default function InvoiceDetailTabs({ invoice }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [markingPaid, setMarkingPaid] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [reminderSent, setReminderSent] = useState(false)
  const [reminderError, setReminderError] = useState('')

  const isPaid = invoice.status === 'paid'
  const isOverdue = invoice.status === 'overdue'

  async function handleMarkPaid() {
    setMarkingPaid(true)
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('invoices')
      .update({ status: 'paid', paid_date: today })
      .eq('id', invoice.id)
    router.refresh()
    setMarkingPaid(false)
  }

  async function handleSendReminder() {
    if (!invoice.client_id) {
      setReminderError('Invoice has no linked client — cannot queue reminder.')
      return
    }
    setSendingReminder(true)
    setReminderError('')

    const { error } = await supabase.from('notifications').insert({
      client_id: invoice.client_id,
      job_id: invoice.job_id ?? null,
      notification_type: 'invoice_overdue',
      scheduled_for: new Date().toISOString(),
    })

    if (error) {
      setReminderError(error.message)
    } else {
      setReminderSent(true)
    }
    setSendingReminder(false)
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-[#E5E7EB] mb-6 overflow-x-auto scrollbar-hidden">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-3 md:py-2.5 text-sm font-medium transition-colors relative shrink-0 whitespace-nowrap"
            style={{ color: activeTab === tab ? '#111827' : '#6b7280' }}
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
        <div className="space-y-4 tab-fade-in">
          <div className="grid grid-cols-2 gap-4">
            {/* Client */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Client</p>
              {invoice.clients ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#1A1A2E]">{invoice.clients.name}</p>
                  {invoice.clients.email && <p className="text-sm text-gray-500">{invoice.clients.email}</p>}
                  {invoice.clients.phone && <p className="text-sm text-gray-500">{invoice.clients.phone}</p>}
                </div>
              ) : (
                <p className="text-sm text-gray-300">No client</p>
              )}
            </div>

            {/* Details */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Details</p>
              <dl className="space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-xs text-[#6B7280]">Status</dt>
                  <dd className="text-xs text-[#6B7280] capitalize">{invoice.status ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-xs text-[#6B7280]">Created</dt>
                  <dd className="text-xs text-[#6B7280]">{fmtDate(invoice.created_at)}</dd>
                </div>
                {invoice.due_date && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-xs text-[#6B7280]">Due Date</dt>
                    <dd className="text-xs text-[#6B7280]">{fmtDate(invoice.due_date)}</dd>
                  </div>
                )}
                {invoice.paid_date && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-xs text-[#6B7280]">Paid Date</dt>
                    <dd className="text-xs text-[#6B7280]">{fmtDate(invoice.paid_date)}</dd>
                  </div>
                )}
                {invoice.jobs && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-xs text-[#6B7280]">Linked Job</dt>
                    <dd className="text-xs text-[#6B7280] text-right truncate max-w-[160px]">
                      {invoice.jobs.title ?? invoice.jobs.job_type ?? '—'}
                    </dd>
                  </div>
                )}
                {invoice.quotes && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-xs text-[#6B7280]">Linked Quote</dt>
                    <dd className="text-xs font-mono text-[#6B7280]">{quoteNumber(invoice.quotes.id)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {invoice.notes && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Payment */}
      {activeTab === 'Payment' && (
        <div className="space-y-4 tab-fade-in">
          {/* Prominent amount */}
          <div className="rounded-lg border border-[#E5E7EB] p-6 text-center">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
              {isPaid ? 'Amount Paid' : 'Amount Due'}
            </p>
            <p className="text-4xl font-bold text-[#1A1A2E] tabular-nums">{fmt(invoice.total)}</p>
            {invoice.due_date && !isPaid && (
              <p className={`mt-2 text-sm ${isOverdue ? 'text-[#EF4444] font-medium' : 'text-gray-500'}`}>
                Due {fmtDate(invoice.due_date)}{isOverdue ? ' — Overdue' : ''}
              </p>
            )}
            {isPaid && invoice.paid_date && (
              <p className="mt-2 text-sm text-green-600 font-medium">Paid on {fmtDate(invoice.paid_date)}</p>
            )}
            {isPaid && !invoice.paid_date && (
              <p className="mt-2 text-sm text-green-600 font-medium">Paid</p>
            )}
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">Breakdown</p>
            <div className="space-y-2 max-w-xs">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{fmt(invoice.amount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>GST (15%)</span>
                <span className="tabular-nums">{fmt(invoice.tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[#1A1A2E] pt-2 border-t border-[#E5E7EB]">
                <span>Total</span>
                <span className="tabular-nums">{fmt(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">Actions</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleMarkPaid}
                disabled={markingPaid || isPaid}
                className="px-4 py-3 sm:py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: '#15803d' }}
              >
                {markingPaid ? 'Updating…' : isPaid ? 'Already Paid' : 'Mark as Paid'}
              </button>
              <button
                onClick={handleSendReminder}
                disabled={sendingReminder || isPaid || reminderSent}
                className="px-4 py-3 sm:py-2 text-sm font-medium rounded-md border transition-colors disabled:opacity-50"
                style={
                  reminderSent
                    ? { background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }
                    : { background: '#f9fafb', color: '#374151', borderColor: '#e5e7eb' }
                }
              >
                {sendingReminder ? 'Sending…' : reminderSent ? 'Reminder queued' : 'Send Reminder'}
              </button>
            </div>
            {reminderError && <p className="mt-2 text-xs text-[#EF4444]">{reminderError}</p>}
          </div>
        </div>
      )}

      {/* Activity */}
      {activeTab === 'Activity' && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 tab-fade-in">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">Activity</p>
          <ol className="relative border-l border-[#E5E7EB] ml-2 space-y-6">
            <li className="pl-5">
              <span
                className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                style={{ background: GOLD }}
              />
              <p className="text-xs font-medium text-[#6B7280]">Invoice created</p>
              <p className="text-xs text-[#6B7280] mt-0.5">{fmtDate(invoice.created_at)}</p>
            </li>

            {(invoice.status === 'sent' || invoice.status === 'paid' || invoice.status === 'overdue') && (
              <li className="pl-5 relative">
                <span
                  className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#3b82f6' }}
                />
                <p className="text-xs font-medium text-[#6B7280]">Invoice sent to client</p>
                <p className="text-xs text-[#6B7280] mt-0.5">Date not recorded</p>
              </li>
            )}

            {isOverdue && (
              <li className="pl-5 relative">
                <span
                  className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#ef4444' }}
                />
                <p className="text-xs font-medium text-[#6B7280]">Invoice became overdue</p>
                {invoice.due_date && (
                  <p className="text-xs text-[#6B7280] mt-0.5">Due date was {fmtDate(invoice.due_date)}</p>
                )}
              </li>
            )}

            {isPaid && (
              <li className="pl-5 relative">
                <span
                  className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#22c55e' }}
                />
                <p className="text-xs font-medium text-[#6B7280]">Invoice paid</p>
                {invoice.paid_date && (
                  <p className="text-xs text-[#6B7280] mt-0.5">{fmtDate(invoice.paid_date)}</p>
                )}
              </li>
            )}

            {invoice.status === 'cancelled' && (
              <li className="pl-5 relative">
                <span
                  className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ background: '#6b7280' }}
                />
                <p className="text-xs font-medium text-[#6B7280]">Invoice cancelled</p>
              </li>
            )}
          </ol>
        </div>
      )}
    </div>
  )
}
