'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Invoice, QuoteLineItem } from '@/lib/types'
import { StatusBadge } from '@/app/components/ui/Badge'
import { colorForStaff } from '@/app/components/schedule/scheduleColors'
import InvoicePDFButton from './InvoicePDFButton'
import { dueLabel, fmt, fmtDate, relativeAgo, TONE_CLASS } from './InvoicesView'

interface Props {
  invoice: Invoice
  lineItems: QuoteLineItem[]
}

function quoteNumber(id: string) {
  return `Q-${id.slice(0, 6).toUpperCase()}`
}

function initials(name: string | null | undefined): string {
  return (name ?? '?').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const I = {
  phone: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  mail: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  bell: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  arrow: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
}

function CardHeader({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line-soft">
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      {aside}
    </div>
  )
}

function Detail({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint leading-3">{label}</p>
      <div className="text-[13.5px] text-ink mt-1">{children}</div>
    </div>
  )
}

// Invoice as a document: who it's for, what's owed, what was billed, how
// it was paid, and what has happened to it. Mark-as-paid and reminder
// behaviour are unchanged from the previous tabbed layout.
export default function InvoiceDetailTabs({ invoice, lineItems }: Props) {
  const router = useRouter()
  const [markingPaid, setMarkingPaid] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [reminderSent, setReminderSent] = useState(false)
  const [reminderError, setReminderError] = useState('')
  const now = useMemo(() => new Date(), [])

  const isPaid = invoice.status === 'paid'
  const isOverdue = invoice.status === 'overdue'
  const isCancelled = invoice.status === 'cancelled'
  const due = dueLabel(invoice, now)
  const clientColor = invoice.client_id ? colorForStaff(invoice.client_id) : null

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

    if (error) setReminderError(error.message)
    else setReminderSent(true)
    setSendingReminder(false)
  }

  const timeline: { label: string; date: string | null; detail?: string; color: string; done: boolean }[] = [
    { label: 'Invoice created', date: invoice.created_at, color: 'var(--accent)', done: true },
    ...(invoice.status !== 'draft' ? [{ label: 'Sent to client', date: null, detail: invoice.clients?.email ? `to ${invoice.clients.email}` : 'date not recorded', color: '#3B82F6', done: true }] : []),
    ...(isOverdue ? [{ label: 'Became overdue', date: invoice.due_date, detail: invoice.due_date ? `${-(Math.min(0, Math.round((new Date(invoice.due_date).getTime() - now.getTime()) / 86_400_000)))} days past due` : undefined, color: 'var(--error)', done: true }] : []),
    ...(isPaid ? [{ label: 'Payment received', date: invoice.paid_date, detail: fmt(invoice.total), color: '#16a34a', done: true }] : []),
    ...(isCancelled ? [{ label: 'Invoice cancelled', date: null, color: 'var(--ink-faint)', done: true }] : []),
    ...(!isPaid && !isCancelled ? [{ label: 'Awaiting payment', date: invoice.due_date, detail: invoice.due_date ? `due ${fmtDate(invoice.due_date)}` : 'no due date set', color: 'var(--line)', done: false }] : []),
  ]

  return (
    <div className="space-y-4">
      {/* ── Hero: bill-to + invoice details ── */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="h-1" style={{ background: isPaid ? '#16a34a' : isOverdue ? 'var(--error)' : 'var(--accent)' }} />
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Client */}
          <div className="lg:col-span-5 px-6 py-5 border-b lg:border-b-0 lg:border-r border-line-soft">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint mb-3">Bill to</p>
            {invoice.clients ? (
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ring-2 ring-white shadow-[0_0_0_1px_rgba(17,24,39,0.06)]" style={{ background: clientColor?.solid ?? '#94a3b8' }}>
                  {initials(invoice.clients.name)}
                </span>
                <div className="min-w-0">
                  {invoice.client_id
                    ? <Link href={`/clients/${invoice.client_id}`} className="text-[16px] font-bold text-ink hover:text-accent transition-colors leading-tight">{invoice.clients.name}</Link>
                    : <p className="text-[16px] font-bold text-ink leading-tight">{invoice.clients.name}</p>}
                  <div className="mt-1.5 space-y-1">
                    {invoice.clients.email && <a href={`mailto:${invoice.clients.email}`} className="flex items-center gap-1.5 text-[12.5px] text-ink-muted hover:text-accent transition-colors"><span className="text-ink-faint">{I.mail}</span>{invoice.clients.email}</a>}
                    {invoice.clients.phone && <a href={`tel:${invoice.clients.phone}`} className="flex items-center gap-1.5 text-[12.5px] text-ink-muted hover:text-accent transition-colors tabular-nums"><span className="text-ink-faint">{I.phone}</span>{invoice.clients.phone}</a>}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-faint">No client on this invoice.</p>
            )}
            {(invoice.jobs || invoice.quotes) && (
              <div className="mt-4 pt-4 border-t border-line-soft flex flex-wrap gap-x-5 gap-y-2">
                {invoice.jobs && (
                  <Detail label="For job">
                    {invoice.job_id
                      ? <Link href={`/jobs/${invoice.job_id}`} className="font-medium hover:text-accent transition-colors">{invoice.jobs.title ?? invoice.jobs.job_type ?? 'Job'}</Link>
                      : <span>{invoice.jobs.title ?? invoice.jobs.job_type}</span>}
                    {invoice.jobs.job_type && invoice.jobs.title && <span className="text-ink-muted"> · {invoice.jobs.job_type}</span>}
                  </Detail>
                )}
                {invoice.quotes && (
                  <Detail label="From quote">
                    <Link href={`/quotes/${invoice.quotes.id}`} className="font-mono text-[12px] font-semibold hover:text-accent transition-colors">{quoteNumber(invoice.quotes.id)}</Link>
                  </Detail>
                )}
              </div>
            )}
          </div>

          {/* Invoice details */}
          <div className="lg:col-span-7 px-6 py-5 bg-surface-muted/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">{isPaid ? 'Amount paid' : isCancelled ? 'Amount' : 'Amount due'}</p>
                <p className={['mt-1 text-[36px] leading-none font-bold tracking-tight tabular-nums', isPaid ? 'text-accent' : isOverdue ? 'text-error' : 'text-ink'].join(' ')}>{fmt(invoice.total)}</p>
                <p className="mt-1.5 text-[11.5px] text-ink-muted tabular-nums">{fmt(invoice.amount)} + {fmt(invoice.tax)} GST</p>
              </div>
              <StatusBadge status={invoice.status} className="mt-1" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4">
              <Detail label="Created">
                <span className="tabular-nums">{fmtDate(invoice.created_at)}</span>
                <span className="block text-[11px] text-ink-faint">{relativeAgo(invoice.created_at, now)}</span>
              </Detail>
              <Detail label="Due">
                <span className="tabular-nums">{fmtDate(invoice.due_date)}</span>
                <span className={['block text-[11px]', TONE_CLASS[due.tone]].join(' ')}>{due.text}</span>
              </Detail>
              <Detail label={isPaid ? 'Paid' : 'Terms'}>
                {isPaid
                  ? <><span className="tabular-nums">{fmtDate(invoice.paid_date)}</span><span className="block text-[11px] text-ink-faint">{invoice.paid_date ? relativeAgo(invoice.paid_date, now) : 'date not recorded'}</span></>
                  : <><span>{invoice.due_date ? `${Math.max(0, Math.round((new Date(invoice.due_date).getTime() - new Date(invoice.created_at).getTime()) / 86_400_000))} days` : 'Not set'}</span><span className="block text-[11px] text-ink-faint">from issue date</span></>}
              </Detail>
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={handleMarkPaid}
          disabled={markingPaid || isPaid || isCancelled}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-white rounded-lg bg-accent hover:brightness-110 active:brightness-95 transition-[filter] disabled:opacity-50 disabled:hover:brightness-100 shadow-[0_1px_2px_rgba(17,24,39,0.12)]"
        >
          {I.check}
          {markingPaid ? 'Updating…' : isPaid ? 'Paid' : 'Mark as paid'}
        </button>
        <button
          onClick={handleSendReminder}
          disabled={sendingReminder || isPaid || isCancelled || reminderSent || invoice.status === 'draft'}
          className={[
            'inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium rounded-lg border transition-colors disabled:opacity-50',
            reminderSent ? 'bg-accent-soft text-accent border-accent/30' : 'bg-white text-ink border-line hover:bg-surface-muted hover:border-[#d6d3d1]',
          ].join(' ')}
        >
          {I.bell}
          {sendingReminder ? 'Sending…' : reminderSent ? 'Reminder queued' : 'Send reminder'}
        </button>
        <InvoicePDFButton invoice={invoice} lineItems={lineItems} />
        {reminderError && <p className="text-xs text-error">{reminderError}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Line items ── */}
        <div className="lg:col-span-8 bg-surface rounded-xl border border-line shadow-card overflow-hidden self-start">
          <CardHeader title="Line items" aside={<span className="text-xs text-ink-faint">{lineItems.length > 0 ? `${lineItems.length} ${lineItems.length === 1 ? 'item' : 'items'} from ${invoice.quotes ? quoteNumber(invoice.quotes.id) : 'quote'}` : 'summary'}</span>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr>
                  {[
                    { label: 'Description', cls: 'pl-5 pr-4 text-left' },
                    { label: 'Qty', cls: 'px-4 text-right' },
                    { label: 'Unit', cls: 'px-4 text-right' },
                    { label: 'Amount', cls: 'pl-4 pr-5 text-right' },
                  ].map(col => (
                    <th key={col.label} className={['py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted bg-surface-muted border-b border-line', col.cls].join(' ')}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineItems.length > 0 ? lineItems.map(item => (
                  <tr key={item.id} className="border-b border-line-soft">
                    <td className="pl-5 pr-4 py-3 text-[13.5px] text-ink">{item.description ?? <span className="text-ink-faint">—</span>}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-ink-muted tabular-nums">{item.quantity ?? 0}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-ink-muted tabular-nums">{fmt(item.unit_price)}</td>
                    <td className="pl-4 pr-5 py-3 text-right text-[13.5px] font-semibold text-ink tabular-nums">{fmt(item.amount)}</td>
                  </tr>
                )) : (
                  <tr className="border-b border-line-soft">
                    <td className="pl-5 pr-4 py-3 text-[13.5px] text-ink">
                      {invoice.jobs?.title ?? invoice.jobs?.job_type ?? 'Services rendered'}
                      {invoice.jobs?.job_type && invoice.jobs.title && <span className="block text-[11.5px] text-ink-muted mt-0.5">{invoice.jobs.job_type}</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] text-ink-muted tabular-nums">1</td>
                    <td className="px-4 py-3 text-right text-[13px] text-ink-muted tabular-nums">{fmt(invoice.amount)}</td>
                    <td className="pl-4 pr-5 py-3 text-right text-[13.5px] font-semibold text-ink tabular-nums">{fmt(invoice.amount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 flex justify-end">
            <dl className="w-full max-w-[260px] space-y-1.5 text-[13px]">
              <div className="flex justify-between text-ink-muted"><dt>Subtotal</dt><dd className="tabular-nums">{fmt(invoice.amount)}</dd></div>
              <div className="flex justify-between text-ink-muted"><dt>GST (15%)</dt><dd className="tabular-nums">{fmt(invoice.tax)}</dd></div>
              <div className="flex justify-between pt-2 mt-1 border-t border-line text-[15px] font-bold text-ink"><dt>Total</dt><dd className="tabular-nums">{fmt(invoice.total)}</dd></div>
              {isPaid && <div className="flex justify-between text-[12px] text-accent font-semibold"><dt>Paid</dt><dd className="tabular-nums">−{fmt(invoice.total)}</dd></div>}
              {isPaid && <div className="flex justify-between text-[13px] font-semibold text-ink-muted"><dt>Balance</dt><dd className="tabular-nums">$0.00</dd></div>}
            </dl>
          </div>
        </div>

        {/* ── Payment + activity ── */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
            <CardHeader title="Payment" />
            <div className="px-5 py-4">
              {isPaid ? (
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center shrink-0">{I.check}</span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink">Paid in full</p>
                    <p className="text-[12px] text-ink-muted mt-0.5 tabular-nums">{invoice.paid_date ? `${fmtDate(invoice.paid_date)} · ${relativeAgo(invoice.paid_date, now)}` : 'Payment date not recorded'}</p>
                    <p className="text-[12px] text-ink-muted mt-2"><span className="text-ink-faint">Method</span> Bank transfer <span className="text-ink-faint">(not recorded)</span></p>
                    <p className="text-[12px] text-ink-muted"><span className="text-ink-faint">Amount</span> <span className="font-semibold text-ink tabular-nums">{fmt(invoice.total)}</span></p>
                  </div>
                </div>
              ) : isCancelled ? (
                <p className="text-sm text-ink-faint">This invoice was cancelled — no payment expected.</p>
              ) : (
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Balance due</p>
                  <p className={['mt-1 text-[24px] font-bold tabular-nums tracking-tight', isOverdue ? 'text-error' : 'text-ink'].join(' ')}>{fmt(invoice.total)}</p>
                  <p className={['mt-1 text-[12px]', TONE_CLASS[due.tone]].join(' ')}>{invoice.due_date ? `${due.text} · ${fmtDate(invoice.due_date)}` : 'No due date set'}</p>
                  {isOverdue && <p className="mt-3 text-[12px] text-ink-muted">Use <span className="font-semibold text-ink">Send reminder</span> to queue a follow-up to the client.</p>}
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
            <CardHeader title="Activity" />
            <ol className="px-5 py-4 space-y-4">
              {timeline.map((ev, i) => (
                <li key={i} className="relative pl-5">
                  {i < timeline.length - 1 && <span aria-hidden className="absolute left-[5px] top-4 bottom-[-18px] w-px bg-line" />}
                  <span aria-hidden className={['absolute left-0 top-1 w-[11px] h-[11px] rounded-full ring-2 ring-white', ev.done ? '' : 'border-2 border-dashed'].join(' ')} style={ev.done ? { background: ev.color } : { borderColor: 'var(--ink-faint)', background: 'transparent' }} />
                  <p className={['text-[13px] font-semibold leading-tight', ev.done ? 'text-ink' : 'text-ink-muted'].join(' ')}>{ev.label}</p>
                  <p className="text-[11.5px] text-ink-muted mt-0.5 tabular-nums">
                    {ev.date ? fmtDate(ev.date) : null}
                    {ev.date && ev.detail ? ' · ' : ''}
                    {ev.detail}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <CardHeader title="Notes" />
          <p className="px-5 py-4 text-sm text-ink-muted whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}
