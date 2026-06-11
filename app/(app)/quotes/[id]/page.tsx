import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Quote, QuoteLineItem, Client, Job } from '@/lib/types'
import QuoteActions from '@/app/components/quotes/QuoteActions'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:    { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Draft' },
  sent:     { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Sent' },
  accepted: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Accepted' },
  declined: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Declined' },
  expired:  { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'Expired' },
}

function fmt(n: number | null | undefined) {
  return n != null ? `$${n.toFixed(2)}` : '—'
}

function quoteNumber(id: string) {
  return `Q-${id.slice(0, 6).toUpperCase()}`
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: quote }, { data: lineItems }, { data: clients }, { data: jobs }] = await Promise.all([
    supabase
      .from('quotes')
      .select('*, clients(name, email, phone), jobs(title, job_type)')
      .eq('id', id)
      .single(),
    supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order'),
    supabase.from('clients').select('id, name, business_name').order('name'),
    supabase.from('jobs').select('id, title, job_type, client_id').order('created_at', { ascending: false }),
  ])

  if (!quote) notFound()

  const typedQuote = quote as unknown as Quote
  const typedItems = (lineItems ?? []) as unknown as QuoteLineItem[]
  const typedClients = (clients ?? []) as unknown as Pick<Client, 'id' | 'name' | 'business_name'>[]
  const typedJobs = (jobs ?? []) as unknown as Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]

  const status = typedQuote.status
  const statusCfg = STATUS_CONFIG[status ?? ''] ?? STATUS_CONFIG.draft

  return (
    <div className="p-8">
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/quotes" className="hover:text-gray-600 transition-colors">Quotes</Link>
        <span>/</span>
        <span className="text-gray-700 font-mono text-xs font-medium">{quoteNumber(typedQuote.id)}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-gray-900 font-mono">{quoteNumber(typedQuote.id)}</h1>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: statusCfg.bg, color: statusCfg.text }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.dot }} />
            {statusCfg.label}
          </span>
        </div>
        <QuoteActions quote={typedQuote} clients={typedClients} jobs={typedJobs} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Client */}
        <div className="rounded-lg border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client</p>
          {typedQuote.clients ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">{typedQuote.clients.name}</p>
              {typedQuote.clients.email && (
                <p className="text-sm text-gray-500">{typedQuote.clients.email}</p>
              )}
              {typedQuote.clients.phone && (
                <p className="text-sm text-gray-500">{typedQuote.clients.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-300">No client</p>
          )}
        </div>

        {/* Details */}
        <div className="rounded-lg border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</p>
          <dl className="space-y-2">
            {typedQuote.jobs && (
              <div className="flex justify-between gap-4">
                <dt className="text-xs text-gray-400">Linked Job</dt>
                <dd className="text-xs text-gray-700 text-right truncate max-w-[160px]">
                  {typedQuote.jobs.title ?? typedQuote.jobs.job_type ?? '—'}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-xs text-gray-400">Created</dt>
              <dd className="text-xs text-gray-700">
                {new Date(typedQuote.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
              </dd>
            </div>
            {typedQuote.valid_until && (
              <div className="flex justify-between gap-4">
                <dt className="text-xs text-gray-400">Valid Until</dt>
                <dd className="text-xs text-gray-700">
                  {new Date(typedQuote.valid_until).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Notes */}
      {typedQuote.notes && (
        <div className="rounded-lg border border-gray-100 p-5 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{typedQuote.notes}</p>
        </div>
      )}

      {/* Line Items */}
      <div className="rounded-lg border border-gray-100 overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Line Items</p>
        </div>
        {typedItems.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-300">No line items</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Description</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 w-20">Qty</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 w-28">Unit Price</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {typedItems.map((item, i) => (
                <tr key={item.id} style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}>
                  <td className="px-5 py-3 text-gray-700">{item.description ?? '—'}</td>
                  <td className="px-5 py-3 text-right text-gray-600 tabular-nums">{item.quantity ?? 0}</td>
                  <td className="px-5 py-3 text-right text-gray-600 tabular-nums">{fmt(item.unit_price)}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900 tabular-nums">{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-56 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(typedQuote.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>GST (15%)</span>
            <span className="tabular-nums">{fmt(typedQuote.gst)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span className="tabular-nums">{fmt(typedQuote.total)}</span>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
