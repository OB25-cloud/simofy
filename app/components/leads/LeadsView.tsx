'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead } from '@/lib/types'
import AddLeadModal from './AddLeadModal'

export const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  new:       { bg: '#fdf8ee', text: '#B8922A', dot: '#B8922A', label: 'New'       },
  contacted: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Contacted' },
  converted: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Converted' },
  lost:      { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Lost'      },
}

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.new
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

interface Props {
  leads: Lead[]
}

export default function LeadsView({ leads }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = leads.filter(l => {
    const s = search.toLowerCase()
    return (
      (l.name?.toLowerCase().includes(s)   ?? false) ||
      (l.email?.toLowerCase().includes(s)  ?? false) ||
      (l.source?.toLowerCase().includes(s) ?? false) ||
      (l.status?.toLowerCase().includes(s) ?? false)
    )
  })

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'} total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90"
          style={{ background: '#B8922A' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Lead
        </button>
      </div>

      <div className="mb-5 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, email, source or status…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#B8922A]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 py-16 text-center">
          <p className="text-sm text-gray-400">
            {search ? `No leads match "${search}"` : 'No leads yet. Add your first lead above.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Message</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Source</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors group"
                  style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    {lead.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {lead.email ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {lead.phone ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-[220px]">
                    {lead.message ? (
                      <span className="block truncate">{lead.message}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {lead.source ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={lead.status} />
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

      {showModal && <AddLeadModal onClose={() => setShowModal(false)} />}
    </>
  )
}
