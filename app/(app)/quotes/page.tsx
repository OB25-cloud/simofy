import { supabase } from '@/lib/supabase'
import type { Quote, Client, Job } from '@/lib/types'
import QuotesView from '@/app/components/quotes/QuotesView'

export const dynamic = 'force-dynamic'

export default async function QuotesPage({
  searchParams,
}: {
  searchParams?: { action?: string }
}) {
  const [{ data: quotes }, { data: clients }, { data: jobs }] = await Promise.all([
    supabase
      .from('quotes')
      .select('*, clients(name, email, phone), jobs(title, job_type)')
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name, business_name').order('name'),
    supabase.from('jobs').select('id, title, job_type, client_id').order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-4 md:p-8">
      <QuotesView
        quotes={(quotes ?? []) as unknown as Quote[]}
        clients={(clients ?? []) as unknown as Pick<Client, 'id' | 'name' | 'business_name'>[]}
        jobs={(jobs ?? []) as unknown as Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]}
        openModal={searchParams?.action === 'new'}
      />
    </div>
  )
}
