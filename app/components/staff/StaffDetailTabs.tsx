'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Staff, Job } from '@/lib/types'
import { StatusBadge } from '@/app/components/ui/Badge'

const TABS = ['Overview', 'Jobs', 'Performance'] as const
type Tab = typeof TABS[number]

const GOLD = '#C9A84C'

const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: 'rgba(201, 168, 76,0.12)', text: '#C9A84C', label: 'Admin' },
  field: { bg: '#DBEAFE', text: '#3B82F6', label: 'Field' },
}

// Used only for the "All Jobs by Status" breakdown chart's progress-bar dot colours.
const JOB_STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  pending:     { dot: '#9CA3AF', label: 'Pending' },
  scheduled:   { dot: '#3B82F6', label: 'Scheduled' },
  in_progress: { dot: '#F59E0B', label: 'In Progress' },
  complete:    { dot: '#22C55E', label: 'Complete' },
  invoiced:    { dot: '#22C55E', label: 'Invoiced' },
  cancelled:   { dot: '#EF4444', label: 'Cancelled' },
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
      <div className="flex border-b border-[#E5E7EB] mb-6 overflow-x-auto scrollbar-hidden">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-3 md:py-2.5 text-sm font-medium transition-colors relative shrink-0 whitespace-nowrap"
            style={{ color: activeTab === tab ? '#1A1A2E' : '#6B7280' }}
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
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">Contact Details</h2>
            <dl className="space-y-3.5">
              <div>
                <dt className="text-xs text-[#6B7280] mb-0.5">Email</dt>
                <dd className="text-sm text-[#1A1A2E]">
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
                <dt className="text-xs text-[#6B7280] mb-0.5">Phone</dt>
                <dd className="text-sm text-[#1A1A2E]">
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
                <dt className="text-xs text-[#6B7280] mb-0.5">Member Since</dt>
                <dd className="text-sm text-[#1A1A2E]">
                  {new Date(staff.created_at).toLocaleDateString('en-NZ', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Employment */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">Employment</h2>
            <dl className="space-y-3.5">
              <div>
                <dt className="text-xs text-[#6B7280] mb-0.5">Role</dt>
                <dd className="mt-1">
                  {roleConfig ? (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: roleConfig.bg, color: roleConfig.text }}
                    >
                      {roleConfig.label}
                    </span>
                  ) : (
                    <span className="text-sm text-[#1A1A2E]">{staff.role ?? <span className="text-gray-300">—</span>}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B7280] mb-0.5">Pay Rate</dt>
                <dd className="text-sm text-[#1A1A2E]">
                  {staff.pay_rate != null
                    ? `$${Number(staff.pay_rate).toFixed(2)}/hr`
                    : <span className="text-gray-300">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#6B7280] mb-0.5">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={staff.is_active ? 'active' : 'inactive'} />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Jobs */}
      {activeTab === 'Jobs' && (
        <div>
          <p className="text-xs text-[#6B7280] mb-4">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} assigned
          </p>
          {jobs.length === 0 ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] py-10 text-center">
              <p className="text-sm text-[#6B7280]">No jobs assigned to this staff member</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-[#F4F5F7] border-b border-[#E5E7EB]">
                    <th className="text-left px-5 py-3 font-medium text-[#6B7280] text-xs uppercase tracking-wider">Title</th>
                    <th className="text-left px-5 py-3 font-medium text-[#6B7280] text-xs uppercase tracking-wider">Client</th>
                    <th className="text-left px-5 py-3 font-medium text-[#6B7280] text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-[#6B7280] text-xs uppercase tracking-wider">Scheduled</th>
                    <th className="px-5 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr
                      key={job.id}
                      className="border-t border-[#F4F5F7] hover:bg-[#F9FAFB] transition-colors group"
                    >
                      <td className="px-5 py-3.5 font-medium text-[#1A1A2E]">
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
                      <td className="px-5 py-3.5 text-[#6B7280] text-xs">
                        {fmtDate(job.scheduled_date) ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/jobs/${job.id}`}>
                          <span className="text-gray-300 group-hover:text-[#C9A84C] transition-colors text-base">→</span>
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
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 text-center">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                Completed This Month
              </p>
              <p className="text-4xl font-bold text-[#1A1A2E]">{perf.completedThisMonth}</p>
              <p className="text-xs text-[#6B7280] mt-1">
                {new Date().toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 text-center">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                Completed All Time
              </p>
              <p className="text-4xl font-bold text-[#1A1A2E]">{perf.completedAllTime}</p>
              <p className="text-xs text-[#6B7280] mt-1">total jobs</p>
            </div>

            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 text-center">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
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
                  <p className="text-xs text-[#6B7280] mt-1">of completed jobs</p>
                </>
              ) : (
                <p className="text-sm text-gray-300 mt-3">No data yet</p>
              )}
            </div>
          </div>

          {/* Breakdown by status */}
          {jobs.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">All Jobs by Status</p>
              <div className="space-y-2.5">
                {Object.entries(JOB_STATUS_CONFIG).map(([statusKey, cfg]) => {
                  const count = jobs.filter(j => j.status === statusKey).length
                  if (count === 0) return null
                  const pct = Math.round((count / jobs.length) * 100)
                  return (
                    <div key={statusKey}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#6B7280]">{cfg.label}</span>
                        <span className="text-xs text-[#6B7280] tabular-nums">{count}</span>
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
