import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Invoice, Client, Job, Quote, QuoteLineItem } from '@/lib/types'
import InvoiceActions from '@/app/components/invoices/InvoiceActions'
import InvoiceDetailTabs from '@/app/components/invoices/InvoiceDetailTabs'
import { StatusBadge } from '@/app/components/ui/Badge'

export const dynamic = 'force-dynamic'

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
  const typedClients  = (clients ?? []) as unknown as Pick<Client, 'id' | 'name' | 'business_name'>[]
  const typedJobs     = (jobs    ?? []) as unknown as Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]
  const typedQuotes   = (quotes  ?? []) as unknown as Pick<Quote, 'id' | 'client_id' | 'total'>[]

  // What was billed: invoices don't carry their own line items, so show the
  // items from the quote this invoice was raised from (if any).
  const { data: lineItems } = inv.quote_id
    ? await supabase.from('quote_line_items').select('*').eq('quote_id', inv.quote_id).order('sort_order')
    : { data: [] as QuoteLineItem[] }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-5 flex items-center gap-2 text-sm text-ink-muted">
          <Link href="/invoices" className="inline-flex items-center gap-1.5 hover:text-ink transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Invoices
          </Link>
          <span className="text-ink-faint">/</span>
          <span className="font-mono text-xs font-semibold text-ink-muted">{invoiceNumber(inv.id)}</span>
        </div>

        {/* Header */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[30px] leading-tight font-bold tracking-tight text-ink font-mono">{invoiceNumber(inv.id)}</h1>
              <StatusBadge status={inv.status} />
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {inv.clients?.name ?? 'No client'}
              {inv.jobs?.title && <> · {inv.jobs.title}</>}
            </p>
          </div>
          <InvoiceActions invoice={inv} clients={typedClients} jobs={typedJobs} quotes={typedQuotes} />
        </div>

        <InvoiceDetailTabs invoice={inv} lineItems={(lineItems ?? []) as unknown as QuoteLineItem[]} />
      </div>
    </div>
  )
}
