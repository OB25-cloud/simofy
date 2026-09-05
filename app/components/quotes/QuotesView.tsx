'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Quote, Client, Job } from '@/lib/types'
import AddQuoteModal from './AddQuoteModal'
import { isOverdueForFollowUp, daysSinceLastContact } from '@/lib/quoteFollowUp'
import { StatusBadge, statusDot } from '@/app/components/ui/Badge'
import Button from '@/app/components/ui/Button'

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_CHIPS: { key: string; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'draft',     label: 'Draft' },
  { key: 'sent',      label: 'Sent' },
  { key: 'accepted',  label: 'Accepted' },
  { key: 'declined',  label: 'Declined' },
  { key: 'follow_up', label: 'Follow Up' },
]

function fmt(n: number | null | undefined): string {
  return n != null ? `$${Number(n).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
}

function fmtShort(n: number): string {
  if (n >= 100_000) return `$${Math.round(n / 1000)}k`
  if (n >= 10_000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `$${Math.round(n).toLocaleString('en-NZ')}`
}

function fmtFull(n: number): string {
  return `$${Math.round(n).toLocaleString('en-NZ')}`
}

function quoteNumber(id: string): string {
  return `Q-${id.slice(0, 6).toUpperCase()}`
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

// Whole days from today to a date string (date-only or timestamp).
function daysUntil(s: string | null | undefined, now: Date): number | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return Math.round((startOfLocalDay(d) - startOfLocalDay(now)) / 86_400_000)
}

type Tone = 'today' | 'soon' | 'overdue' | 'past' | 'none'
const TONE_CLASS: Record<Tone, string> = {
  today: 'text-accent font-semibold',
  soon: 'text-ink-muted',
  overdue: 'text-error font-semibold',
  past: 'text-ink-faint',
  none: 'text-ink-faint',
}

// Validity only matters while a quote is still live — accepted/declined
// quotes have already been decided so their expiry is just history.
function validityLabel(quote: Quote, now: Date): { text: string; tone: Tone } {
  const diff = daysUntil(quote.valid_until, now)
  if (diff == null) return { text: 'No expiry', tone: 'none' }
  const live = quote.status === 'sent' || quote.status === 'draft'
  if (diff === 0) return { text: 'expires today', tone: live ? 'overdue' : 'past' }
  if (diff > 0) {
    if (!live) return { text: `${diff}d left`, tone: 'past' }
    if (diff <= 7) return { text: `expires in ${diff}d`, tone: 'overdue' }
    if (diff < 60) return { text: `expires in ${Math.round(diff / 7)}w`, tone: 'soon' }
    return { text: `expires in ${Math.round(diff / 30)}mo`, tone: 'soon' }
  }
  const ago = -diff
  const text = ago < 14 ? `expired ${ago}d ago` : ago < 60 ? `expired ${Math.round(ago / 7)}w ago` : `expired ${Math.round(ago / 30)}mo ago`
  return { text, tone: live ? 'overdue' : 'past' }
}

function relativeAgo(s: string, now: Date): string {
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
  quotes: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  draft: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  send: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  conversion: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
  alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  plus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
}

// ── sub-components ────────────────────────────────────────────────────────────

function FollowUpBadge({ days }: { days: number | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25 whitespace-nowrap"
      title={days != null ? `Sent ${days} days ago with no response` : 'Sent more than 7 days ago with no response'}
    >
      {I.alert}
      Follow up{days != null ? ` · ${days}d` : ''}
    </span>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-[10.5px] font-semibold px-1.5 py-px rounded bg-surface-muted text-ink-muted ring-1 ring-inset ring-line whitespace-nowrap max-w-[180px] truncate">
      {children}
    </span>
  )
}

function SupportStat({ label, value, sub, icon, tone = 'accent' }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone?: 'accent' | 'warning' | 'muted' }) {
  const bar = tone === 'warning' ? 'bg-warning' : tone === 'muted' ? 'bg-line' : 'bg-accent'
  const tile = tone === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-accent-soft text-accent'
  return (
    <div className="relative h-[116px] bg-surface rounded-xl border border-line shadow-card pl-4 pr-3 py-3 overflow-hidden min-w-0 flex flex-col">
      <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', bar].join(' ')} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4 truncate">{label}</p>
        <span className={['shrink-0 flex items-center justify-center w-6 h-6 rounded-md', tile].join(' ')}>{icon}</span>
      </div>
      <p className={['mt-auto text-[26px] leading-none font-bold tracking-tight tabular-nums', tone === 'warning' ? 'text-amber-700' : 'text-ink'].join(' ')}>{value}</p>
      <p className="mt-1.5 text-[11px] text-ink-muted truncate leading-4 h-4">{sub ?? ''}</p>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

interface Props {
  quotes: Quote[]
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  jobs: Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
  openModal?: boolean
}

export default function QuotesView({ quotes, clients, jobs, openModal }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(openModal ?? false)
  const now = useMemo(() => new Date(), [])

  const h = useMemo(() => {
    const draft = quotes.filter(q => q.status === 'draft')
    const sent = quotes.filter(q => q.status === 'sent')
    const accepted = quotes.filter(q => q.status === 'accepted')
    const declined = quotes.filter(q => q.status === 'declined')
    const expired = quotes.filter(q => q.status === 'expired')
    const followUp = quotes.filter(isOverdueForFollowUp)
    const acceptedValue = accepted.reduce((s, q) => s + (q.total ?? 0), 0)
    const pendingValue = sent.reduce((s, q) => s + (q.total ?? 0), 0)
    const draftValue = draft.reduce((s, q) => s + (q.total ?? 0), 0)
    const followUpValue = followUp.reduce((s, q) => s + (q.total ?? 0), 0)
    // Conversion: of every quote that went out and got a decision, how many said yes.
    const decided = accepted.length + declined.length + expired.length
    const conversion = decided > 0 ? Math.round((accepted.length / decided) * 100) : null
    const expiringSoon = quotes.filter(q => {
      if (q.status !== 'sent' && q.status !== 'draft') return false
      const d = daysUntil(q.valid_until, now)
      return d != null && d >= 0 && d <= 7
    })
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const thisMonth = quotes.filter(q => new Date(q.created_at).getTime() >= monthStart)
    const acceptedThisMonth = accepted.filter(q => new Date(q.created_at).getTime() >= monthStart)
    const avgAccepted = accepted.length > 0 ? acceptedValue / accepted.length : 0
    return {
      draft, sent, accepted, declined, expired, followUp, acceptedValue, pendingValue, draftValue, followUpValue,
      decided, conversion, expiringSoon, thisMonth, acceptedThisMonth, avgAccepted,
    }
  }, [quotes, now])

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return quotes.filter(q => {
      const matchSearch =
        !s ||
        quoteNumber(q.id).toLowerCase().includes(s) ||
        (q.clients?.name.toLowerCase().includes(s) ?? false) ||
        (q.status?.includes(s) ?? false) ||
        (q.jobs?.title?.toLowerCase().includes(s) ?? false) ||
        (q.jobs?.job_type?.toLowerCase().includes(s) ?? false)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'follow_up' ? isOverdueForFollowUp(q) : q.status === statusFilter)
      return matchSearch && matchStatus
    })
  }, [quotes, search, statusFilter])

  const chipBase = 'px-2.5 py-1 text-[12px] rounded-md transition-[background-color,color,box-shadow] duration-150 whitespace-nowrap'
  const hasFollowUp = h.followUp.length > 0

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">Quotes</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'} raised
            {h.sent.length > 0 && <> · <span className="text-ink font-medium">{h.sent.length} awaiting a decision</span></>}
            {hasFollowUp && <> · <span className="text-amber-700 font-semibold">{h.followUp.length} need follow-up</span></>}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary" className="shrink-0">
          {I.plus} Add Quote
        </Button>
      </div>

      {/* ── Hero stat strip ── */}
      <div className={['grid grid-cols-2 gap-3 mb-5', hasFollowUp ? 'md:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))]' : 'md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]'].join(' ')}>
        {/* Hero: total quotes + accepted value — wider, same height as the rest */}
        <div className="col-span-2 md:col-span-1 relative h-[116px] bg-surface rounded-xl border border-line shadow-card pl-4 pr-3 py-3 overflow-hidden flex flex-col min-w-0">
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4">Total quotes</p>
            <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-accent text-white">{I.quotes}</span>
          </div>
          <div className="mt-auto flex items-end justify-between gap-4 min-w-0">
            <p className="text-[34px] leading-none font-bold tracking-tight tabular-nums text-ink">{quotes.length}</p>
            <div className="text-right min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent leading-3">Accepted value</p>
              <p className="text-[26px] leading-none font-bold tracking-tight tabular-nums text-accent mt-1">{fmtShort(h.acceptedValue)}</p>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-muted truncate leading-4 h-4 tabular-nums">
            {h.thisMonth.length > 0 ? `${h.thisMonth.length} raised this month` : 'None raised this month'}
            {h.acceptedThisMonth.length > 0 && <> · <span className="text-ink font-medium">{h.acceptedThisMonth.length} won</span></>}
            {h.accepted.length > 0 && <> · {h.accepted.length} won all time · avg {fmtFull(h.avgAccepted)}</>}
          </p>
        </div>

        <SupportStat label="Draft" value={String(h.draft.length)} icon={I.draft} tone="muted" sub={h.draftValue > 0 ? `${fmtShort(h.draftValue)} not yet sent` : 'Nothing waiting to go out'} />
        <SupportStat label="Sent" value={String(h.sent.length)} icon={I.send} sub={h.pendingValue > 0 ? `${fmtShort(h.pendingValue)} pending acceptance` : 'None awaiting a decision'} />
        <SupportStat label="Accepted" value={String(h.accepted.length)} icon={I.check} sub={h.declined.length > 0 ? `${h.declined.length} declined · ${h.expired.length} expired` : `${h.expired.length} expired`} />
        <SupportStat label="Conversion" value={h.conversion != null ? `${h.conversion}%` : '—'} icon={I.conversion} sub={h.decided > 0 ? `${h.accepted.length} of ${h.decided} decided` : 'No decisions yet'} />
        {hasFollowUp && (
          <SupportStat label="Follow up" value={String(h.followUp.length)} icon={I.alert} tone="warning" sub={`${fmtShort(h.followUpValue)} gone quiet 7d+`} />
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-3 bg-surface rounded-xl border border-line shadow-card px-3 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_CHIPS.map(chip => {
            const active = statusFilter === chip.key
            const isFollow = chip.key === 'follow_up'
            const dot = chip.key === 'all' ? null : isFollow ? '#F59E0B' : statusDot(chip.key)
            const count = chip.key === 'all' ? quotes.length : isFollow ? h.followUp.length : quotes.filter(q => q.status === chip.key).length
            return (
              <button
                key={chip.key}
                onClick={() => setStatusFilter(chip.key)}
                className={[
                  chipBase, 'inline-flex items-center gap-1.5 ring-1 ring-inset',
                  active
                    ? (isFollow ? 'bg-amber-50 text-amber-800 font-semibold ring-amber-600/30' : 'bg-accent-soft text-accent font-semibold ring-accent/30')
                    : 'bg-white text-ink-muted hover:text-ink hover:bg-surface-muted ring-line font-medium',
                ].join(' ')}
              >
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
            placeholder="Search quote no., client, job or type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-line rounded-lg text-ink placeholder:text-ink-faint bg-surface focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-[box-shadow,border-color]"
          />
        </div>
      </div>

      {/* ── Quick insights ── */}
      <div className="mb-4 px-1 flex items-center gap-x-4 gap-y-1 flex-wrap text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className={['w-1.5 h-1.5 rounded-full', hasFollowUp ? 'bg-warning' : 'bg-accent'].join(' ')} />
          <span className={hasFollowUp ? 'text-amber-700 font-semibold' : 'text-ink font-medium'}>{h.followUp.length}</span>
          {h.followUp.length === 1 ? ' quote needs follow-up' : ' quotes need follow-up'}
        </span>
        <span className="text-line">·</span>
        <span><span className="text-ink font-medium">{fmtShort(h.pendingValue)}</span> pending acceptance across {h.sent.length} sent</span>
        <span className="text-line">·</span>
        <span>
          <span className={h.expiringSoon.length > 0 ? 'text-error font-semibold' : 'text-ink font-medium'}>{h.expiringSoon.length}</span> expiring this week
        </span>
        <span className="ml-auto text-ink-faint tabular-nums">
          Showing {filtered.length} {filtered.length === 1 ? 'quote' : 'quotes'}
        </span>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface shadow-card py-16 text-center">
          <p className="text-sm font-semibold text-ink">
            {search || statusFilter !== 'all' ? 'No quotes match these filters' : 'No quotes yet'}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            {search || statusFilter !== 'all' ? 'Try clearing the search or picking another status.' : 'Add your first quote to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr>
                  {[
                    { label: 'Quote', cls: 'pl-5 pr-3' },
                    { label: 'Client', cls: 'px-4' },
                    { label: 'Status', cls: 'px-4' },
                    { label: 'Subtotal', cls: 'px-4 text-right' },
                    { label: 'Total', cls: 'px-4 text-right' },
                    { label: 'Valid until', cls: 'px-4' },
                    { label: 'Created', cls: 'px-4' },
                    { label: '', cls: 'w-10 px-4' },
                  ].map(col => (
                    <th
                      key={col.label || 'action'}
                      className={['text-left py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted bg-surface-muted border-b border-line', col.cls].join(' ')}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(quote => {
                  const validity = validityLabel(quote, now)
                  const followUp = isOverdueForFollowUp(quote)
                  const dot = followUp ? '#F59E0B' : statusDot(quote.status)
                  return (
                    <tr
                      key={quote.id}
                      onClick={() => router.push(`/quotes/${quote.id}`)}
                      className="group cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-surface-hover transition-colors"
                    >
                      <td className="pl-5 pr-3 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <span aria-hidden className="w-1.5 h-9 rounded-full shrink-0" style={{ background: dot }} />
                          <span className="inline-flex items-center font-mono text-[11.5px] font-semibold text-ink px-2 py-1 rounded-md bg-surface-muted ring-1 ring-inset ring-line whitespace-nowrap">
                            {quoteNumber(quote.id)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="text-[14px] font-semibold text-ink leading-snug truncate max-w-[260px] group-hover:text-accent transition-colors">
                          {quote.clients?.name ?? <span className="text-ink-faint font-normal">No client</span>}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {quote.jobs?.title ? <Tag>{quote.jobs.title}</Tag> : <span className="text-[11px] text-ink-faint">No linked job</span>}
                          {quote.jobs?.job_type && <Tag>{quote.jobs.job_type}</Tag>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={quote.status} />
                          {followUp && <FollowUpBadge days={daysSinceLastContact(quote)} />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right text-[12.5px] text-ink-muted tabular-nums whitespace-nowrap">{fmt(quote.subtotal)}</td>
                      <td className="px-4 py-3.5 align-middle text-right text-[14px] font-bold text-ink tabular-nums whitespace-nowrap">{fmt(quote.total)}</td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="text-[13px] text-ink tabular-nums leading-tight whitespace-nowrap">{fmtDate(quote.valid_until)}</p>
                        <p className={['text-[11px] leading-tight mt-0.5 whitespace-nowrap', TONE_CLASS[validity.tone]].join(' ')}>{validity.text}</p>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="text-[13px] text-ink leading-tight whitespace-nowrap">{relativeAgo(quote.created_at, now)}</p>
                        <p className="text-[11px] text-ink-faint tabular-nums leading-tight mt-0.5 whitespace-nowrap">{fmtDate(quote.created_at)}</p>
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
        <AddQuoteModal clients={clients} jobs={jobs} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
