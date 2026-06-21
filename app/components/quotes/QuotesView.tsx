'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Quote, Client, Job } from '@/lib/types'
import AddQuoteModal from './AddQuoteModal'
import { isOverdueForFollowUp } from '@/lib/quoteFollowUp'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:    { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Draft'    },
  sent:     { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Sent'     },
  accepted: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Accepted' },
  declined: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Declined' },
  expired:  { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'Expired'  },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>
  const c = STATUS_CONFIG[status] ?? { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: status }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

function FollowUpBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: '#fffbeb', color: '#b45309' }}
      title="Sent more than 7 days ago with no response"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      Follow up
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

function quoteNumber(id: string) {
  return `Q-${id.slice(0, 6).toUpperCase()}`
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
  quotes: Quote[]
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  jobs: Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
  openModal?: boolean
}

export default function QuotesView({ quotes, clients, jobs, openModal }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(openModal ?? false)

  const acceptedValue = quotes
    .filter(q => q.status === 'accepted')
    .reduce((sum, q) => sum + (q.total ?? 0), 0)

  const stats = [
    { label: 'Total Quotes',   value: String(quotes.length),                                      accent: true  },
    { label: 'Draft',          value: String(quotes.filter(q => q.status === 'draft').length),    accent: false },
    { label: 'Sent',           value: String(quotes.filter(q => q.status === 'sent').length),     accent: false },
    { label: 'Accepted Value', value: fmtShort(acceptedValue),                                    accent: true  },
  ]

  const filtered = quotes.filter(q => {
    const s = search.toLowerCase()
    const matchSearch =
      quoteNumber(q.id).toLowerCase().includes(s) ||
      (q.clients?.name.toLowerCase().includes(s) ?? false) ||
      (q.status?.includes(s) ?? false) ||
      (q.jobs?.title?.toLowerCase().includes(s) ?? false)
    const matchStatus = statusFilter === 'all' || q.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Quotes</h1>
          <p className="mt-0.5 text-sm text-gray-500">{quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'} total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-3 sm:py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90"
          style={{ background: '#B8922A' }}
        >
          <PlusIcon />
          Add Quote
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: s.accent ? '#B8922A' : '#111827' }}>
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
            placeholder="Search by quote ID, client, job or status…"
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
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 py-16 text-center">
          <p className="text-sm text-gray-400">
            {search || statusFilter !== 'all' ? 'No quotes match the current filters.' : 'No quotes yet. Add your first quote above.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Quote</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Job</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Subtotal</th>
                <th className="text-right px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Valid Until</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((quote, i) => (
                <tr
                  key={quote.id}
                  onClick={() => router.push(`/quotes/${quote.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors group"
                  style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 font-mono text-xs">
                    {quoteNumber(quote.id)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {quote.clients?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[120px]">
                    {quote.jobs?.title
                      ? <span className="block truncate">{quote.jobs.title}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {quote.jobs?.job_type ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={quote.status} />
                      {isOverdueForFollowUp(quote) && <FollowUpBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 tabular-nums text-xs">
                    {fmt(quote.subtotal)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">
                    {fmt(quote.total)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {quote.valid_until
                      ? new Date(quote.valid_until).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(quote.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
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
        <AddQuoteModal clients={clients} jobs={jobs} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
