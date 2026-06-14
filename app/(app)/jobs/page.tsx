import { supabase } from '@/lib/supabase'
import JobsView from '@/app/components/jobs/JobsView'

export const dynamic = 'force-dynamic'

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) {
  const [{ data: jobs }, { data: clients }, { data: staff }, params] = await Promise.all([
    supabase.from('jobs').select('*, clients(name, business_name), staff(name)').order('scheduled_date', { ascending: true, nullsFirst: false }),
    supabase.from('clients').select('id, name, business_name').order('name'),
    supabase.from('staff').select('id, name').eq('is_active', true).order('name'),
    searchParams,
  ])

  return (
    <div className="p-4 md:p-8">
      <JobsView
        jobs={jobs ?? []}
        clients={clients ?? []}
        staff={staff ?? []}
        openModal={params?.action === 'new'}
      />
    </div>
  )
}
