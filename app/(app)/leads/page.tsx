import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/types'
import LeadsView from '@/app/components/leads/LeadsView'

export const dynamic = 'force-dynamic'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) {
  const [{ data }, params] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    searchParams,
  ])

  return (
    <div className="p-4 md:p-8">
      <LeadsView leads={(data ?? []) as unknown as Lead[]} openModal={params?.action === 'new'} />
    </div>
  )
}
