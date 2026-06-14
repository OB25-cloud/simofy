import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Lead } from '@/lib/types'
import LeadHeaderActions from '@/app/components/leads/LeadHeaderActions'
import LeadDetailTabs from '@/app/components/leads/LeadDetailTabs'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  new:       { bg: '#fdf8ee', text: '#B8922A', dot: '#B8922A', label: 'New'       },
  contacted: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Contacted' },
  converted: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Converted' },
  lost:      { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Lost'      },
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (!lead) notFound()

  const typedLead = lead as unknown as Lead
  const statusCfg = STATUS_CONFIG[typedLead.status ?? ''] ?? STATUS_CONFIG.new

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-5 flex items-center gap-2 text-sm text-gray-400">
          <Link href="/leads" className="hover:text-gray-600 transition-colors">Leads</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{typedLead.name ?? 'Lead'}</span>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-semibold text-gray-900">{typedLead.name ?? 'Unnamed Lead'}</h1>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: statusCfg.bg, color: statusCfg.text }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.dot }} />
                {statusCfg.label}
              </span>
            </div>
            {typedLead.source && (
              <p className="text-sm text-gray-400">via {typedLead.source}</p>
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
