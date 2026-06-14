import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseServer'
import AppShell from '@/app/components/AppShell'
import { buildPermissionMap, ROLE_DEFAULTS } from '@/lib/permissions'
import type { PermissionMap } from '@/lib/permissions'

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

  let permissions: PermissionMap | null = null
  if (role !== 'admin') {
    const { data: permRows } = await supabase
      .from('user_permissions')
      .select('module, action, enabled')
      .eq('profile_id', user.id)

    permissions = permRows && permRows.length > 0
      ? buildPermissionMap(permRows)
      : (ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.field)
  }

  return (
    <AppShell role={role} userName={profile?.name} userEmail={user.email} permissions={permissions}>
      {children}
    </AppShell>
  )
}
