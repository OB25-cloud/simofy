import { supabase } from '@/lib/supabase'
import StaffView from '@/app/components/staff/StaffView'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const todayKey = new Date().toISOString().split('T')[0]

  const [{ data: staff }, { data: todayJobs }] = await Promise.all([
    supabase.from('staff').select('*').order('name', { ascending: true }),
    // Who is rostered today — feeds the "Today" stat and the insights line.
    supabase.from('jobs').select('staff_id').eq('scheduled_date', todayKey).not('staff_id', 'is', null),
  ])

  const scheduledTodayIds = Array.from(new Set(
    ((todayJobs ?? []) as { staff_id: string | null }[]).map(j => j.staff_id).filter((id): id is string => !!id),
  ))

  return (
    <div className="p-4 md:p-8">
      <StaffView staff={staff ?? []} scheduledTodayIds={scheduledTodayIds} />
    </div>
  )
}
