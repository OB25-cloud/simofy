import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Quote, QuoteLineItem, Client, Job } from '@/lib/types'
import QuoteActions from '@/app/components/quotes/QuoteActions'
import QuotePDFButton from '@/app/components/quotes/QuotePDFButton'
import QuoteDetailTabs from '@/app/components/quotes/QuoteDetailTabs'
import { StatusBadge } from '@/app/components/ui/Badge'

export const dynamic = 'force-dynamic'

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

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-5 flex items-center gap-2 text-sm text-[#6B7280]">
          <Link href="/quotes" className="hover:text-[#6B7280] transition-colors">Quotes</Link>
          <span>/</span>
          <span className="text-[#6B7280] font-mono text-xs font-medium">{quoteNumber(typedQuote.id)}</span>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#1A1A2E] font-mono">{quoteNumber(typedQuote.id)}</h1>
            <StatusBadge status={typedQuote.status} />
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
