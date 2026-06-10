'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Quote, Client, Job } from '@/lib/types'
import AddQuoteModal from './AddQuoteModal'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:    { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Draft' },
  sent:     { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Sent' },
  accepted: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Accepted' },
  declined: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Declined' },
  expired:  { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'Expired' },
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

function fmt(n: number | null | undefined) {
  return n != null ? `$${n.toFixed(2)}` : '—'
}

function quoteNumber(id: string) {
  return `Q-${id.slice(0, 6).toUpperCase()}`
}

interface Props {
  quotes: Quote[]
  clients: Pick<Client, 'id' | 'name' | 'business_name'>[]
  jobs: Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
}

export default function QuotesView({ quotes, clients, jobs }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = quotes.filter((q) => {
    const s = search.toLowerCase()
    return (
      quoteNumber(q.id).toLowerCase().includes(s) ||
      (q.clients?.name.toLowerCase().includes(s) ?? false) ||
      (q.status?.includes(s) ?? false)
    )
  })

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Quotes</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'} total
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
          Add Quote
        </button>
      </div>

      <div className="mb-5 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search by quote ID, client or status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#B8922A]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 py-16 text-center">
          <p className="text-sm text-gray-400">
            {search ? `No quotes match "${search}"` : 'No quotes yet. Add your first quote above.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Quote</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Created</th>
                <th className="px-5 py-3 w-8" />
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
                  <td className="px-5 py-3.5 font-medium text-gray-900 font-mono text-xs">
                    {quoteNumber(quote.id)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-700">
                    {quote.clients?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={quote.status} />
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    {fmt(quote.total)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {new Date(quote.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
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
        <AddQuoteModal clients={clients} jobs={jobs} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
