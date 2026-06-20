import { createServerSupabase } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { JobPhoto, JobNote, Material, JobMaterial, ChecklistTemplate, JobChecklistItem, PurchaseOrder } from '@/lib/types'
import JobTabs from '@/app/components/jobs/JobTabs'
import JobActions from '@/app/components/jobs/JobActions'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: 'Pending'     },
  scheduled:   { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Scheduled'   },
  in_progress: { bg: '#fdf8ee', text: '#B8922A', dot: '#B8922A', label: 'In Progress' },
  complete:    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Complete'     },
  invoiced:    { bg: '#faf5ff', text: '#7c3aed', dot: '#8b5cf6', label: 'Invoiced'    },
  cancelled:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Cancelled'   },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-300 text-sm">—</span>
  const config = STATUS_CONFIG[status] ?? { bg: '#f3f4f6', text: '#6b7280', dot: '#d1d5db', label: status }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: config.bg, color: config.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  )
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: job },
    { data: photos },
    { data: notes },
    { data: clients },
    { data: staff },
    { data: materials },
    { data: jobMaterials },
    { data: purchaseOrders },
    { data: quotes },
    { data: checklistTemplates },
    { data: jobChecklistItems },
    { data: myProfile },
  ] = await Promise.all([
    supabase.from('jobs').select('*, clients(name, business_name), staff(name, pay_rate)').eq('id', id).single(),
    supabase.from('job_photos').select('*').eq('job_id', id).order('taken_at', { ascending: true }),
    supabase.from('job_notes').select('*').eq('job_id', id).order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name, business_name').order('name'),
    supabase.from('staff').select('id, name').eq('is_active', true).order('name'),
    supabase.from('materials').select('*').order('category').order('name'),
    supabase.from('job_materials').select('*, materials(name, unit)').eq('job_id', id).order('created_at'),
    supabase.from('purchase_orders').select('*').eq('job_id', id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('total').eq('job_id', id).order('created_at', { ascending: false }).limit(1),
    supabase.from('checklist_templates').select('id, name').order('name'),
    supabase.from('job_checklist_items').select('*').eq('job_id', id).order('sort_order', { ascending: true }),
    user ? supabase.from('profiles').select('role, name').eq('id', user.id).single() : Promise.resolve({ data: null }),
  ])

  if (!job) notFound()

  const quoteTotal: number | null = quotes?.[0]?.total ?? null
  const isAdmin = myProfile?.role === 'admin'
  const currentUserDisplayName = myProfile?.name ?? user?.email ?? 'Someone'

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900">
              {job.title ?? job.job_type ?? 'Untitled Job'}
            </h1>
            <StatusBadge status={job.status} />
          </div>
          {job.clients?.name && (
            <p className="text-gray-500">{job.clients.name}</p>
          )}
        </div>
        <JobActions job={job} clients={clients ?? []} staff={staff ?? []} />
      </div>

      <JobTabs
        job={job}
        initialPhotos={(photos ?? []) as JobPhoto[]}
        initialNotes={(notes ?? []) as JobNote[]}
        materials={(materials ?? []) as Material[]}
        initialJobMaterials={(jobMaterials ?? []) as JobMaterial[]}
        initialPurchaseOrders={(purchaseOrders ?? []) as PurchaseOrder[]}
        quoteTotal={quoteTotal}
        checklistTemplates={(checklistTemplates ?? []) as Pick<ChecklistTemplate, 'id' | 'name'>[]}
        initialChecklistItems={(jobChecklistItems ?? []) as JobChecklistItem[]}
        isAdmin={isAdmin}
        currentUserDisplayName={currentUserDisplayName}
      />
    </div>
  )
}
