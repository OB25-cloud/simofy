import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseServer'
import Sidebar from '@/app/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'field'

  return (
    <div className="h-full flex">
      <Sidebar role={role} userEmail={user.email} />
      <main className="flex-1 bg-white overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
