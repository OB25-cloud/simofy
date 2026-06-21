'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Staff, Job } from '@/lib/types'

const TABS = ['Overview', 'Jobs', 'Performance'] as const
type Tab = typeof TABS[number]

const GOLD = '#B8922A'

const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: '#fdf8ee', text: '#B8922A', label: 'Admin' },
  field: { bg: '#eff6ff', text: '#1d4ed8', label: 'Field' },
}

const JOB_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Pending' },
  scheduled:   { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Scheduled' },
  in_progress: { bg: '#fdf8ee', text: '#B8922A', dot: '#B8922A', label: 'In Progress' },
  complete:    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Complete' },
  invoiced:    { bg: '#faf5ff', text: '#7c3aed', dot: '#8b5cf6', label: 'Invoiced' },
  cancelled:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Cancelled' },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  const cfg = JOB_STATUS_CONFIG[status] ?? { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: status }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

function fmtDate(s: string | null | undefined) {
  if (!s) return null
  return new Date(s).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  staff: Staff
  jobs: Job[]
}

export default function StaffDetailTabs({ staff, jobs }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const roleConfig = staff.role ? (ROLE_CONFIG[staff.role] ?? null) : null

  const perf = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const completed = jobs.filter(j => j.status === 'complete')

    const completedThisMonth = completed.filter(j => {
      const ref = j.completed_date ?? j.scheduled_date
      if (!ref) return false
      const d = new Date(ref)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })

    // Tally job types across all completed jobs
    const typeCounts: Record<string, number> = {}
    for (const j of completed) {
      if (j.job_type) typeCounts[j.job_type] = (typeCounts[j.job_type] ?? 0) + 1
    }
    const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return {
      completedAllTime: completed.length,
      completedThisMonth: completedThisMonth.length,
      mostCommonType,
    }
  }, [jobs])

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hidden">
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
        <div className="grid grid-cols-2 gap-5">
          {/* Contact Details */}
          <div className="rounded-lg border border-gray-100 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Contact Details</h2>
            <dl className="space-y-3.5">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Email</dt>
                <dd className="text-sm text-gray-900">
                  {staff.email ? (
                    <a href={`mailto:${staff.email}`} className="hover:underline" style={{ color: GOLD }}>
                      {staff.email}
                    </a>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Phone</dt>
                <dd className="text-sm text-gray-900">
                  {staff.phone ? (
                    <a href={`tel:${staff.phone}`} className="hover:underline" style={{ color: GOLD }}>
                      {staff.phone}
                    </a>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Member Since</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(staff.created_at).toLocaleDateString('en-NZ', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Employment */}
          <div className="rounded-lg border border-gray-100 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Employment</h2>
            <dl className="space-y-3.5">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Role</dt>
                <dd className="mt-1">
                  {roleConfig ? (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: roleConfig.bg, color: roleConfig.text }}
                    >
                      {roleConfig.label}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-900">{staff.role ?? <span className="text-gray-300">—</span>}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Pay Rate</dt>
                <dd className="text-sm text-gray-900">
                  {staff.pay_rate != null
                    ? `$${Number(staff.pay_rate).toFixed(2)}/hr`
                    : <span className="text-gray-300">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Status</dt>
                <dd className="mt-1">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={
                      staff.is_active
                        ? { background: '#fdf8ee', color: GOLD }
                        : { background: '#f3f4f6', color: '#9ca3af' }
                    }
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: staff.is_active ? GOLD : '#d1d5db' }}
                    />
                    {staff.is_active ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Jobs */}
      {activeTab === 'Jobs' && (
        <div>
          <p className="text-xs text-gray-400 mb-4">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} assigned
          </p>
          {jobs.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 py-10 text-center">
              <p className="text-sm text-gray-400">No jobs assigned to this staff member</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-100 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Title</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Client</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Scheduled</th>
                    <th className="px-5 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, i) => (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50 transition-colors group"
                      style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                    >
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        <Link href={`/jobs/${job.id}`} className="hover:underline" style={{ color: 'inherit' }}>
                          {job.title ?? job.job_type ?? <span className="text-gray-300">—</span>}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {job.clients?.name ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {fmtDate(job.scheduled_date) ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/jobs/${job.id}`}>
                          <span className="text-gray-300 group-hover:text-[#B8922A] transition-colors text-base">→</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Performance */}
      {activeTab === 'Performance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-100 p-5 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Completed This Month
              </p>
              <p className="text-4xl font-bold text-gray-900">{perf.completedThisMonth}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date().toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 p-5 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Completed All Time
              </p>
              <p className="text-4xl font-bold text-gray-900">{perf.completedAllTime}</p>
              <p className="text-xs text-gray-400 mt-1">total jobs</p>
            </div>

            <div className="rounded-lg border border-gray-100 p-5 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Most Common Type
              </p>
              {perf.mostCommonType ? (
                <>
                  <p
                    className="text-lg font-bold capitalize leading-tight"
                    style={{ color: GOLD }}
                  >
                    {perf.mostCommonType.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">of completed jobs</p>
                </>
              ) : (
                <p className="text-sm text-gray-300 mt-3">No data yet</p>
              )}
            </div>
          </div>

          {/* Breakdown by status */}
          {jobs.length > 0 && (
            <div className="rounded-lg border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">All Jobs by Status</p>
              <div className="space-y-2.5">
                {Object.entries(JOB_STATUS_CONFIG).map(([statusKey, cfg]) => {
                  const count = jobs.filter(j => j.status === statusKey).length
                  if (count === 0) return null
                  const pct = Math.round((count / jobs.length) * 100)
                  return (
                    <div key={statusKey}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{cfg.label}</span>
                        <span className="text-xs text-gray-400 tabular-nums">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: cfg.dot }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
