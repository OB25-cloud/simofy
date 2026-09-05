'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Invoice, Client, Job, Quote } from '@/lib/types'
import AddInvoiceModal from './AddInvoiceModal'
import { StatusBadge, statusDot } from '@/app/components/ui/Badge'
import Button from '@/app/components/ui/Button'

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_CHIPS: { key: string; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'sent',    label: 'Sent' },
  { key: 'paid',    label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'draft',   label: 'Draft' },
]

export function fmt(n: number | null | undefined): string {
  return n != null ? `$${Number(n).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
}

export function fmtShort(n: number): string {
  if (n >= 100_000) return `$${Math.round(n / 1000)}k`
  if (n >= 10_000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `$${Math.round(n).toLocaleString('en-NZ')}`
}

export function invoiceNumber(id: string): string {
  return `INV-${id.slice(0, 6).toUpperCase()}`
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function daysUntil(s: string | null | undefined, now: Date): number | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return Math.round((startOfLocalDay(d) - startOfLocalDay(now)) / 86_400_000)
}

type Tone = 'today' | 'soon' | 'overdue' | 'past' | 'none'
export const TONE_CLASS: Record<Tone, string> = {
  today: 'text-accent font-semibold',
  soon: 'text-ink-muted',
  overdue: 'text-error font-semibold',
  past: 'text-ink-faint',
  none: 'text-ink-faint',
}

// Due-date indicator. Paid/cancelled invoices are settled, so their due
// date is just history rather than a warning.
export function dueLabel(inv: Pick<Invoice, 'due_date' | 'status'>, now: Date): { text: string; tone: Tone } {
  const diff = daysUntil(inv.due_date, now)
  if (diff == null) return { text: 'No due date', tone: 'none' }
  const settled = inv.status === 'paid' || inv.status === 'cancelled'
  if (settled) return { text: inv.status === 'paid' ? 'settled' : 'cancelled', tone: 'past' }
  if (diff === 0) return { text: 'due today', tone: 'today' }
  if (diff > 0) return { text: diff < 14 ? `due in ${diff}d` : diff < 60 ? `due in ${Math.round(diff / 7)}w` : `due in ${Math.round(diff / 30)}mo`, tone: 'soon' }
  const late = -diff
  return { text: late < 60 ? `overdue ${late}d` : `overdue ${Math.round(late / 30)}mo`, tone: 'overdue' }
}

export function relativeAgo(s: string, now: Date): string {
  const days = Math.max(0, Math.round((startOfLocalDay(now) - startOfLocalDay(new Date(s))) / 86_400_000))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) { const w = Math.round(days / 7); return `${w} ${w === 1 ? 'week' : 'weeks'} ago` }
  if (days < 365) { const m = Math.round(days / 30); return `${m} ${m === 1 ? 'month' : 'months'} ago` }
  const y = Math.round(days / 365)
  return `${y} ${y === 1 ? 'year' : 'years'} ago`
}

// ── icons ─────────────────────────────────────────────────────────────────────

const I = {
  invoice: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  bank: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
  plus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
}

function SupportStat({ label, value, sub, icon, tone = 'accent', trend }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone?: 'accent' | 'danger' | 'muted'; trend?: number | null }) {
  const bar = tone === 'danger' ? 'bg-error' : tone === 'muted' ? 'bg-line' : 'bg-accent'
  const tile = tone === 'danger' ? 'bg-red-50 text-error' : 'bg-accent-soft text-accent'
  return (
    <div className="relative h-[116px] bg-surface rounded-xl border border-line shadow-card pl-4 pr-3 py-3 overflow-hidden min-w-0 flex flex-col">
      <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', bar].join(' ')} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4 truncate">{label}</p>
        <span className={['shrink-0 flex items-center justify-center w-6 h-6 rounded-md', tile].join(' ')}>{icon}</span>
      </div>
      <div className="mt-auto flex items-end gap-2 min-w-0">
        <p className={['text-[26px] leading-none font-bold tracking-tight tabular-nums', tone === 'danger' ? 'text-error' : 'text-ink'].join(' ')}>{value}</p>
        {trend != null && (
          <span className={['mb-0.5 inline-flex items-center gap-0.5 text-[10.5px] font-semibold tabular-nums px-1.5 py-px rounded-md', trend >= 0 ? 'bg-accent-soft text-accent' : 'bg-red-50 text-error'].join(' ')}>
            {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-ink-muted truncate leading-4 h-4">{sub ?? ''}</p>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

interface Props {
  invoices: Invoice[]
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  jobs: Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
  quotes: Pick<Quote, 'id' | 'client_id' | 'total'>[]
}

export default function InvoicesView({ invoices, clients, jobs, quotes }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const now = useMemo(() => new Date(), [])

  const h = useMemo(() => {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
    const paidAt = (inv: Invoice) => new Date(inv.paid_date ?? inv.created_at).getTime()
    const sum = (list: Invoice[]) => list.reduce((s, inv) => s + (inv.total ?? 0), 0)

    const sent = invoices.filter(i => i.status === 'sent')
    const overdue = invoices.filter(i => i.status === 'overdue')
    const paid = invoices.filter(i => i.status === 'paid')
    const draft = invoices.filter(i => i.status === 'draft')
    const open = [...sent, ...overdue]
    const outstanding = sum(open)
    const overdueValue = sum(overdue)
    const paidThisMonthList = paid.filter(i => paidAt(i) >= monthStart)
    const paidLastMonthList = paid.filter(i => { const t = paidAt(i); return t >= lastMonthStart && t < monthStart })
    const paidThisMonth = sum(paidThisMonthList)
    const paidLastMonth = sum(paidLastMonthList)
    const trend = paidLastMonth > 0 ? Math.round(((paidThisMonth - paidLastMonth) / paidLastMonth) * 100) : paidThisMonth > 0 ? 100 : null
    const collected = sum(paid)
    const oldestLate = overdue.reduce((m, i) => Math.max(m, -(daysUntil(i.due_date, now) ?? 0)), 0)
    const dueThisWeek = open.filter(i => { const d = daysUntil(i.due_date, now); return d != null && d >= 0 && d <= 7 })
    return { sent, overdue, paid, draft, open, outstanding, overdueValue, paidThisMonth, paidLastMonth, paidThisMonthList, trend, collected, oldestLate, dueThisWeek }
  }, [invoices, now])

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return invoices.filter(inv => {
      const matchSearch =
        !s ||
        invoiceNumber(inv.id).toLowerCase().includes(s) ||
        (inv.clients?.name.toLowerCase().includes(s) ?? false) ||
        (inv.status?.includes(s) ?? false) ||
        (inv.jobs?.title?.toLowerCase().includes(s) ?? false) ||
        (inv.jobs?.job_type?.toLowerCase().includes(s) ?? false)
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [invoices, search, statusFilter])

  const chipBase = 'px-2.5 py-1 text-[12px] rounded-md transition-[background-color,color,box-shadow] duration-150 whitespace-nowrap inline-flex items-center gap-1.5 ring-1 ring-inset'
  const chipOff = 'bg-white text-ink-muted hover:text-ink hover:bg-surface-muted ring-line font-medium'

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">Invoices</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
            {h.open.length > 0 && <> · <span className="text-ink font-medium">{h.open.length} awaiting payment</span></>}
            {h.overdue.length > 0 && <> · <span className="text-error font-semibold">{h.overdue.length} overdue</span></>}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary" className="shrink-0">
          {I.plus} Add Invoice
        </Button>
      </div>

      {/* ── Hero stat strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] gap-3 mb-5">
        <div className="col-span-2 md:col-span-1 relative h-[116px] bg-surface rounded-xl border border-line shadow-card pl-4 pr-3 py-3 overflow-hidden flex flex-col min-w-0">
          <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', h.outstanding > 0 ? 'bg-error' : 'bg-accent'].join(' ')} />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4">Total invoices</p>
            <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-accent text-white">{I.invoice}</span>
          </div>
          <div className="mt-auto flex items-end justify-between gap-4 min-w-0">
            <p className="text-[34px] leading-none font-bold tracking-tight tabular-nums text-ink">{invoices.length}</p>
            <div className="text-right min-w-0">
              <p className={['text-[10px] font-semibold uppercase tracking-[0.1em] leading-3', h.outstanding > 0 ? 'text-error' : 'text-accent'].join(' ')}>Outstanding</p>
              <p className={['text-[26px] leading-none font-bold tracking-tight tabular-nums mt-1', h.outstanding > 0 ? 'text-error' : 'text-accent'].join(' ')}>{fmtShort(h.outstanding)}</p>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-muted truncate leading-4 h-4 tabular-nums">
            {invoices.length} invoices total · {h.open.length} unpaid{h.dueThisWeek.length > 0 ? ` · ${h.dueThisWeek.length} due this week` : ''}
          </p>
        </div>

        <SupportStat label="Overdue" value={String(h.overdue.length)} icon={I.alert} tone={h.overdue.length > 0 ? 'danger' : 'muted'} sub={h.overdue.length > 0 ? `oldest ${h.oldestLate}d late · ${fmtShort(h.overdueValue)}` : 'Nothing overdue'} />
        <SupportStat label="Paid this month" value={fmtShort(h.paidThisMonth)} icon={I.check} trend={h.trend} sub={`${fmtShort(h.paidLastMonth)} last month · ${h.paidThisMonthList.length} ${h.paidThisMonthList.length === 1 ? 'invoice' : 'invoices'}`} />
        <SupportStat label="Collected total" value={fmtShort(h.collected)} icon={I.bank} sub={h.paid.length > 0 ? `${h.paid.length} paid invoices all time` : 'No payments yet'} />
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-3 bg-surface rounded-xl border border-line shadow-card px-3 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_CHIPS.map(chip => {
            const active = statusFilter === chip.key
            const dot = chip.key === 'all' ? null : statusDot(chip.key)
            const count = chip.key === 'all' ? invoices.length : invoices.filter(i => i.status === chip.key).length
            const on = chip.key === 'overdue' ? 'bg-red-50 text-red-800 font-semibold ring-red-600/25' : 'bg-accent-soft text-accent font-semibold ring-accent/30'
            return (
              <button key={chip.key} onClick={() => setStatusFilter(chip.key)} className={[chipBase, active ? on : chipOff].join(' ')}>
                {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
                {chip.label}
                <span className={['text-[10.5px] tabular-nums', active ? 'opacity-80' : 'text-ink-faint'].join(' ')}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="relative lg:ml-auto w-full lg:w-[280px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">{I.search}</span>
          <input
            type="text"
            placeholder="Search invoice no., client or job…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-line rounded-lg text-ink placeholder:text-ink-faint bg-surface focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-[box-shadow,border-color]"
          />
        </div>
      </div>

      {/* ── Quick insights ── */}
      <div className="mb-4 px-1 flex items-center gap-x-4 gap-y-1 flex-wrap text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className={['w-1.5 h-1.5 rounded-full', h.overdue.length > 0 ? 'bg-error' : 'bg-accent'].join(' ')} />
          <span className={h.overdue.length > 0 ? 'text-error font-semibold' : 'text-ink font-medium'}>{h.overdue.length} overdue</span>
        </span>
        <span className="text-line">·</span>
        <span><span className="text-ink font-medium">{fmtShort(h.outstanding)}</span> outstanding</span>
        <span className="text-line">·</span>
        <span><span className="text-ink font-medium">{fmtShort(h.paidThisMonth)}</span> paid this month</span>
        <span className="ml-auto text-ink-faint tabular-nums">Showing {filtered.length} {filtered.length === 1 ? 'invoice' : 'invoices'}</span>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface shadow-card py-16 text-center">
          <p className="text-sm font-semibold text-ink">{search || statusFilter !== 'all' ? 'No invoices match these filters' : 'No invoices yet'}</p>
          <p className="text-xs text-ink-muted mt-1">{search || statusFilter !== 'all' ? 'Try clearing the search or picking another status.' : 'Add your first invoice to get started.'}</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr>
                  {[
                    { label: 'Invoice', cls: 'pl-5 pr-3' },
                    { label: 'Client', cls: 'px-4' },
                    { label: 'Status', cls: 'px-4' },
                    { label: 'Amount · GST', cls: 'px-4 text-right' },
                    { label: 'Total', cls: 'px-4 text-right' },
                    { label: 'Due', cls: 'px-4' },
                    { label: 'Created', cls: 'px-4' },
                    { label: '', cls: 'w-10 px-4' },
                  ].map(col => (
                    <th key={col.label || 'action'} className={['text-left py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted bg-surface-muted border-b border-line', col.cls].join(' ')}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const due = dueLabel(inv, now)
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                      className="group cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-surface-hover transition-colors"
                    >
                      <td className="pl-5 pr-3 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <span aria-hidden className="w-1.5 h-9 rounded-full shrink-0" style={{ background: statusDot(inv.status) }} />
                          <span className="inline-flex items-center font-mono text-[11.5px] font-semibold text-ink px-2 py-1 rounded-md bg-surface-muted ring-1 ring-inset ring-line whitespace-nowrap">
                            {invoiceNumber(inv.id)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="text-[14px] font-semibold text-ink leading-snug truncate max-w-[240px] group-hover:text-accent transition-colors">
                          {inv.clients?.name ?? <span className="text-ink-faint font-normal">No client</span>}
                        </p>
                        <p className="text-[12px] text-ink-muted truncate max-w-[240px] mt-0.5">
                          {inv.jobs?.title ?? inv.jobs?.job_type ?? <span className="text-ink-faint">No linked job</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-middle"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                        <p className="text-[12.5px] text-ink-muted tabular-nums leading-tight">{fmt(inv.amount)}</p>
                        <p className="text-[11px] text-ink-faint tabular-nums leading-tight mt-0.5">+ {fmt(inv.tax)} GST</p>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                        <span className={['text-[14px] font-bold tabular-nums', inv.status === 'overdue' ? 'text-error' : 'text-ink'].join(' ')}>{fmt(inv.total)}</span>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="text-[13px] text-ink tabular-nums leading-tight whitespace-nowrap">{fmtDate(inv.due_date)}</p>
                        <p className={['text-[11px] leading-tight mt-0.5 whitespace-nowrap', TONE_CLASS[due.tone]].join(' ')}>{due.text}</p>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="text-[13px] text-ink leading-tight whitespace-nowrap">{relativeAgo(inv.created_at, now)}</p>
                        <p className="text-[11px] text-ink-faint tabular-nums leading-tight mt-0.5 whitespace-nowrap">{fmtDate(inv.created_at)}</p>
                      </td>
                      <td className="pl-2 pr-4 py-3.5 align-middle text-right">
                        <span className="inline-flex text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition-[color,transform]">{I.arrow}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <AddInvoiceModal clients={clients} jobs={jobs} quotes={quotes} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
