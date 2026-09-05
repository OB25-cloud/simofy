import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Staff, Job } from '@/lib/types'
import StaffActions from '@/app/components/staff/StaffActions'
import StaffDetailTabs from '@/app/components/staff/StaffDetailTabs'
import { StatusBadge } from '@/app/components/ui/Badge'

const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: 'rgba(21, 128, 61,0.12)', text: 'var(--accent)', label: 'Admin' },
  field: { bg: '#DBEAFE', text: '#3B82F6', label: 'Field' },
}

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ data: staff }, { data: jobs }] = await Promise.all([
    supabase.from('staff').select('*').eq('id', id).single(),
    supabase
      .from('jobs')
      .select('*, clients(name)')
      .eq('staff_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!staff) notFound()

  const typedStaff = staff as unknown as Staff
  const jobList = (jobs ?? []) as unknown as Job[]
  const roleConfig = typedStaff.role ? (ROLE_CONFIG[typedStaff.role] ?? null) : null

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Staff
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">{typedStaff.name}</h1>
            {roleConfig && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: roleConfig.bg, color: roleConfig.text }}
              >
                {roleConfig.label}
              </span>
            )}
            <StatusBadge status={typedStaff.is_active ? 'active' : 'inactive'} />
          </div>
        </div>
        <StaffActions staff={typedStaff} />
      </div>

      {/* Tabbed content */}
      <StaffDetailTabs staff={typedStaff} jobs={jobList} />
    </div>
  )
}
