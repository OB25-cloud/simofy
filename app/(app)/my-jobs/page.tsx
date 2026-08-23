import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabaseServer'
import { supabase as db } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending:     { bg: '#F4F5F7', text: '#6B7280', dot: '#E5E7EB', label: 'Pending'     },
  scheduled:   { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Scheduled'   },
  in_progress: { bg: '#fdf8ee', text: '#C9A84C', dot: '#C9A84C', label: 'In Progress' },
  complete:    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Complete'     },
  invoiced:    { bg: '#faf5ff', text: '#7c3aed', dot: '#8b5cf6', label: 'Invoiced'    },
  cancelled:   { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Cancelled'   },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

export default async function MyJobsPage() {
  const authSupabase = await createServerSupabase()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) redirect('/login')

  // Find this user's staff record by matching email
  const { data: staffRecord } = await db
    .from('staff')
    .select('id, name')
    .eq('email', user.email!)
    .single()

  if (!staffRecord) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">My Jobs</h1>
        <p className="text-sm text-[#6B7280]">
          No staff record found for your account ({user.email}). Contact your administrator.
        </p>
      </div>
    )
  }

  const { data: jobs } = await db
    .from('jobs')
    .select('id, title, job_type, status, scheduled_date, location, clients(name)')
    .eq('staff_id', staffRecord.id)
    .order('scheduled_date', { ascending: true })

  type MyJob = {
    id: string
    title: string | null
    job_type: string | null
    status: string | null
    scheduled_date: string | null
    location: string | null
    clients: { name: string } | null
  }

  const jobList = (jobs as MyJob[] | null) ?? []
  const todayStr = new Date().toISOString().split('T')[0]

  const upcoming = jobList.filter(j => !j.scheduled_date || j.scheduled_date >= todayStr)
  const past = jobList.filter(j => j.scheduled_date && j.scheduled_date < todayStr)

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">My Jobs</h1>
        <p className="mt-0.5 text-sm text-[#6B7280]">Jobs assigned to {staffRecord.name}</p>
      </div>

      {jobList.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F4F5F7] py-16 text-center">
          <p className="text-sm text-[#6B7280]">No jobs assigned to you yet.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
                Upcoming & Active
              </p>
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                {upcoming.map((job, i) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-[#F9FAFB] transition-colors group"
                    style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1A1A2E] group-hover:text-[#C9A84C] transition-colors truncate">
                        {job.title ?? job.job_type ?? 'Untitled'}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {job.clients?.name ?? '—'}
                        {job.scheduled_date && (
                          <span> · {new Date(job.scheduled_date).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Past</p>
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                {past.map((job, i) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-[#F9FAFB] transition-colors group opacity-60 hover:opacity-100"
                    style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1A1A2E] group-hover:text-[#C9A84C] transition-colors truncate">
                        {job.title ?? job.job_type ?? 'Untitled'}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {job.clients?.name ?? '—'}
                        {job.scheduled_date && (
                          <span> · {new Date(job.scheduled_date).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
