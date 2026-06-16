import { supabase } from '@/lib/supabase'
import JobsView from '@/app/components/jobs/JobsView'
import type { Job } from '@/lib/types'

export const dynamic = 'force-dynamic'

// PostgREST caps unbounded selects at 1000 rows. With thousands of jobs in
// the table, an unpaginated query silently truncates to whatever sorts
// first — e.g. ordering by scheduled_date ascending returned only the
// earliest ~5 weeks of jobs, so "Today"/"This Week"/"This Month" filters
// had no current-dated rows to match against at all. Page through everything.
async function fetchAllJobs(): Promise<Job[]> {
  const PAGE_SIZE = 1000
  const rows: Job[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, clients(name, business_name), staff(name)')
      .order('scheduled_date', { ascending: true, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...((data ?? []) as unknown as Job[]))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) {
  const [jobs, { data: clients }, { data: staff }, params] = await Promise.all([
    fetchAllJobs(),
    supabase.from('clients').select('id, name, business_name').order('name'),
    supabase.from('staff').select('id, name').eq('is_active', true).order('name'),
    searchParams,
  ])

  return (
    <div className="p-4 md:p-8">
      <JobsView
        jobs={jobs}
        clients={clients ?? []}
        staff={staff ?? []}
        openModal={params?.action === 'new'}
      />
    </div>
  )
}
