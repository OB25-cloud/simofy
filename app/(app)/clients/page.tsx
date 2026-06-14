import { supabase } from '@/lib/supabase'
import ClientsView from '@/app/components/clients/ClientsView'

export const dynamic = 'force-dynamic'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) {
  const [{ data: clients }, params] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    searchParams,
  ])

  return (
    <div className="p-4 md:p-8">
      <ClientsView clients={clients ?? []} openModal={params?.action === 'new'} />
    </div>
  )
}
