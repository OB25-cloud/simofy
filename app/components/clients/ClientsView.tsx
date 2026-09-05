'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@/lib/types'
import AddClientModal from './AddClientModal'
import { StatusBadge } from '@/app/components/ui/Badge'
import Button from '@/app/components/ui/Button'
import { colorForStaff } from '@/app/components/schedule/scheduleColors'

// ── shared helpers (also used by the client profile) ─────────────────────────

export type ClientRollup = { jobs: number; invoiced: number; paid: number; outstanding: number }

type StatusFilter = 'all' | 'active' | 'inactive'

export function initials(name: string | null | undefined): string {
  return (name ?? '?').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export function relativeAgo(s: string, now: Date): string {
  const days = Math.max(0, Math.round((now.getTime() - new Date(s).getTime()) / 86_400_000))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) { const w = Math.round(days / 7); return `${w} ${w === 1 ? 'week' : 'weeks'} ago` }
  if (days < 365) { const m = Math.round(days / 30); return `${m} ${m === 1 ? 'month' : 'months'} ago` }
  const y = Math.round(days / 365)
  return `${y} ${y === 1 ? 'year' : 'years'} ago`
}

export function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString('en-NZ')}`
}

export function fmtMoneyShort(n: number): string {
  if (n >= 100_000) return `$${Math.round(n / 1000)}k`
  if (n >= 10_000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return fmtMoney(n)
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Same hue system as staff avatars and the scheduler — one hash, one look.
export function ClientAvatar({ id, name, size = 'md', inactive = false }: { id: string; name: string; size?: 'sm' | 'md' | 'xl'; inactive?: boolean }) {
  const color = colorForStaff(id)
  const sz = size === 'xl' ? 'w-16 h-16 text-xl' : size === 'md' ? 'w-9 h-9 text-xs' : 'w-7 h-7 text-[10px]'
  return (
    <span
      className={[sz, 'rounded-full flex items-center justify-center font-bold text-white shrink-0 ring-2 ring-white shadow-[0_0_0_1px_rgba(17,24,39,0.06)]', inactive ? 'opacity-45 grayscale' : ''].join(' ')}
      style={{ background: color.solid }}
    >
      {initials(name)}
    </span>
  )
}

export function ClientStatusBadge({ active, className = '' }: { active: boolean; className?: string }) {
  return (
    <StatusBadge
      status={active ? 'active' : 'inactive'}
      label={active ? 'Active' : 'Inactive'}
      className={[active ? '' : '!bg-red-50 !text-red-800 !ring-red-600/20', className].join(' ')}
    />
  )
}

// ── icons ─────────────────────────────────────────────────────────────────────

const I = {
  clients: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  pause: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="10" y1="15" x2="10" y2="9" /><line x1="14" y1="15" x2="14" y2="9" /></svg>,
  dollar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  sparkle: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z" /><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" /></svg>,
  plus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  phone: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  mail: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  pin: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
}

function SupportStat({ label, value, sub, icon, tone = 'accent', trend }: { label: string; value: string; sub?: React.ReactNode; icon: React.ReactNode; tone?: 'accent' | 'muted' | 'danger'; trend?: number | null }) {
  const bar = tone === 'danger' ? 'bg-error' : tone === 'muted' ? 'bg-line' : 'bg-accent'
  const tile = tone === 'danger' ? 'bg-red-50 text-error' : 'bg-accent-soft text-accent'
  return (
    <div className="relative bg-surface rounded-xl border border-line shadow-card px-4 py-3.5 overflow-hidden min-w-0">
      <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', bar].join(' ')} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4 pt-0.5">{label}</p>
        <span className={['shrink-0 flex items-center justify-center w-7 h-7 rounded-lg', tile].join(' ')}>{icon}</span>
      </div>
      <div className="mt-1 flex items-end gap-2 flex-wrap">
        <p className={['text-[26px] leading-none font-bold tracking-tight tabular-nums', tone === 'danger' ? 'text-error' : 'text-ink'].join(' ')}>{value}</p>
        {trend != null && (
          <span className={['mb-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums px-1.5 py-px rounded-md', trend >= 0 ? 'bg-accent-soft text-accent' : 'bg-red-50 text-error'].join(' ')}>
            {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
          </span>
        )}
      </div>
      {sub && <p className="mt-1.5 text-[11px] text-ink-muted truncate">{sub}</p>}
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

interface Props {
  clients: Client[]
  rollup?: Record<string, ClientRollup>
  openModal?: boolean
}

const EMPTY_ROLLUP: ClientRollup = { jobs: 0, invoiced: 0, paid: 0, outstanding: 0 }

export default function ClientsView({ clients, rollup = {}, openModal }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showModal, setShowModal] = useState(openModal ?? false)
  const now = useMemo(() => new Date(), [])

  const h = useMemo(() => {
    const active = clients.filter(c => c.is_active)
    const inactive = clients.filter(c => !c.is_active)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
    const newThisMonth = clients.filter(c => new Date(c.created_at).getTime() >= monthStart)
    const newLastMonth = clients.filter(c => { const t = new Date(c.created_at).getTime(); return t >= lastMonthStart && t < monthStart })
    const trend = newLastMonth.length > 0
      ? Math.round(((newThisMonth.length - newLastMonth.length) / newLastMonth.length) * 100)
      : newThisMonth.length > 0 ? 100 : null
    const totals = Object.values(rollup)
    const revenue = totals.reduce((s, r) => s + r.paid, 0)
    const invoiced = totals.reduce((s, r) => s + r.invoiced, 0)
    const outstanding = totals.reduce((s, r) => s + r.outstanding, 0)
    const withJobs = clients.filter(c => (rollup[c.id]?.jobs ?? 0) > 0).length
    const top = [...clients].sort((a, b) => (rollup[b.id]?.paid ?? 0) - (rollup[a.id]?.paid ?? 0))[0]
    const topPaid = top ? rollup[top.id]?.paid ?? 0 : 0
    return { active, inactive, newThisMonth, newLastMonth, trend, revenue, invoiced, outstanding, withJobs, top, topPaid }
  }, [clients, rollup, now])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter(c => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.business_name?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(q) ?? false) ||
        (c.address?.toLowerCase().includes(q) ?? false)
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? c.is_active : !c.is_active)
      return matchSearch && matchStatus
    })
  }, [clients, search, statusFilter])

  const chipBase = 'px-2.5 py-1 text-[12px] rounded-md transition-[background-color,color,box-shadow] duration-150 whitespace-nowrap inline-flex items-center gap-1.5 ring-1 ring-inset'
  const chipOff = 'bg-white text-ink-muted hover:text-ink hover:bg-surface-muted ring-line font-medium'
  const filtering = search || statusFilter !== 'all'

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">Clients</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
            {h.withJobs > 0 && <> · <span className="text-ink font-medium">{h.withJobs} with jobs on the books</span></>}
            {h.outstanding > 0 && <> · <span className="text-error font-semibold">{fmtMoneyShort(h.outstanding)} outstanding</span></>}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary" className="shrink-0">
          {I.plus} Add Client
        </Button>
      </div>

      {/* ── Hero stat strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mb-5">
        <div className="col-span-2 relative bg-surface rounded-xl border border-line shadow-card px-5 py-4 overflow-hidden">
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4 pt-0.5">Total clients</p>
            <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-white shadow-[0_1px_2px_rgba(17,24,39,0.15)]">{I.clients}</span>
          </div>
          <div className="mt-1 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[44px] leading-none font-bold tracking-tight tabular-nums text-ink">{clients.length}</p>
              <p className="mt-2 text-[12px] text-ink-muted">
                <span className="text-ink font-medium">{h.active.length} active</span> {h.active.length === 1 ? 'client' : 'clients'}
                {h.top && h.topPaid > 0 && <> · top client {h.top.name} <span className="text-ink font-medium">{fmtMoneyShort(h.topPaid)}</span></>}
              </p>
            </div>
            <div className="flex -space-x-2 pb-1">
              {h.active.slice(0, 8).map(c => <ClientAvatar key={c.id} id={c.id} name={c.name} size="sm" />)}
              {h.active.length > 8 && (
                <span className="w-7 h-7 rounded-full bg-surface-muted ring-2 ring-white text-[10px] font-bold text-ink-muted flex items-center justify-center">+{h.active.length - 8}</span>
              )}
            </div>
          </div>
        </div>

        <SupportStat label="Active" value={String(h.active.length)} icon={I.check} sub={`${h.withJobs} with job history`} />
        <SupportStat label="Inactive" value={String(h.inactive.length)} icon={I.pause} tone={h.inactive.length > 0 ? 'muted' : 'muted'} sub={h.inactive.length > 0 ? 'hidden from new jobs' : 'Everyone is active'} />
        <SupportStat label="Total revenue" value={fmtMoneyShort(h.revenue)} icon={I.dollar} sub={h.invoiced > 0 ? `${fmtMoneyShort(h.invoiced)} invoiced · ${fmtMoneyShort(h.outstanding)} owed` : 'Nothing invoiced yet'} />
        <SupportStat
          label="New this month"
          value={String(h.newThisMonth.length)}
          icon={I.sparkle}
          trend={h.trend}
          sub={`${h.newLastMonth.length} last month`}
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-3 bg-surface rounded-xl border border-line shadow-card px-3 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { key: 'all', label: 'All', dot: null, count: clients.length, on: 'bg-accent-soft text-accent font-semibold ring-accent/30' },
            { key: 'active', label: 'Active', dot: '#16a34a', count: h.active.length, on: 'bg-accent-soft text-accent font-semibold ring-accent/30' },
            { key: 'inactive', label: 'Inactive', dot: '#EF4444', count: h.inactive.length, on: 'bg-red-50 text-red-800 font-semibold ring-red-600/25' },
          ] as const).map(chip => {
            const active = statusFilter === chip.key
            return (
              <button key={chip.key} onClick={() => setStatusFilter(chip.key)} className={[chipBase, active ? chip.on : chipOff].join(' ')}>
                {chip.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: chip.dot }} />}
                {chip.label}
                <span className={['text-[10.5px] tabular-nums', active ? 'opacity-80' : 'text-ink-faint'].join(' ')}>{chip.count}</span>
              </button>
            )
          })}
        </div>

        <div className="relative lg:ml-auto w-full lg:w-[300px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">{I.search}</span>
          <input
            type="text"
            placeholder="Search name, business, email, phone or address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-line rounded-lg text-ink placeholder:text-ink-faint bg-surface focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-[box-shadow,border-color]"
          />
        </div>
      </div>

      {/* ── Quick insights ── */}
      <div className="mb-4 px-1 flex items-center gap-x-4 gap-y-1 flex-wrap text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-ink font-medium">{h.active.length}</span> active clients
        </span>
        <span className="text-line">·</span>
        <span><span className="text-ink font-medium">{fmtMoneyShort(h.revenue)}</span> total revenue</span>
        <span className="text-line">·</span>
        <span><span className={h.newThisMonth.length > 0 ? 'text-accent font-semibold' : 'text-ink font-medium'}>{h.newThisMonth.length}</span> new this month</span>
        <span className="ml-auto text-ink-faint tabular-nums">Showing {filtered.length} of {clients.length}</span>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface shadow-card py-16 text-center">
          <p className="text-sm font-semibold text-ink">{filtering ? 'No clients match these filters' : 'No clients yet'}</p>
          <p className="text-xs text-ink-muted mt-1">{filtering ? 'Try clearing the search or picking another chip.' : 'Add your first client to get started.'}</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr>
                  {[
                    { label: 'Client', cls: 'pl-5 pr-4' },
                    { label: 'Contact', cls: 'px-4' },
                    { label: 'Address', cls: 'px-4' },
                    { label: 'Jobs', cls: 'px-4 text-right' },
                    { label: 'Revenue', cls: 'px-4 text-right' },
                    { label: 'Added', cls: 'px-4' },
                    { label: 'Status', cls: 'px-4' },
                    { label: '', cls: 'w-10 px-4' },
                  ].map(col => (
                    <th key={col.label || 'action'} className={['text-left py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted bg-surface-muted border-b border-line', col.cls].join(' ')}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => {
                  const r = rollup[client.id] ?? EMPTY_ROLLUP
                  return (
                    <tr
                      key={client.id}
                      onClick={() => router.push(`/clients/${client.id}`)}
                      className="group cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-surface-hover transition-colors"
                    >
                      <td className="pl-5 pr-4 py-3.5 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          <ClientAvatar id={client.id} name={client.name} inactive={!client.is_active} />
                          <div className="min-w-0">
                            <p className={['text-[14px] font-semibold leading-snug truncate group-hover:text-accent transition-colors', client.is_active ? 'text-ink' : 'text-ink-muted'].join(' ')}>{client.name}</p>
                            {client.business_name
                              ? <p className="text-[12px] text-ink-muted truncate mt-0.5">{client.business_name}</p>
                              : <p className="text-[11px] text-ink-faint mt-0.5">Private client</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-[12.5px] text-ink-muted flex items-center gap-1.5 tabular-nums">
                            <span className="text-ink-faint">{I.phone}</span>
                            {client.phone ?? <span className="text-ink-faint">No phone</span>}
                          </p>
                          <p className="text-[12px] text-ink-muted flex items-center gap-1.5 min-w-0">
                            <span className="text-ink-faint">{I.mail}</span>
                            <span className="truncate max-w-[200px]">{client.email ?? <span className="text-ink-faint">No email</span>}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        {client.address
                          ? <span className="flex items-center gap-1.5 text-[12.5px] text-ink-muted max-w-[220px]" title={client.address}><span className="text-ink-faint shrink-0">{I.pin}</span><span className="truncate">{client.address}</span></span>
                          : <span className="text-ink-faint text-[12px]">—</span>}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right">
                        {r.jobs > 0
                          ? <span className="inline-flex items-center justify-center min-w-7 px-1.5 py-0.5 rounded-md bg-surface-muted ring-1 ring-inset ring-line text-[12px] font-semibold text-ink tabular-nums">{r.jobs}</span>
                          : <span className="text-ink-faint text-[12px]">0</span>}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right">
                        {r.invoiced > 0
                          ? <>
                              <p className="text-[13.5px] font-bold text-ink tabular-nums leading-tight">{fmtMoney(r.invoiced)}</p>
                              {r.outstanding > 0
                                ? <p className="text-[10.5px] text-error font-semibold tabular-nums leading-tight mt-0.5">{fmtMoney(r.outstanding)} owed</p>
                                : <p className="text-[10.5px] text-ink-faint tabular-nums leading-tight mt-0.5">all paid</p>}
                            </>
                          : <span className="text-ink-faint text-[12px]">—</span>}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="text-[13px] text-ink leading-tight whitespace-nowrap">{relativeAgo(client.created_at, now)}</p>
                        <p className="text-[11px] text-ink-faint tabular-nums leading-tight mt-0.5 whitespace-nowrap">{fmtDate(client.created_at)}</p>
                      </td>
                      <td className="px-4 py-3.5 align-middle"><ClientStatusBadge active={client.is_active} /></td>
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

      {showModal && <AddClientModal onClose={() => setShowModal(false)} />}
    </>
  )
}
