import { supabase } from '@/lib/supabase'
import { paginateAll } from '@/lib/supabasePaginate'
import ClientsView, { type ClientRollup } from '@/app/components/clients/ClientsView'

export const dynamic = 'force-dynamic'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) {
  const [{ data: clients }, jobRows, invoiceRows, params] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    // Per-client job counts and invoice totals for the list. Both tables can
    // exceed PostgREST's 1000-row cap, so page through them.
    paginateAll<{ client_id: string | null }>((from, to) =>
      supabase.from('jobs').select('client_id').not('client_id', 'is', null).range(from, to)
    ),
    paginateAll<{ client_id: string | null; total: number | null; status: string | null }>((from, to) =>
      supabase.from('invoices').select('client_id, total, status').not('client_id', 'is', null).range(from, to)
    ),
    searchParams,
  ])

  const rollup: Record<string, ClientRollup> = {}
  const get = (id: string) => (rollup[id] ??= { jobs: 0, invoiced: 0, paid: 0, outstanding: 0 })
  for (const j of jobRows) if (j.client_id) get(j.client_id).jobs += 1
  for (const inv of invoiceRows) {
    if (!inv.client_id) continue
    const r = get(inv.client_id)
    const total = Number(inv.total) || 0
    r.invoiced += total
    if (inv.status === 'paid') r.paid += total
    else if (inv.status === 'sent' || inv.status === 'overdue') r.outstanding += total
  }

  return (
    <div className="p-4 md:p-8">
      <ClientsView clients={clients ?? []} rollup={rollup} openModal={params?.action === 'new'} />
    </div>
  )
}
