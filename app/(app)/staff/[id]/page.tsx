import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Staff, Job } from '@/lib/types'
import StaffActions from '@/app/components/staff/StaffActions'
import StaffDetailTabs from '@/app/components/staff/StaffDetailTabs'

const ROLE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: '#fdf8ee', text: '#B8922A', label: 'Admin' },
  field: { bg: '#eff6ff', text: '#1d4ed8', label: 'Field' },
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
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
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
            <h1 className="text-2xl font-semibold text-gray-900">{typedStaff.name}</h1>
            {roleConfig && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: roleConfig.bg, color: roleConfig.text }}
              >
                {roleConfig.label}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={
                typedStaff.is_active
                  ? { background: '#fdf8ee', color: '#B8922A' }
                  : { background: '#f3f4f6', color: '#9ca3af' }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: typedStaff.is_active ? '#B8922A' : '#d1d5db' }}
              />
              {typedStaff.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <StaffActions staff={typedStaff} />
      </div>

      {/* Tabbed content */}
      <StaffDetailTabs staff={typedStaff} jobs={jobList} />
    </div>
  )
}
