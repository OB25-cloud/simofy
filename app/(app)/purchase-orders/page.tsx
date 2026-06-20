import { createServerSupabase } from '@/lib/supabaseServer'
import type { PurchaseOrder } from '@/lib/types'
import PurchaseOrdersListView from '@/app/components/purchase-orders/PurchaseOrdersListView'

export const dynamic = 'force-dynamic'

export default async function PurchaseOrdersPage() {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: purchaseOrders }, { data: myProfile }] = await Promise.all([
    supabase
      .from('purchase_orders')
      .select('*, jobs(title, job_type)')
      .order('created_at', { ascending: false }),
    user ? supabase.from('profiles').select('role').eq('id', user.id).single() : Promise.resolve({ data: null }),
  ])

  const isAdmin = myProfile?.role === 'admin'

  return (
    <div className="p-4 md:p-8">
      <PurchaseOrdersListView
        purchaseOrders={(purchaseOrders ?? []) as unknown as PurchaseOrder[]}
        isAdmin={isAdmin}
      />
    </div>
  )
}
