import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Staff, Job } from '@/lib/types'
import StaffActions from '@/app/components/staff/StaffActions'
import StaffDetailTabs from '@/app/components/staff/StaffDetailTabs'
import { RoleChip, StaffAvatarCircle } from '@/app/components/staff/StaffView'
import { StatusBadge } from '@/app/components/ui/Badge'

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

  // Jobs carry no value of their own — the quote raised against a job is
  // the closest thing, and feeds the "avg job value" stat on the profile.
  const jobIds = jobList.map(j => j.id)
  const { data: quotes } = jobIds.length > 0
    ? await supabase.from('quotes').select('job_id, total').in('job_id', jobIds).not('total', 'is', null)
    : { data: [] as { job_id: string; total: number }[] }
  const quoteTotals: Record<string, number> = {}
  for (const q of (quotes ?? []) as { job_id: string; total: number }[]) {
    quoteTotals[q.job_id] = Math.max(quoteTotals[q.job_id] ?? 0, Number(q.total) || 0)
  }

  const memberSince = new Date(typedStaff.created_at).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Staff
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <StaffAvatarCircle staffId={typedStaff.id} name={typedStaff.name} size="xl" inactive={!typedStaff.is_active} />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink truncate">{typedStaff.name}</h1>
              <RoleChip role={typedStaff.role} size="md" />
              <StatusBadge
                status={typedStaff.is_active ? 'active' : 'inactive'}
                label={typedStaff.is_active ? 'Active' : 'Inactive'}
                className={typedStaff.is_active ? '' : '!bg-red-50 !text-red-800 !ring-red-600/20'}
              />
            </div>
            <p className="mt-1 text-xs text-ink-muted flex items-center gap-3 flex-wrap">
              <span>Member since {memberSince}</span>
              {typedStaff.phone && <a href={`tel:${typedStaff.phone}`} className="hover:text-accent transition-colors tabular-nums">{typedStaff.phone}</a>}
              {typedStaff.email && <a href={`mailto:${typedStaff.email}`} className="hover:text-accent transition-colors truncate">{typedStaff.email}</a>}
            </p>
          </div>
        </div>
        <StaffActions staff={typedStaff} />
      </div>

      {/* Tabbed content */}
      <StaffDetailTabs staff={typedStaff} jobs={jobList} quoteTotals={quoteTotals} />
    </div>
  )
}
