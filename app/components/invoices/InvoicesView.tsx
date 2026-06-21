'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Invoice, Client, Job, Quote } from '@/lib/types'
import AddInvoiceModal from './AddInvoiceModal'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:     { bg: '#f3f4f6', text: '#6b7280',  dot: '#d1d5db', label: 'Draft'     },
  sent:      { bg: '#eff6ff', text: '#1d4ed8',  dot: '#3b82f6', label: 'Sent'      },
  paid:      { bg: '#f0fdf4', text: '#15803d',  dot: '#22c55e', label: 'Paid'      },
  overdue:   { bg: '#fef2f2', text: '#dc2626',  dot: '#ef4444', label: 'Overdue'   },
  cancelled: { bg: '#f9fafb', text: '#374151',  dot: '#6b7280', label: 'Cancelled' },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

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
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="mt-0.5 text-sm text-gray-500">{invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-3 sm:py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90"
          style={{ background: '#B8922A' }}
        >
          <PlusIcon />
          Add Invoice
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: s.danger ? '#dc2626' : s.accent ? '#B8922A' : '#111827' }}>
              {s.value}
            </p>
          </div>
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
            className="w-full pl-9 pr-4 py-3 sm:py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#B8922A]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-3 sm:py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#B8922A] text-gray-600"
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
        <div className="rounded-lg border border-gray-100 bg-gray-50 py-16 text-center">
          <p className="text-sm text-gray-400">
            {search || statusFilter !== 'all' ? 'No invoices match the current filters.' : 'No invoices yet. Add your first invoice above.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Invoice</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Job</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Amount</th>
                <th className="text-right px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">GST</th>
                <th className="text-right px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Due Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors group"
                  style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                    {invoiceNumber(inv.id)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {inv.clients?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[140px]">
                    {inv.jobs?.title
                      ? <span className="block truncate">{inv.jobs.title}</span>
                      : inv.jobs?.job_type
                        ? <span className="block truncate text-gray-400">{inv.jobs.job_type}</span>
                        : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 tabular-nums text-xs">
                    {fmt(inv.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 tabular-nums text-xs">
                    {fmt(inv.tax)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">
                    {fmt(inv.total)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {inv.due_date
                      ? new Date(inv.due_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(inv.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-gray-300 group-hover:text-[#B8922A] transition-colors text-base">→</span>
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
