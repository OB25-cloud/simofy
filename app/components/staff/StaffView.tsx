'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Staff } from '@/lib/types'
import AddStaffModal from './AddStaffModal'
import { StatusBadge } from '@/app/components/ui/Badge'
import Button from '@/app/components/ui/Button'
import { colorForStaff } from '@/app/components/schedule/scheduleColors'

// ── helpers ───────────────────────────────────────────────────────────────────

type RoleFilter = 'all' | 'field' | 'admin'
type StatusFilter = 'all' | 'active' | 'inactive'

const ROLE_CHIPS: { key: RoleFilter; label: string }[] = [
  { key: 'all',   label: 'All' },
  { key: 'field', label: 'Field' },
  { key: 'admin', label: 'Admin' },
]

const ROLE_STYLE: Record<string, { bg: string; text: string; ring: string; label: string; dot: string }> = {
  admin: { bg: 'bg-accent-soft', text: 'text-accent', ring: 'ring-accent/25', label: 'Admin', dot: '#15803d' },
  field: { bg: 'bg-blue-50', text: 'text-blue-800', ring: 'ring-blue-600/20', label: 'Field', dot: '#3B82F6' },
}

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

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function RoleChip({ role, size = 'sm' }: { role: string | null; size?: 'sm' | 'md' }) {
  if (!role) return null
  const cfg = ROLE_STYLE[role] ?? { bg: 'bg-surface-muted', text: 'text-ink-muted', ring: 'ring-line', label: role, dot: '#9CA3AF' }
  return (
    <span className={[
      'inline-flex items-center gap-1.5 font-semibold rounded-full ring-1 ring-inset whitespace-nowrap',
      size === 'md' ? 'text-[11px] px-2.5 py-0.5' : 'text-[10.5px] px-2 py-px',
      cfg.bg, cfg.text, cfg.ring,
    ].join(' ')}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

export function StaffAvatarCircle({ staffId, name, size = 'md', inactive = false }: { staffId: string; name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; inactive?: boolean }) {
  const color = colorForStaff(staffId)
  const sz = size === 'xl' ? 'w-16 h-16 text-xl' : size === 'lg' ? 'w-11 h-11 text-sm' : size === 'md' ? 'w-9 h-9 text-xs' : 'w-7 h-7 text-[10px]'
  return (
    <span
      className={[sz, 'rounded-full flex items-center justify-center font-bold text-white shrink-0 ring-2 ring-white shadow-[0_0_0_1px_rgba(17,24,39,0.06)]', inactive ? 'opacity-45 grayscale' : ''].join(' ')}
      style={{ background: color.solid }}
    >
      {initials(name)}
    </span>
  )
}

// ── icons ─────────────────────────────────────────────────────────────────────

const I = {
  team: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  field: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  admin: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
  dollar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  plus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  phone: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  mail: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
}

function SupportStat({ label, value, sub, icon, tone = 'accent' }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone?: 'accent' | 'muted' }) {
  return (
    <div className="relative bg-surface rounded-xl border border-line shadow-card px-4 py-3.5 overflow-hidden min-w-0">
      <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', tone === 'muted' ? 'bg-line' : 'bg-accent'].join(' ')} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4 pt-0.5">{label}</p>
        <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-accent-soft text-accent">{icon}</span>
      </div>
      <p className="mt-1 text-[26px] leading-none font-bold tracking-tight tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-ink-muted truncate">{sub}</p>}
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

interface Props {
  staff: Staff[]
  scheduledTodayIds?: string[]
}

export default function StaffView({ staff, scheduledTodayIds = [] }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showModal, setShowModal] = useState(false)
  const now = useMemo(() => new Date(), [])
  const todaySet = useMemo(() => new Set(scheduledTodayIds), [scheduledTodayIds])

  const h = useMemo(() => {
    const active = staff.filter(s => s.is_active)
    const field = staff.filter(s => s.role === 'field')
    const admin = staff.filter(s => s.role === 'admin')
    const fieldRates = field.filter(s => s.pay_rate != null).map(s => Number(s.pay_rate))
    const avgRate = fieldRates.length > 0 ? fieldRates.reduce((a, b) => a + b, 0) / fieldRates.length : null
    const minRate = fieldRates.length > 0 ? Math.min(...fieldRates) : null
    const maxRate = fieldRates.length > 0 ? Math.max(...fieldRates) : null
    const scheduledToday = active.filter(s => todaySet.has(s.id))
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const joinedThisMonth = staff.filter(s => new Date(s.created_at).getTime() >= monthStart)
    return { active, field, admin, avgRate, minRate, maxRate, fieldRates, scheduledToday, joinedThisMonth }
  }, [staff, todaySet, now])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return staff.filter(s => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.email?.toLowerCase().includes(q) ?? false) ||
        (s.phone?.includes(q) ?? false) ||
        (s.role?.toLowerCase().includes(q) ?? false)
      const matchRole = roleFilter === 'all' || s.role === roleFilter
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? s.is_active : !s.is_active)
      return matchSearch && matchRole && matchStatus
    })
  }, [staff, search, roleFilter, statusFilter])

  const chipBase = 'px-2.5 py-1 text-[12px] rounded-md transition-[background-color,color,box-shadow] duration-150 whitespace-nowrap inline-flex items-center gap-1.5 ring-1 ring-inset'
  const chipOn = 'bg-accent-soft text-accent font-semibold ring-accent/30'
  const chipOff = 'bg-white text-ink-muted hover:text-ink hover:bg-surface-muted ring-line font-medium'
  const filtering = search || roleFilter !== 'all' || statusFilter !== 'all'

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">Staff</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {staff.length} {staff.length === 1 ? 'team member' : 'team members'}
            {h.scheduledToday.length > 0 && <> · <span className="text-ink font-medium">{h.scheduledToday.length} on the roster today</span></>}
            {staff.length - h.active.length > 0 && <> · <span className="text-ink-faint">{staff.length - h.active.length} inactive</span></>}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary" className="shrink-0">
          {I.plus} Add Staff
        </Button>
      </div>

      {/* ── Hero stat strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mb-5">
        <div className="col-span-2 relative bg-surface rounded-xl border border-line shadow-card px-5 py-4 overflow-hidden">
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4 pt-0.5">Total staff</p>
            <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-white shadow-[0_1px_2px_rgba(17,24,39,0.15)]">{I.team}</span>
          </div>
          <div className="mt-1 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[44px] leading-none font-bold tracking-tight tabular-nums text-ink">{staff.length}</p>
              <p className="mt-2 text-[12px] text-ink-muted">
                <span className="text-ink font-medium">{h.active.length} active</span> team {h.active.length === 1 ? 'member' : 'members'}
                {h.joinedThisMonth.length > 0 && <> · {h.joinedThisMonth.length} joined this month</>}
              </p>
            </div>
            <div className="flex -space-x-2 pb-1">
              {h.active.slice(0, 8).map(s => <StaffAvatarCircle key={s.id} staffId={s.id} name={s.name} size="sm" />)}
              {h.active.length > 8 && (
                <span className="w-7 h-7 rounded-full bg-surface-muted ring-2 ring-white text-[10px] font-bold text-ink-muted flex items-center justify-center">+{h.active.length - 8}</span>
              )}
            </div>
          </div>
        </div>

        <SupportStat label="Field" value={String(h.field.length)} icon={I.field} sub={`${h.field.filter(s => s.is_active).length} active on the tools`} />
        <SupportStat label="Admin" value={String(h.admin.length)} icon={I.admin} sub={`${h.admin.filter(s => s.is_active).length} active in the office`} tone="muted" />
        <SupportStat
          label="Avg pay rate"
          value={h.avgRate != null ? `$${h.avgRate.toFixed(2)}` : '—'}
          icon={I.dollar}
          sub={h.avgRate != null ? `per hour · $${h.minRate!.toFixed(0)}–$${h.maxRate!.toFixed(0)} across ${h.fieldRates.length} field staff` : 'No field pay rates set'}
        />
        <SupportStat
          label="Today"
          value={`${h.scheduledToday.length}/${h.active.length}`}
          icon={I.calendar}
          sub={h.scheduledToday.length > 0 ? `${h.scheduledToday.map(s => s.name.split(' ')[0]).slice(0, 3).join(', ')}${h.scheduledToday.length > 3 ? ` +${h.scheduledToday.length - 3}` : ''} scheduled` : 'Nobody rostered today'}
        />
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-3 bg-surface rounded-xl border border-line shadow-card px-3 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ROLE_CHIPS.map(chip => {
            const active = roleFilter === chip.key
            const count = chip.key === 'all' ? staff.length : staff.filter(s => s.role === chip.key).length
            const dot = chip.key === 'all' ? null : ROLE_STYLE[chip.key]?.dot
            return (
              <button key={chip.key} onClick={() => setRoleFilter(chip.key)} className={[chipBase, active ? chipOn : chipOff].join(' ')}>
                {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
                {chip.label}
                <span className={['text-[10.5px] tabular-nums', active ? 'opacity-80' : 'text-ink-faint'].join(' ')}>{count}</span>
              </button>
            )
          })}
        </div>
        <span className="hidden lg:block w-px h-6 bg-line mx-1" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['active', 'inactive'] as const).map(key => {
            const active = statusFilter === key
            const count = staff.filter(s => (key === 'active' ? s.is_active : !s.is_active)).length
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(active ? 'all' : key)}
                className={[chipBase, active ? (key === 'active' ? chipOn : 'bg-red-50 text-red-800 font-semibold ring-red-600/25') : chipOff].join(' ')}
                aria-pressed={active}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: key === 'active' ? '#16a34a' : '#EF4444' }} />
                {key === 'active' ? 'Active' : 'Inactive'}
                <span className={['text-[10.5px] tabular-nums', active ? 'opacity-80' : 'text-ink-faint'].join(' ')}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="relative lg:ml-auto w-full lg:w-[280px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">{I.search}</span>
          <input
            type="text"
            placeholder="Search name, email, phone or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-line rounded-lg text-ink placeholder:text-ink-faint bg-surface focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-[box-shadow,border-color]"
          />
        </div>
      </div>

      {/* ── Quick insights ── */}
      <div className="mb-4 px-1 flex items-center gap-x-4 gap-y-1 flex-wrap text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3B82F6' }} />
          <span className="text-ink font-medium">{h.field.length}</span> field staff
        </span>
        <span className="text-line">·</span>
        <span><span className="text-ink font-medium">{h.admin.length}</span> admin</span>
        <span className="text-line">·</span>
        <span><span className={h.scheduledToday.length > 0 ? 'text-accent font-semibold' : 'text-ink font-medium'}>{h.scheduledToday.length}</span> scheduled today</span>
        <span className="ml-auto text-ink-faint tabular-nums">
          Showing {filtered.length} of {staff.length}
        </span>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface shadow-card py-16 text-center">
          <p className="text-sm font-semibold text-ink">{filtering ? 'No staff match these filters' : 'No staff yet'}</p>
          <p className="text-xs text-ink-muted mt-1">{filtering ? 'Try clearing the search or picking another chip.' : 'Add your first team member to get started.'}</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr>
                  {[
                    { label: 'Team member', cls: 'pl-5 pr-4' },
                    { label: 'Contact', cls: 'px-4' },
                    { label: 'Pay rate', cls: 'px-4 text-right' },
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
                {filtered.map(member => {
                  const onToday = todaySet.has(member.id)
                  return (
                    <tr
                      key={member.id}
                      onClick={() => router.push(`/staff/${member.id}`)}
                      className="group cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-surface-hover transition-colors"
                    >
                      <td className="pl-5 pr-4 py-3.5 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          <StaffAvatarCircle staffId={member.id} name={member.name} size="md" inactive={!member.is_active} />
                          <div className="min-w-0">
                            <p className={['text-[14px] font-semibold leading-snug truncate group-hover:text-accent transition-colors', member.is_active ? 'text-ink' : 'text-ink-muted'].join(' ')}>
                              {member.name}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <RoleChip role={member.role} />
                              {onToday && (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-accent">
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent" /> On today
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-[12.5px] text-ink-muted flex items-center gap-1.5 tabular-nums">
                            <span className="text-ink-faint">{I.phone}</span>
                            {member.phone ?? <span className="text-ink-faint">No phone</span>}
                          </p>
                          <p className="text-[12px] text-ink-muted flex items-center gap-1.5 min-w-0">
                            <span className="text-ink-faint">{I.mail}</span>
                            <span className="truncate max-w-[220px]">{member.email ?? <span className="text-ink-faint">No email</span>}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right">
                        {member.pay_rate != null
                          ? <span className="font-mono text-[12.5px] text-ink-muted tabular-nums">${Number(member.pay_rate).toFixed(2)}<span className="text-ink-faint">/hr</span></span>
                          : <span className="text-ink-faint text-[12px]">—</span>}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="text-[13px] text-ink leading-tight whitespace-nowrap">{relativeAgo(member.created_at, now)}</p>
                        <p className="text-[11px] text-ink-faint tabular-nums leading-tight mt-0.5 whitespace-nowrap">{fmtDate(member.created_at)}</p>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <StatusBadge status={member.is_active ? 'active' : 'inactive'} label={member.is_active ? 'Active' : 'Inactive'} className={member.is_active ? '' : '!bg-red-50 !text-red-800 !ring-red-600/20'} />
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

      {showModal && <AddStaffModal onClose={() => setShowModal(false)} />}
    </>
  )
}
