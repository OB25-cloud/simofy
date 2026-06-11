import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Invoice, Client, Job, Quote } from '@/lib/types'
import InvoiceActions from '@/app/components/invoices/InvoiceActions'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:     { bg: '#f3f4f6', text: '#6b7280',  dot: '#d1d5db', label: 'Draft'     },
  sent:      { bg: '#eff6ff', text: '#1d4ed8',  dot: '#3b82f6', label: 'Sent'      },
  paid:      { bg: '#f0fdf4', text: '#15803d',  dot: '#22c55e', label: 'Paid'      },
  overdue:   { bg: '#fef2f2', text: '#dc2626',  dot: '#ef4444', label: 'Overdue'   },
  cancelled: { bg: '#f9fafb', text: '#374151',  dot: '#6b7280', label: 'Cancelled' },
}

function fmt(n: number | null | undefined) {
  return n != null ? `$${n.toFixed(2)}` : '—'
}

function invoiceNumber(id: string) {
  return `INV-${id.slice(0, 6).toUpperCase()}`
}

function quoteNumber(id: string) {
  return `Q-${id.slice(0, 6).toUpperCase()}`
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: invoice }, { data: clients }, { data: jobs }, { data: quotes }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, clients(name, email, phone), jobs(title, job_type), quotes(id)')
      .eq('id', id)
      .single(),
    supabase.from('clients').select('id, name, business_name').order('name'),
    supabase.from('jobs').select('id, title, job_type, client_id').order('created_at', { ascending: false }),
    supabase.from('quotes').select('id, client_id, total').order('created_at', { ascending: false }),
  ])

  if (!invoice) notFound()

  const inv        = invoice as unknown as Invoice
  const statusCfg  = STATUS_CONFIG[inv.status ?? ''] ?? STATUS_CONFIG.draft
  const typedClients = (clients ?? []) as unknown as Pick<Client, 'id' | 'name' | 'business_name'>[]
  const typedJobs    = (jobs    ?? []) as unknown as Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
  const typedQuotes  = (quotes  ?? []) as unknown as Pick<Quote, 'id' | 'client_id' | 'total'>[]

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-5 flex items-center gap-2 text-sm text-gray-400">
          <Link href="/invoices" className="hover:text-gray-600 transition-colors">Invoices</Link>
          <span>/</span>
          <span className="text-gray-700 font-mono text-xs font-medium">{invoiceNumber(inv.id)}</span>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900 font-mono">{invoiceNumber(inv.id)}</h1>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: statusCfg.bg, color: statusCfg.text }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.dot }} />
              {statusCfg.label}
            </span>
          </div>
          <InvoiceActions invoice={inv} clients={typedClients} jobs={typedJobs} quotes={typedQuotes} />
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Client */}
          <div className="rounded-lg border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client</p>
            {inv.clients ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">{inv.clients.name}</p>
                {inv.clients.email && <p className="text-sm text-gray-500">{inv.clients.email}</p>}
                {inv.clients.phone && <p className="text-sm text-gray-500">{inv.clients.phone}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-300">No client</p>
            )}
          </div>

          {/* Details */}
          <div className="rounded-lg border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</p>
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-xs text-gray-400">Created</dt>
                <dd className="text-xs text-gray-700">
                  {new Date(inv.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                </dd>
              </div>
              {inv.due_date && (
                <div className="flex justify-between gap-4">
                  <dt className="text-xs text-gray-400">Due Date</dt>
                  <dd className="text-xs text-gray-700">
                    {new Date(inv.due_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </dd>
                </div>
              )}
              {inv.jobs && (
                <div className="flex justify-between gap-4">
                  <dt className="text-xs text-gray-400">Linked Job</dt>
                  <dd className="text-xs text-gray-700 text-right truncate max-w-[160px]">
                    {inv.jobs.title ?? inv.jobs.job_type ?? '—'}
                  </dd>
                </div>
              )}
              {inv.quotes && (
                <div className="flex justify-between gap-4">
                  <dt className="text-xs text-gray-400">Linked Quote</dt>
                  <dd className="text-xs font-mono text-gray-700">{quoteNumber(inv.quotes.id)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Notes */}
        {inv.notes && (
          <div className="rounded-lg border border-gray-100 p-5 mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{inv.notes}</p>
          </div>
        )}

        {/* Totals */}
        <div className="rounded-lg border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Amount</p>
          <div className="space-y-2 max-w-xs">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmt(inv.amount)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>GST (15%)</span>
              <span className="tabular-nums">{fmt(inv.tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span className="tabular-nums">{fmt(inv.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
