'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Job, Client, Staff } from '@/lib/types'
import AddJobModal from './AddJobModal'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Pending' },
  scheduled:   { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Scheduled' },
  in_progress: { bg: '#fdf8ee', text: '#B8922A', dot: '#B8922A', label: 'In Progress' },
  complete:    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Complete' },
  invoiced:    { bg: '#faf5ff', text: '#7c3aed', dot: '#8b5cf6', label: 'Invoiced' },
  cancelled:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Cancelled' },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  const config = STATUS_CONFIG[status] ?? { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: status }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: config.bg, color: config.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  )
}

interface Props {
  jobs: Job[]
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  staff: Pick<Staff, 'id' | 'name'>[]
}

export default function JobsView({ jobs, clients, staff }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase()
    return (
      (j.title?.toLowerCase().includes(q) ?? false) ||
      (j.clients?.name.toLowerCase().includes(q) ?? false) ||
      (j.job_type?.toLowerCase().includes(q) ?? false) ||
      (j.location?.toLowerCase().includes(q) ?? false) ||
      (j.staff?.name.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Jobs</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90"
          style={{ background: '#B8922A' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Job
        </button>
      </div>

      <div className="mb-5 relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search by title, client, type or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#B8922A]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 py-16 text-center">
          <p className="text-sm text-gray-400">
            {search ? `No jobs match "${search}"` : 'No jobs yet. Add your first job above.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Title</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Staff</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Scheduled</th>
                <th className="px-5 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((job, i) => (
                <tr
                  key={job.id}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors group"
                  style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    {job.title ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {job.clients?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {job.job_type ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {job.staff?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {job.scheduled_date
                      ? new Date(job.scheduled_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-gray-300 group-hover:text-[#B8922A] transition-colors text-base">→</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddJobModal clients={clients} staff={staff} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
