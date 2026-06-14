import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Invoice, Client, Job, Quote } from '@/lib/types'
import InvoiceActions from '@/app/components/invoices/InvoiceActions'
import InvoiceDetailTabs from '@/app/components/invoices/InvoiceDetailTabs'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:     { bg: '#f3f4f6', text: '#6b7280',  dot: '#d1d5db', label: 'Draft'     },
  sent:      { bg: '#eff6ff', text: '#1d4ed8',  dot: '#3b82f6', label: 'Sent'      },
  paid:      { bg: '#f0fdf4', text: '#15803d',  dot: '#22c55e', label: 'Paid'      },
  overdue:   { bg: '#fef2f2', text: '#dc2626',  dot: '#ef4444', label: 'Overdue'   },
  cancelled: { bg: '#f9fafb', text: '#374151',  dot: '#6b7280', label: 'Cancelled' },
}

function invoiceNumber(id: string) {
  return `INV-${id.slice(0, 6).toUpperCase()}`
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

  const inv           = invoice as unknown as Invoice
  const statusCfg     = STATUS_CONFIG[inv.status ?? ''] ?? STATUS_CONFIG.draft
  const typedClients  = (clients ?? []) as unknown as Pick<Client, 'id' | 'name' | 'business_name'>[]
  const typedJobs     = (jobs    ?? []) as unknown as Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
  const typedQuotes   = (quotes  ?? []) as unknown as Pick<Quote, 'id' | 'client_id' | 'total'>[]

  return (
    <div className="p-4 md:p-8">
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

        {/* Tabbed content */}
        <InvoiceDetailTabs invoice={inv} />
      </div>
    </div>
  )
}
