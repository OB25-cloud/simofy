import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabaseServer'
import { supabase as db } from '@/lib/supabase'
import { isDemoRequest } from '@/lib/demoHeader'
import { StatusBadge } from '@/app/components/ui/Badge'

export const dynamic = 'force-dynamic'

export default async function MyJobsPage() {
  const isDemo = await isDemoRequest()
  let userEmail: string | null = null

  if (!isDemo) {
    const authSupabase = await createServerSupabase()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) redirect('/login')
    userEmail = user.email ?? null
  }

  // Find this user's staff record by matching email. In demo mode there's
  // no real user to match — fall back to any one active staff member so
  // the page still shows something real rather than an empty state.
  const { data: staffRecord } = isDemo
    ? await db.from('staff').select('id, name').eq('is_active', true).order('name').limit(1).single()
    : await db.from('staff').select('id, name').eq('email', userEmail!).single()

  if (!staffRecord) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">My Jobs</h1>
        <p className="text-sm text-[#6B7280]">
          {isDemo
            ? 'No active staff records to show in this demo.'
            : `No staff record found for your account (${userEmail}). Contact your administrator.`}
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
                {upcoming.map(job => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between px-5 py-4 border-t border-[#F4F5F7] first:border-t-0 hover:bg-[#F9FAFB] transition-colors group"
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
                {past.map(job => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between px-5 py-4 border-t border-[#F4F5F7] first:border-t-0 hover:bg-[#F9FAFB] transition-colors group opacity-60 hover:opacity-100"
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
