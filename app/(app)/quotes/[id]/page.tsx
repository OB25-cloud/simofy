import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Quote, QuoteLineItem, Client, Job } from '@/lib/types'
import QuoteActions from '@/app/components/quotes/QuoteActions'
import QuotePDFButton from '@/app/components/quotes/QuotePDFButton'
import QuoteDetailTabs from '@/app/components/quotes/QuoteDetailTabs'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft:    { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Draft' },
  sent:     { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Sent' },
  accepted: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Accepted' },
  declined: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Declined' },
  expired:  { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'Expired' },
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

  const statusCfg = STATUS_CONFIG[typedQuote.status ?? ''] ?? STATUS_CONFIG.draft

  return (
    <div className="p-4 md:p-8">
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
          <div className="flex items-center gap-2 flex-wrap">
            <QuotePDFButton quote={typedQuote} lineItems={typedItems} />
            <QuoteActions quote={typedQuote} clients={typedClients} jobs={typedJobs} />
          </div>
        </div>

        {/* Tabbed content */}
        <QuoteDetailTabs quote={typedQuote} lineItems={typedItems} />
      </div>
    </div>
  )
}
