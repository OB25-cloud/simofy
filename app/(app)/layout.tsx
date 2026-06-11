import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseServer'
import AppShell from '@/app/components/AppShell'

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
    <AppShell role={role} userName={profile?.name} userEmail={user.email}>
      {children}
    </AppShell>
  )
}
