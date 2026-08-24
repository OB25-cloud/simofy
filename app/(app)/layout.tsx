import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseServer'
import AppShell from '@/app/components/AppShell'
import DemoBanner from '@/app/components/DemoBanner'
import DemoWriteToast from '@/app/components/DemoWriteToast'
import DemoFetchGuard from '@/app/components/DemoFetchGuard'
import { isDemoRequest } from '@/lib/demoHeader'
import { buildPermissionMap, ROLE_DEFAULTS } from '@/lib/permissions'
import type { PermissionMap } from '@/lib/permissions'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Demo mode (proxy.ts rewrote /demo/xxx to this same route tree, tagged
  // with a header) — no session exists and none is needed: skip the real
  // auth/profile/permissions lookups entirely and render a fixed identity.
  if (await isDemoRequest()) {
    return (
      <div className="h-screen flex flex-col">
        <DemoBanner />
        <div className="flex-1 min-h-0">
          <AppShell role="admin" userName="Demo User" userEmail={null} permissions={null} demoMode companyName="Green & Co Landscaping">
            {children}
          </AppShell>
        </div>
        <DemoWriteToast />
        <DemoFetchGuard />
      </div>
    )
  }

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
