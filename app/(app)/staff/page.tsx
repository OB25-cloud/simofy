import { supabase } from '@/lib/supabase'
import StaffView from '@/app/components/staff/StaffView'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="p-4 md:p-8">
      <StaffView staff={staff ?? []} />
    </div>
  )
}
