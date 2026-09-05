'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Staff, Job } from '@/lib/types'
import { StatusBadge, statusDot } from '@/app/components/ui/Badge'
import { RoleChip, relativeAgo } from './StaffView'

const TABS = ['Overview', 'Jobs', 'Performance'] as const
type Tab = typeof TABS[number]

const JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  complete: 'Complete',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
}
const STATUS_ORDER = ['scheduled', 'in_progress', 'pending', 'complete', 'invoiced', 'cancelled']

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString('en-NZ')}`
}

function fmtHours(h: number): string {
  if (h === 0) return '0h'
  const whole = Math.floor(h)
  const mins = Math.round((h - whole) * 60)
  return mins ? `${whole}h ${mins}m` : `${whole}h`
}

function jobHours(job: Job): number {
  if (!job.start_time || !job.end_time) return 0
  const [sh, sm] = job.start_time.split(':').map(Number)
  const [eh, em] = job.end_time.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  return mins > 0 ? mins / 60 : 0
}

function isDone(status: string | null): boolean {
  return status === 'complete' || status === 'invoiced'
}

function daysFromToday(s: string | null | undefined, now: Date): number | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  const a = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((a - b) / 86_400_000)
}

function relativeLabel(job: Job, now: Date): { text: string; cls: string } {
  const diff = daysFromToday(job.scheduled_date, now)
  if (diff == null) return { text: 'Unscheduled', cls: 'text-ink-faint' }
  const done = isDone(job.status) || job.status === 'cancelled'
  if (diff === 0) return { text: 'Today', cls: done ? 'text-ink-faint' : 'text-accent font-semibold' }
  if (diff === 1) return { text: 'Tomorrow', cls: 'text-ink-muted' }
  if (diff > 1) return { text: diff < 14 ? `in ${diff} days` : diff < 60 ? `in ${Math.round(diff / 7)} wks` : `in ${Math.round(diff / 30)} mo`, cls: 'text-ink-muted' }
  const ago = -diff
  if (!done) return { text: `overdue ${ago}d`, cls: 'text-error font-semibold' }
  return { text: ago < 14 ? `${ago}d ago` : ago < 60 ? `${Math.round(ago / 7)}w ago` : `${Math.round(ago / 30)}mo ago`, cls: 'text-ink-faint' }
}

// ── icons ─────────────────────────────────────────────────────────────────────

const I = {
  briefcase: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  dollar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  phone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  mail: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  tag: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  star: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
}

// ── small pieces ──────────────────────────────────────────────────────────────

function Stat({ label, value, sub, icon, tone = 'accent' }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone?: 'accent' | 'muted' }) {
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

function CardHeader({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line-soft">
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      {aside}
    </div>
  )
}

function JobRowLink({ job, now, quote }: { job: Job; now: Date; quote?: number }) {
  const rel = relativeLabel(job, now)
  return (
    <Link href={`/jobs/${job.id}`} className="group flex items-center gap-3 px-5 py-2.5 hover:bg-surface-hover transition-colors">
      <span aria-hidden className="w-1.5 h-8 rounded-full shrink-0" style={{ background: statusDot(job.status) }} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink truncate group-hover:text-accent transition-colors">{job.title ?? job.job_type ?? 'Untitled job'}</p>
        <p className="text-[11px] text-ink-muted truncate mt-0.5">
          {job.clients?.name ?? 'No client'}{job.job_type && job.title ? ` · ${job.job_type}` : ''}{quote ? ` · ${fmtMoney(quote)}` : ''}
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
}

// ── main ──────────────────────────────────────────────────────────────────────

interface Props {
  staff: Staff
  jobs: Job[]
  quoteTotals?: Record<string, number>
}

export default function StaffDetailTabs({ staff, jobs, quoteTotals = {} }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const now = useMemo(() => new Date(), [])

  const perf = useMemo(() => {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const inMonth = (s: string | null | undefined) => !!s && new Date(s).getTime() >= monthStart
    const active = jobs.filter(j => j.status !== 'cancelled')
    const completed = jobs.filter(j => isDone(j.status))
    const completedThisMonth = completed.filter(j => inMonth(j.completed_date ?? j.scheduled_date))
    const upcoming = active.filter(j => !isDone(j.status) && (daysFromToday(j.scheduled_date, now) ?? -1) >= 0)
    const overdue = active.filter(j => !isDone(j.status) && (daysFromToday(j.scheduled_date, now) ?? 0) < 0)
    const valued = jobs.filter(j => quoteTotals[j.id])
    const totalValue = valued.reduce((s, j) => s + quoteTotals[j.id], 0)
    const avgValue = valued.length > 0 ? totalValue / valued.length : null
    const completedValue = completed.reduce((s, j) => s + (quoteTotals[j.id] ?? 0), 0)
    // "Logged" = work actually underway or done, from scheduled start/end times.
    const hoursThisMonth = jobs
      .filter(j => (isDone(j.status) || j.status === 'in_progress') && inMonth(j.scheduled_date))
      .reduce((s, j) => s + jobHours(j), 0)
    const hoursAllTime = completed.reduce((s, j) => s + jobHours(j), 0)
    // Completion rate: of everything that was due by today, how much got done.
    const due = active.filter(j => (daysFromToday(j.scheduled_date, now) ?? 1) <= 0)
    const completionRate = due.length > 0 ? Math.round((completed.filter(j => (daysFromToday(j.scheduled_date, now) ?? 1) <= 0).length / due.length) * 100) : null
    // Avg jobs per week over the span this person has had work on the books.
    const dated = active.map(j => j.scheduled_date).filter((d): d is string => !!d).map(d => new Date(d).getTime())
    const first = dated.length > 0 ? Math.min(...dated) : null
    const last = dated.length > 0 ? Math.min(Math.max(...dated), now.getTime()) : null
    const weeks = first != null && last != null ? Math.max(1, (last - first) / (7 * 86_400_000)) : null
    const pastJobs = active.filter(j => (daysFromToday(j.scheduled_date, now) ?? 1) <= 0).length
    const jobsPerWeek = weeks != null ? pastJobs / weeks : null
    const typeCounts: Record<string, number> = {}
    for (const j of completed) if (j.job_type) typeCounts[j.job_type] = (typeCounts[j.job_type] ?? 0) + 1
    const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const byStatus = STATUS_ORDER.map(s => ({ status: s, count: jobs.filter(j => j.status === s).length })).filter(x => x.count > 0)
    const recent = [...jobs].sort((a, b) => new Date(b.scheduled_date ?? b.created_at ?? '').getTime() - new Date(a.scheduled_date ?? a.created_at ?? '').getTime()).slice(0, 5)
    const clients = new Set(jobs.map(j => j.client_id).filter(Boolean)).size
    return {
      active, completed, completedThisMonth, upcoming, overdue, valued, totalValue, avgValue, completedValue,
      hoursThisMonth, hoursAllTime, completionRate, jobsPerWeek, topTypes, byStatus, recent, clients, due,
    }
  }, [jobs, quoteTotals, now])

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.scheduled_date ?? '').getTime() - new Date(a.scheduled_date ?? '').getTime()),
    [jobs],
  )

  const monthLabel = now.toLocaleDateString('en-NZ', { month: 'long' })

  return (
    <div>
      {/* ── Stat strip ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Stat label="Jobs assigned" value={String(perf.active.length)} icon={I.briefcase} sub={perf.upcoming.length > 0 ? `${perf.upcoming.length} upcoming${perf.overdue.length > 0 ? ` · ${perf.overdue.length} overdue` : ''}` : perf.overdue.length > 0 ? `${perf.overdue.length} overdue` : 'Nothing upcoming'} />
        <Stat label="Jobs completed" value={String(perf.completed.length)} icon={I.check} sub={`${perf.completedThisMonth.length} in ${monthLabel}${perf.completedValue > 0 ? ` · ${fmtMoney(perf.completedValue)} delivered` : ''}`} />
        <Stat label="Avg job value" value={perf.avgValue != null ? fmtMoney(perf.avgValue) : '—'} icon={I.dollar} sub={perf.avgValue != null ? `from ${perf.valued.length} quoted ${perf.valued.length === 1 ? 'job' : 'jobs'}` : 'No quotes on their jobs'} tone={perf.avgValue != null ? 'accent' : 'muted'} />
        <Stat label={`Hours · ${monthLabel}`} value={fmtHours(perf.hoursThisMonth)} icon={I.clock} sub={perf.hoursAllTime > 0 ? `${fmtHours(perf.hoursAllTime)} across all completed jobs` : 'From scheduled start and end times'} />
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-line mb-5 overflow-x-auto scrollbar-hidden">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={['px-4 py-2.5 text-sm font-medium transition-colors relative shrink-0 whitespace-nowrap', activeTab === tab ? 'text-ink' : 'text-ink-muted hover:text-ink'].join(' ')}
          >
            {tab}
            {tab === 'Jobs' && <span className="ml-1.5 text-[10.5px] font-semibold text-ink-faint tabular-nums">{jobs.length}</span>}
            {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-accent" />}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
              <CardHeader title="Contact details" />
              <div className="px-5 py-4 divide-y divide-line-soft">
                <Field icon={I.phone} label="Phone" action={staff.phone && <a href={`tel:${staff.phone}`} className="text-[11.5px] font-semibold text-accent hover:text-accent-hover">Call</a>}>
                  {staff.phone ? <span className="tabular-nums">{staff.phone}</span> : <span className="text-ink-faint">Not set</span>}
                </Field>
                <Field icon={I.mail} label="Email" action={staff.email && <a href={`mailto:${staff.email}`} className="text-[11.5px] font-semibold text-accent hover:text-accent-hover">Email</a>}>
                  {staff.email ? <span className="break-all">{staff.email}</span> : <span className="text-ink-faint">Not set</span>}
                </Field>
                <Field icon={I.calendar} label="Member since">
                  {new Date(staff.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                  <span className="text-ink-muted"> · {relativeAgo(staff.created_at, now)}</span>
                </Field>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
              <CardHeader title="Employment" aside={<RoleChip role={staff.role} size="md" />} />
              <div className="px-5 py-4 divide-y divide-line-soft">
                <Field icon={I.dollar} label="Pay rate">
                  {staff.pay_rate != null
                    ? <><span className="font-mono text-[15px] font-semibold">${Number(staff.pay_rate).toFixed(2)}</span><span className="text-ink-muted"> per hour</span></>
                    : <span className="text-ink-faint">Not set</span>}
                </Field>
                <Field icon={I.briefcase} label="Status">
                  <span className="inline-flex items-center gap-2">
                    <StatusBadge status={staff.is_active ? 'active' : 'inactive'} label={staff.is_active ? 'Active' : 'Inactive'} className={staff.is_active ? '' : '!bg-red-50 !text-red-800 !ring-red-600/20'} />
                    <span className="text-[12px] text-ink-muted">{staff.is_active ? 'Available for scheduling' : 'Hidden from the scheduler'}</span>
                  </span>
                </Field>
                <Field icon={I.tag} label="Work profile">
                  {perf.topTypes.length > 0
                    ? <span className="flex flex-wrap gap-1.5 mt-0.5">{perf.topTypes.slice(0, 3).map(([type, n]) => <span key={type} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-muted text-ink-muted ring-1 ring-inset ring-line">{type} <span className="text-ink-faint">{n}</span></span>)}</span>
                    : <span className="text-ink-faint">No completed jobs yet</span>}
                  {perf.clients > 0 && <span className="block text-[12px] text-ink-muted mt-1.5">{perf.clients} {perf.clients === 1 ? 'client' : 'clients'} worked with</span>}
                </Field>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-surface rounded-xl border border-line shadow-card overflow-hidden self-start">
            <CardHeader
              title="Recent jobs"
              aside={jobs.length > 5 && <button onClick={() => setActiveTab('Jobs')} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover transition-colors">All {jobs.length} jobs {I.arrow}</button>}
            />
            {perf.recent.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-ink">No jobs yet</p>
                <p className="text-xs text-ink-muted mt-1">Assign a job from the schedule and it will show up here.</p>
              </div>
            ) : (
              <div className="divide-y divide-line-soft">
                {perf.recent.map(job => <JobRowLink key={job.id} job={job} now={now} quote={quoteTotals[job.id]} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Jobs ── */}
      {activeTab === 'Jobs' && (
        sortedJobs.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface shadow-card py-16 text-center">
            <p className="text-sm font-semibold text-ink">No jobs assigned</p>
            <p className="text-xs text-ink-muted mt-1">Drag a job onto this person&apos;s row in the schedule to assign it.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr>
                    {[
                      { label: 'Job', cls: 'pl-5 pr-4' },
                      { label: 'Status', cls: 'px-4' },
                      { label: 'Value', cls: 'px-4 text-right' },
                      { label: 'Hours', cls: 'px-4 text-right' },
                      { label: 'Scheduled', cls: 'px-4' },
                      { label: '', cls: 'w-10 px-4' },
                    ].map(col => (
                      <th key={col.label || 'action'} className={['text-left py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted bg-surface-muted border-b border-line', col.cls].join(' ')}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.map(job => {
                    const rel = relativeLabel(job, now)
                    const hrs = jobHours(job)
                    return (
                      <tr key={job.id} className="group border-b border-line-soft last:border-b-0 hover:bg-surface-hover transition-colors">
                        <td className="pl-5 pr-4 py-3.5 align-middle">
                          <Link href={`/jobs/${job.id}`} className="flex items-start gap-3 min-w-0">
                            <span aria-hidden className="mt-1 w-1.5 h-9 rounded-full shrink-0" style={{ background: statusDot(job.status) }} />
                            <span className="min-w-0">
                              <span className="block text-[14px] font-semibold text-ink leading-snug truncate group-hover:text-accent transition-colors">{job.title ?? job.job_type ?? 'Untitled job'}</span>
                              <span className="mt-0.5 flex items-center gap-2 min-w-0">
                                <span className="text-[12px] text-ink-muted truncate">{job.clients?.name ?? 'No client'}</span>
                                {job.job_type && <span className="text-[10.5px] font-semibold px-1.5 py-px rounded bg-surface-muted text-ink-muted ring-1 ring-inset ring-line whitespace-nowrap">{job.job_type}</span>}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 align-middle"><StatusBadge status={job.status} /></td>
                        <td className="px-4 py-3.5 align-middle text-right font-mono text-[12.5px] text-ink-muted tabular-nums">{quoteTotals[job.id] ? fmtMoney(quoteTotals[job.id]) : <span className="text-ink-faint">—</span>}</td>
                        <td className="px-4 py-3.5 align-middle text-right text-[12.5px] text-ink-muted tabular-nums">{hrs > 0 ? fmtHours(hrs) : <span className="text-ink-faint">—</span>}</td>
                        <td className="px-4 py-3.5 align-middle">
                          <p className="text-[13px] text-ink tabular-nums leading-tight whitespace-nowrap">{fmtDate(job.scheduled_date)}</p>
                          <p className={['text-[11px] leading-tight mt-0.5 whitespace-nowrap', rel.cls].join(' ')}>{rel.text}</p>
                        </td>
                        <td className="pl-2 pr-4 py-3.5 align-middle text-right">
                          <Link href={`/jobs/${job.id}`} className="inline-flex text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition-[color,transform]">{I.arrow}</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Performance ── */}
      {activeTab === 'Performance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
            <Stat label="Completion rate" value={perf.completionRate != null ? `${perf.completionRate}%` : '—'} icon={I.check} sub={perf.due.length > 0 ? `${perf.completed.filter(j => (daysFromToday(j.scheduled_date, now) ?? 1) <= 0).length} of ${perf.due.length} jobs due so far` : 'No jobs due yet'} />
            <Stat label="Avg jobs / week" value={perf.jobsPerWeek != null ? perf.jobsPerWeek.toFixed(1) : '—'} icon={I.calendar} sub={perf.jobsPerWeek != null ? 'over their time on the books' : 'No scheduled jobs yet'} />
            <Stat label={`Completed · ${monthLabel}`} value={String(perf.completedThisMonth.length)} icon={I.star} sub={`${perf.completed.length} completed all time`} />
            <Stat label="Value delivered" value={perf.completedValue > 0 ? fmtMoney(perf.completedValue) : '—'} icon={I.dollar} sub={perf.completedValue > 0 ? 'quoted value of completed jobs' : 'No quotes on completed jobs'} tone={perf.completedValue > 0 ? 'accent' : 'muted'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
              <CardHeader title="Jobs by status" aside={<span className="text-xs text-ink-faint tabular-nums">{jobs.length} total</span>} />
              {perf.byStatus.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-ink-faint">No jobs yet</p>
              ) : (
                <div className="px-5 py-4 space-y-3">
                  {perf.byStatus.map(({ status, count }) => {
                    const pct = Math.round((count / jobs.length) * 100)
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusDot(status) }} />
                            {JOB_STATUS_LABELS[status] ?? status}
                          </span>
                          <span className="text-[12px] text-ink-muted tabular-nums">{count} <span className="text-ink-faint">· {pct}%</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: statusDot(status) }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
              <CardHeader title="Top job types" aside={<span className="text-xs text-ink-faint">completed work</span>} />
              {perf.topTypes.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-ink-faint">No completed jobs yet</p>
              ) : (
                <div className="px-5 py-4 space-y-3">
                  {perf.topTypes.map(([type, n], i) => {
                    const pct = Math.round((n / perf.completed.length) * 100)
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-medium text-ink"><span className="text-ink-faint tabular-nums mr-1.5">{i + 1}.</span>{type}</span>
                          <span className="text-[12px] text-ink-muted tabular-nums">{n} <span className="text-ink-faint">· {pct}%</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%`, opacity: 1 - i * 0.15 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
