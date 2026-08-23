'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Staff } from '@/lib/types'
import AddStaffModal from './AddStaffModal'
import { StatusBadge } from '@/app/components/ui/Badge'
import { StatCard } from '@/app/components/ui/StatCard'
import Button from '@/app/components/ui/Button'
import { inputClass } from '@/app/components/ui/input'

const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: 'rgba(201, 168, 76,0.12)', text: '#C9A84C', label: 'Admin' },
  field: { bg: '#DBEAFE', text: '#3B82F6', label: 'Field' },
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span className="text-gray-300 text-xs">—</span>
  const config = ROLE_CONFIG[role] ?? { bg: '#F4F5F7', text: '#6B7280', label: role }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: config.bg, color: config.text }}>
      {config.label}
    </span>
  )
}

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

export default function StaffView({ staff }: { staff: Staff[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)

  const stats = [
    { label: 'Total Staff', value: String(staff.length),                                       accent: true  },
    { label: 'Active',      value: String(staff.filter(s => s.is_active).length),              accent: true  },
    { label: 'Admin',       value: String(staff.filter(s => s.role === 'admin').length),       accent: false },
    { label: 'Field',       value: String(staff.filter(s => s.role === 'field').length),       accent: false },
  ]

  const filtered = staff.filter(s => {
    const q = search.toLowerCase()
    const matchSearch =
      s.name.toLowerCase().includes(q) ||
      (s.email?.toLowerCase().includes(q) ?? false) ||
      (s.phone?.includes(q)               ?? false) ||
      (s.role?.toLowerCase().includes(q)  ?? false)
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && s.is_active) ||
      (statusFilter === 'inactive' && !s.is_active) ||
      (statusFilter === 'admin' && s.role === 'admin') ||
      (statusFilter === 'field' && s.role === 'field')
    return matchSearch && matchStatus
  })

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Staff</h1>
          <p className="mt-1 text-xs text-[#6B7280]">{staff.length} {staff.length === 1 ? 'team member' : 'team members'} total</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">
          <PlusIcon />
          Add Staff
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
            placeholder="Search by name, email, phone or role…"
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
          <option value="all">All Staff</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="admin">Admin Role</option>
          <option value="field">Field Role</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] py-16 text-center">
          <p className="text-sm text-[#6B7280]">
            {search || statusFilter !== 'all' ? 'No staff match the current filters.' : 'No staff yet. Add your first team member above.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Pay Rate</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Added</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Status</th>
                <th className="px-4 py-3 w-8 bg-[#F4F5F7]" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(member => (
                <tr
                  key={member.id}
                  onClick={() => router.push(`/staff/${member.id}`)}
                  className="cursor-pointer border-b border-[#F4F5F7] hover:bg-[#F9FAFB] transition-colors group"
                >
                  <td className="px-4 py-3 text-sm font-medium text-[#1A1A2E]">{member.name}</td>
                  <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                  <td className="px-4 py-3 text-sm text-[#6B7280]">
                    {member.phone ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#6B7280]">
                    {member.email ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#6B7280] tabular-nums">
                    {member.pay_rate != null
                      ? <span>${member.pay_rate.toFixed(2)}<span className="text-[#6B7280] text-xs">/hr</span></span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs">
                    {new Date(member.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={member.is_active ? 'active' : 'inactive'} />
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

      {showModal && <AddStaffModal onClose={() => setShowModal(false)} />}
    </>
  )
}
