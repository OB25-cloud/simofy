import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Lead } from '@/lib/types'
import LeadHeaderActions from '@/app/components/leads/LeadHeaderActions'
import LeadDetailTabs from '@/app/components/leads/LeadDetailTabs'
import { StatusBadge } from '@/app/components/ui/Badge'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (!lead) notFound()

  const typedLead = lead as unknown as Lead

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-5 flex items-center gap-2 text-sm text-[#6B7280]">
          <Link href="/leads" className="hover:text-[#6B7280] transition-colors">Leads</Link>
          <span>/</span>
          <span className="text-[#6B7280] font-medium">{typedLead.name ?? 'Lead'}</span>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-[#1A1A2E]">{typedLead.name ?? 'Unnamed Lead'}</h1>
              <StatusBadge status={typedLead.status} />
            </div>
            {typedLead.source && (
              <p className="text-sm text-[#6B7280]">via {typedLead.source}</p>
            )}
          </div>
          <LeadHeaderActions lead={typedLead} />
        </div>

        {/* Tabbed content */}
        <LeadDetailTabs lead={typedLead} />
      </div>
    </div>
  )
}
