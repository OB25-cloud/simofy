'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Client, Job, Quote, Invoice, Site, Notification } from '@/lib/types'
import SitesSection from './SitesSection'
import NotificationsSection from './NotificationsSection'
import CommunicationsSection from './CommunicationsSection'
import { StatusBadge, statusDot } from '@/app/components/ui/Badge'
import { fmtMoney, relativeAgo } from './ClientsView'

type NotifSetting = { notification_type: string; enabled: boolean }

// ── overview pieces ───────────────────────────────────────────────────────────

const I = {
  briefcase: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  dollar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  phone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  mail: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  pin: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
}

function OverviewStat({ label, value, sub, icon, tone = 'accent' }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone?: 'accent' | 'muted' | 'danger' }) {
  const bar = tone === 'danger' ? 'bg-error' : tone === 'muted' ? 'bg-line' : 'bg-accent'
  const tile = tone === 'danger' ? 'bg-red-50 text-error' : 'bg-accent-soft text-accent'
  return (
    <div className="relative bg-surface rounded-xl border border-line shadow-card px-4 py-3.5 overflow-hidden min-w-0">
      <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', bar].join(' ')} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4 pt-0.5">{label}</p>
        <span className={['shrink-0 flex items-center justify-center w-7 h-7 rounded-lg', tile].join(' ')}>{icon}</span>
      </div>
      <p className={['mt-1 text-[26px] leading-none font-bold tracking-tight tabular-nums', tone === 'danger' ? 'text-error' : 'text-ink'].join(' ')}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-ink-muted truncate">{sub}</p>}
    </div>
  )
}

function CardHeader({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line-soft">
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      {aside}
    </div>
  )
}

function Field({ icon, label, children, action }: { icon: React.ReactNode; label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className="mt-0.5 w-8 h-8 rounded-lg bg-surface-muted text-ink-muted flex items-center justify-center shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint leading-3">{label}</p>
        <div className="text-[14px] text-ink mt-1 break-words">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

function relativeJobLabel(job: Job, now: Date): { text: string; cls: string } {
  if (!job.scheduled_date) return { text: 'Unscheduled', cls: 'text-ink-faint' }
  const d = new Date(job.scheduled_date)
  const a = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const diff = Math.round((a - b) / 86_400_000)
  const done = ['complete', 'invoiced', 'cancelled'].includes(job.status ?? '')
  if (diff === 0) return { text: 'Today', cls: done ? 'text-ink-faint' : 'text-accent font-semibold' }
  if (diff === 1) return { text: 'Tomorrow', cls: 'text-ink-muted' }
  if (diff > 1) return { text: diff < 14 ? `in ${diff} days` : diff < 60 ? `in ${Math.round(diff / 7)} wks` : `in ${Math.round(diff / 30)} mo`, cls: 'text-ink-muted' }
  const ago = -diff
  if (!done) return { text: `overdue ${ago}d`, cls: 'text-error font-semibold' }
  return { text: ago < 14 ? `${ago}d ago` : ago < 60 ? `${Math.round(ago / 7)}w ago` : `${Math.round(ago / 30)}mo ago`, cls: 'text-ink-faint' }
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-5 py-3 text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em] bg-surface-muted border-b border-line">
      {children}
    </th>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted py-10 text-center">
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  )
}

function fmt(n: number | null | undefined) {
  return n != null ? `$${n.toFixed(2)}` : '—'
}

function fmtDate(s: string | null | undefined) {
  if (!s) return <span className="text-gray-300">—</span>
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TABS = [
  { key: 'overview',      label: 'Overview'      },
  { key: 'jobs',          label: 'Jobs'           },
  { key: 'quotes',        label: 'Quotes'         },
  { key: 'invoices',      label: 'Invoices'       },
  { key: 'sites',         label: 'Sites'          },
  { key: 'notifications', label: 'Notifications'  },
  { key: 'communications',label: 'Communications' },
]

interface Props {
  client: Client
  jobs: Job[]
  quotes: Quote[]
  invoices: Invoice[]
  sites: Site[]
  notifSettings: NotifSetting[]
  notifications: Notification[]
}

export default function ClientTabs({ client, jobs, quotes, invoices, sites, notifSettings, notifications }: Props) {
  const [activeTab, setActiveTab] = useState('overview')
  const now = useMemo(() => new Date(), [])

  const totalInvoiced = invoices.reduce((s: number, inv) => s + (inv.total ?? 0), 0)
  const paidTotal = invoices.filter(inv => inv.status === 'paid').reduce((s: number, inv) => s + (inv.total ?? 0), 0)
  const outstanding = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((s: number, inv) => s + (inv.total ?? 0), 0)
  const overdueTotal = invoices.filter(inv => inv.status === 'overdue').reduce((s: number, inv) => s + (inv.total ?? 0), 0)
  const completedJobs = jobs.filter(j => j.status === 'complete' || j.status === 'invoiced').length
  const upcomingJobs = jobs.filter(j => !['complete', 'invoiced', 'cancelled'].includes(j.status ?? '') && j.scheduled_date && new Date(j.scheduled_date).getTime() >= now.getTime() - 86_400_000).length
  const recentJobs = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.scheduled_date ?? b.created_at ?? '').getTime() - new Date(a.scheduled_date ?? a.created_at ?? '').getTime()).slice(0, 5),
    [jobs],
  )
  const recentInvoices = useMemo(() => invoices.slice(0, 3), [invoices])

  return (
    <>
      {/* Tab bar */}
      <div className="border-b border-line mb-6 overflow-x-auto scrollbar-hidden">
        <nav className="-mb-px flex gap-1 min-w-max">
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-4 pt-3 md:pt-0 pb-3 text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  color: active ? 'var(--accent)' : 'var(--ink-muted)',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="tab-fade-in">
          {/* Stats row */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-5">
            <OverviewStat label="Total jobs" value={String(jobs.length)} icon={I.briefcase} sub={upcomingJobs > 0 ? `${upcomingJobs} upcoming` : jobs.length > 0 ? 'Nothing upcoming' : 'No jobs yet'} />
            <OverviewStat label="Completed" value={String(completedJobs)} icon={I.check} sub={jobs.length > 0 ? `${Math.round((completedJobs / jobs.length) * 100)}% of all jobs` : 'No jobs yet'} />
            <OverviewStat label="Total revenue" value={fmtMoney(paidTotal)} icon={I.dollar} sub={`${fmtMoney(totalInvoiced)} invoiced across ${invoices.length} ${invoices.length === 1 ? 'invoice' : 'invoices'}`} />
            <OverviewStat label="Outstanding" value={fmtMoney(outstanding)} icon={I.alert} tone={overdueTotal > 0 ? 'danger' : outstanding > 0 ? 'accent' : 'muted'} sub={overdueTotal > 0 ? `${fmtMoney(overdueTotal)} overdue` : outstanding > 0 ? 'within payment terms' : 'All paid up'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: contact + notes */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
                <CardHeader title="Contact details" />
                <div className="px-5 py-4 divide-y divide-line-soft">
                  <Field icon={I.phone} label="Phone" action={client.phone && <a href={`tel:${client.phone}`} className="text-[11.5px] font-semibold text-accent hover:text-accent-hover">Call</a>}>
                    {client.phone ? <span className="tabular-nums">{client.phone}</span> : <span className="text-ink-faint">Not set</span>}
                  </Field>
                  <Field icon={I.mail} label="Email" action={client.email && <a href={`mailto:${client.email}`} className="text-[11.5px] font-semibold text-accent hover:text-accent-hover">Email</a>}>
                    {client.email ? <span className="break-all">{client.email}</span> : <span className="text-ink-faint">Not set</span>}
                  </Field>
                  <Field icon={I.pin} label="Address">
                    {client.address ?? <span className="text-ink-faint">Not set</span>}
                    {sites.length > 0 && <span className="block text-[12px] text-ink-muted mt-1">{sites.length} {sites.length === 1 ? 'site' : 'sites'} on file</span>}
                  </Field>
                  <Field icon={I.calendar} label="Client since">
                    {new Date(client.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                    <span className="text-ink-muted"> · {relativeAgo(client.created_at, now)}</span>
                  </Field>
                </div>
              </div>

              {client.notes && (
                <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
                  <CardHeader title="Notes" />
                  <p className="px-5 py-4 text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </div>

            {/* Right: recent jobs + invoices */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
                <CardHeader
                  title="Recent jobs"
                  aside={jobs.length > 5 && <button onClick={() => setActiveTab('jobs')} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover transition-colors">All {jobs.length} jobs {I.arrow}</button>}
                />
                {recentJobs.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm font-medium text-ink">No jobs yet</p>
                    <p className="text-xs text-ink-muted mt-1">Jobs booked for this client will show up here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-line-soft">
                    {recentJobs.map(job => {
                      const rel = relativeJobLabel(job, now)
                      return (
                        <Link key={job.id} href={`/jobs/${job.id}`} className="group flex items-center gap-3 px-5 py-2.5 hover:bg-surface-hover transition-colors">
                          <span aria-hidden className="w-1.5 h-8 rounded-full shrink-0" style={{ background: statusDot(job.status) }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-ink truncate group-hover:text-accent transition-colors">{job.title ?? job.job_type ?? 'Untitled job'}</p>
                            <p className="text-[11px] text-ink-muted truncate mt-0.5">
                              {job.job_type ?? 'No type'}{job.staff?.name ? ` · ${job.staff.name}` : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[12px] text-ink tabular-nums leading-tight">{fmtDate(job.scheduled_date)}</p>
                            <p className={['text-[10.5px] leading-tight mt-0.5', rel.cls].join(' ')}>{rel.text}</p>
                          </div>
                          <StatusBadge status={job.status} className="shrink-0" />
                          <span className="text-ink-faint group-hover:text-accent transition-colors shrink-0">{I.arrow}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
                <CardHeader
                  title="Recent invoices"
                  aside={invoices.length > 3 && <button onClick={() => setActiveTab('invoices')} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover transition-colors">All {invoices.length} invoices {I.arrow}</button>}
                />
                {recentInvoices.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm font-medium text-ink">No invoices yet</p>
                    <p className="text-xs text-ink-muted mt-1">Invoices raised for this client will show up here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-line-soft">
                    {recentInvoices.map(inv => {
                      const late = inv.status === 'overdue'
                      return (
                        <Link key={inv.id} href={`/invoices/${inv.id}`} className="group flex items-center gap-3 px-5 py-2.5 hover:bg-surface-hover transition-colors">
                          <span className="inline-flex items-center font-mono text-[11px] font-semibold text-ink px-2 py-1 rounded-md bg-surface-muted ring-1 ring-inset ring-line whitespace-nowrap shrink-0">
                            INV-{inv.id.slice(0, 6).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] text-ink-muted truncate">
                              {inv.jobs?.title ?? 'No linked job'}
                              <span className="text-ink-faint"> · {fmtDate(inv.created_at)}</span>
                            </p>
                            {inv.due_date && <p className={['text-[10.5px] mt-0.5', late ? 'text-error font-semibold' : 'text-ink-faint'].join(' ')}>{late ? 'Overdue since' : 'Due'} {fmtDate(inv.due_date)}</p>}
                          </div>
                          <p className={['text-[14px] font-bold tabular-nums shrink-0', late ? 'text-error' : 'text-ink'].join(' ')}>{fmt(inv.total)}</p>
                          <StatusBadge status={inv.status} className="shrink-0" />
                          <span className="text-ink-faint group-hover:text-accent transition-colors shrink-0">{I.arrow}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jobs */}
      {activeTab === 'jobs' && (
        <div className="tab-fade-in">
          <p className="text-xs text-ink-muted mb-4">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </p>
          {jobs.length === 0 ? (
            <EmptyState message="No jobs linked to this client yet" />
          ) : (
            <div className="bg-white rounded-xl border border-line shadow-sm overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-surface-muted border-b border-line">
                    <Th>Job</Th>
                    <Th>Status</Th>
                    <Th>Scheduled</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr
                      key={job.id}
                      className="border-t border-line-soft hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          {job.title ?? job.job_type ?? <span className="text-gray-300">Untitled</span>}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(job.scheduled_date)}</td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(job.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quotes */}
      {activeTab === 'quotes' && (
        <div className="tab-fade-in">
          <p className="text-xs text-ink-muted mb-4">
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
          </p>
          {quotes.length === 0 ? (
            <EmptyState message="No quotes for this client yet" />
          ) : (
            <div className="bg-white rounded-xl border border-line shadow-sm overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-surface-muted border-b border-line">
                    <Th>Quote #</Th>
                    <Th>Status</Th>
                    <Th>Total</Th>
                    <Th>Valid Until</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map(q => (
                    <tr
                      key={q.id}
                      className="border-t border-line-soft hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/quotes/${q.id}`}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          Q-{q.id.slice(0, 6).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="px-5 py-3.5 text-ink">{fmt(q.total)}</td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(q.valid_until)}</td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(q.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <div className="tab-fade-in">
          <p className="text-xs text-ink-muted mb-4">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
          {invoices.length === 0 ? (
            <EmptyState message="No invoices for this client yet" />
          ) : (
            <div className="bg-white rounded-xl border border-line shadow-sm overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-surface-muted border-b border-line">
                    <Th>Invoice #</Th>
                    <Th>Status</Th>
                    <Th>Total</Th>
                    <Th>Due</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr
                      key={inv.id}
                      className="border-t border-line-soft hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          INV-{inv.id.slice(0, 6).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-5 py-3.5 text-ink">{fmt(inv.total)}</td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(inv.due_date)}</td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">{fmtDate(inv.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sites */}
      {activeTab === 'sites' && (
        <div className="tab-fade-in">
          <SitesSection clientId={client.id} sites={sites} />
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="tab-fade-in">
          <NotificationsSection clientId={client.id} initialSettings={notifSettings} />
        </div>
      )}

      {/* Communications */}
      {activeTab === 'communications' && (
        <div className="tab-fade-in">
          <CommunicationsSection notifications={notifications} />
        </div>
      )}
    </>
  )
}
