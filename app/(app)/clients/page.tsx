import { supabase } from '@/lib/supabase'
import ClientsView from '@/app/components/clients/ClientsView'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8">
      <ClientsView clients={clients ?? []} />
    </div>
  )
}
