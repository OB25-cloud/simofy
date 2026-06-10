import { supabase } from '@/lib/supabase'
import type { Invoice, Client, Job, Quote } from '@/lib/types'
import InvoicesView from '@/app/components/invoices/InvoicesView'

export const dynamic = 'force-dynamic'

export default async function InvoicesPage() {
  const [{ data: invoices }, { data: clients }, { data: jobs }, { data: quotes }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, clients(name, email, phone), jobs(title, job_type), quotes(id)')
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name, business_name').order('name'),
    supabase.from('jobs').select('id, title, job_type, client_id').order('created_at', { ascending: false }),
    supabase.from('quotes').select('id, client_id, total').order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-8">
      <InvoicesView
        invoices={(invoices ?? []) as unknown as Invoice[]}
        clients={(clients  ?? []) as unknown as Pick<Client, 'id' | 'name' | 'business_name'>[]}
        jobs={(jobs        ?? []) as unknown as Pick<Job, 'id' | 'title' | 'job_type' | 'client_id'>[]}
        quotes={(quotes    ?? []) as unknown as Pick<Quote, 'id' | 'client_id' | 'total'>[]}
      />
    </div>
  )
}
