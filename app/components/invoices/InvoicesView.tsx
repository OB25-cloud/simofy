'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Invoice, Client, Job, Quote } from '@/lib/types'
import AddInvoiceModal from './AddInvoiceModal'
import { StatusBadge } from '@/app/components/ui/Badge'
import { StatCard } from '@/app/components/ui/StatCard'
import Button from '@/app/components/ui/Button'
import { inputClass } from '@/app/components/ui/input'

function fmt(n: number | null | undefined) {
  return n != null ? `$${n.toFixed(2)}` : '—'
}

function fmtShort(n: number) {
  if (n >= 100_000) return `$${(n / 1000).toFixed(0)}k`
  if (n >= 10_000)  return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function invoiceNumber(id: string) {
  return `INV-${id.slice(0, 6).toUpperCase()}`
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

interface Props {
  invoices: Invoice[]
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  jobs: Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
  quotes: Pick<Quote, 'id' | 'client_id' | 'total'>[]
}

export default function InvoicesView({ invoices, clients, jobs, quotes }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)

  const _now = new Date()
  const startOfMonth = new Date(Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), 1))

  const outstanding = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0)

  const paidThisMonth = invoices
    .filter(inv => inv.status === 'paid' && new Date(inv.created_at) >= startOfMonth)
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0)

  const stats = [
    { label: 'Total Invoices',   value: String(invoices.length),                                                         accent: true  },
    { label: 'Outstanding',      value: fmtShort(outstanding),                                                           accent: true  },
    { label: 'Overdue',          value: String(invoices.filter(i => i.status === 'overdue').length),                     danger: true  },
    { label: 'Paid This Month',  value: fmtShort(paidThisMonth),                                                         accent: false },
  ]

  const filtered = invoices.filter(inv => {
    const s = search.toLowerCase()
    const matchSearch =
      invoiceNumber(inv.id).toLowerCase().includes(s) ||
      (inv.clients?.name.toLowerCase().includes(s) ?? false) ||
      (inv.status?.includes(s) ?? false) ||
      (inv.jobs?.title?.toLowerCase().includes(s) ?? false)
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Invoices</h1>
          <p className="mt-1 text-xs text-[#6B7280]">{invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} total</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">
          <PlusIcon />
          Add Invoice
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} danger={s.danger} />
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by invoice ID, client, job or status…"
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
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] py-16 text-center">
          <p className="text-sm text-[#6B7280]">
            {search || statusFilter !== 'all' ? 'No invoices match the current filters.' : 'No invoices yet. Add your first invoice above.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Invoice</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Job</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Amount</th>
                <th className="text-right px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">GST</th>
                <th className="text-right px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Due Date</th>
                <th className="text-left px-4 py-3 font-semibold text-[#6B7280] text-xs uppercase tracking-wider bg-[#F4F5F7]">Created</th>
                <th className="px-4 py-3 w-8 bg-[#F4F5F7]" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className="cursor-pointer border-b border-[#F4F5F7] hover:bg-[#F9FAFB] transition-colors group"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-[#1A1A2E]">
                    {invoiceNumber(inv.id)}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">
                    {inv.clients?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[140px]">
                    {inv.jobs?.title
                      ? <span className="block truncate">{inv.jobs.title}</span>
                      : inv.jobs?.job_type
                        ? <span className="block truncate text-[#6B7280]">{inv.jobs.job_type}</span>
                        : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 tabular-nums text-xs">
                    {fmt(inv.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-[#6B7280] tabular-nums text-xs">
                    {fmt(inv.tax)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#1A1A2E] tabular-nums">
                    {fmt(inv.total)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {inv.due_date
                      ? new Date(inv.due_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs">
                    {new Date(inv.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
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

      {showModal && (
        <AddInvoiceModal clients={clients} jobs={jobs} quotes={quotes} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
