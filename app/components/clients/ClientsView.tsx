'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@/lib/types'
import AddClientModal from './AddClientModal'
import { StatusBadge } from '@/app/components/ui/Badge'
import { StatCard } from '@/app/components/ui/StatCard'
import Button from '@/app/components/ui/Button'
import { inputClass } from '@/app/components/ui/input'

function SearchIcon() {
  return (
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function ClientsView({ clients, openModal }: { clients: Client[]; openModal?: boolean }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(openModal ?? false)

  const _now = new Date()
  const startOfMonth = new Date(Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), 1))

  const stats = [
    { label: 'Total Clients',    value: String(clients.length),                                                          accent: true  },
    { label: 'Active',           value: String(clients.filter(c => c.is_active).length),                                 accent: true  },
    { label: 'Inactive',         value: String(clients.filter(c => !c.is_active).length),                                accent: false },
    { label: 'New This Month',   value: String(clients.filter(c => new Date(c.created_at) >= startOfMonth).length),      accent: false },
  ]

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      (c.business_name?.toLowerCase().includes(q) ?? false) ||
      (c.email?.toLowerCase().includes(q)         ?? false) ||
      (c.phone?.includes(q)                       ?? false) ||
      (c.address?.toLowerCase().includes(q)       ?? false)
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.is_active) ||
      (statusFilter === 'inactive' && !c.is_active)
    return matchSearch && matchStatus
  })

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Clients</h1>
          <p className="mt-1 text-xs text-[#6B7280]">{clients.length} {clients.length === 1 ? 'client' : 'clients'} total</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">
          <PlusIcon />
          Add Client
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by name, business, email, phone or address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`pl-9 pr-4 py-2.5 ${inputClass}`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={inputClass}
          style={{ minWidth: 150 }}
        >
          <option value="all">All Clients</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] py-16 text-center">
          <p className="text-sm text-[#6B7280]">
            {search || statusFilter !== 'all' ? 'No clients match the current filters.' : 'No clients yet. Add your first client above.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Business</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Address</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Added</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Status</th>
                <th className="px-4 py-3 w-8 bg-[#F4F5F7]" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="cursor-pointer border-b border-[#F4F5F7] hover:bg-[#F9FAFB] transition-colors group"
                >
                  <td className="px-4 py-3 text-sm font-medium text-[#1A1A2E]">{client.name}</td>
                  <td className="px-4 py-3 text-sm text-[#6B7280]">
                    {client.business_name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#6B7280]">
                    {client.email ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#6B7280]">
                    {client.phone ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#6B7280] max-w-[160px]">
                    {client.address
                      ? <span className="block truncate">{client.address}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs">
                    {new Date(client.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={client.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-gray-300 group-hover:text-[#C9A84C] transition-colors text-base">→</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <AddClientModal onClose={() => setShowModal(false)} />}
    </>
  )
}
