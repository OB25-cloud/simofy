import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'
import LeadsView from '@/app/components/leads/LeadsView'

export const dynamic = 'force-dynamic'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: { action?: string }
}) {
  const { data } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8">
      <LeadsView leads={(data ?? []) as unknown as Lead[]} openModal={searchParams?.action === 'new'} />
    </div>
  )
}
