import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isDemoRequest } from '@/lib/demoHeader'
import UsersView from '@/app/components/settings/UsersView'

export const dynamic = 'force-dynamic'

export default async function UsersSettingsPage() {
  // This page lists real account emails via the service-role admin client —
  // unlike every other page, that's not seed data, so demo mode gets a
  // placeholder instead of being let through to real content.
  if (await isDemoRequest()) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 py-5 border-b border-line shrink-0">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>Settings</p>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">Users & Permissions</h1>
          <p className="text-xs text-ink-muted mt-1">Manage user roles and granular module permissions.</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-ink-muted text-center max-w-sm">
            User management isn&apos;t available in the demo — sign up to manage your own team.
          </p>
        </div>
      </div>
    )
  }

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') redirect('/dashboard')

  const admin = getSupabaseAdmin()

  const [
    { data: { users: authUsers } },
    { data: profiles },
    { data: allPermissions },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from('profiles').select('id, role, name'),
    admin.from('user_permissions').select('profile_id, module, action, enabled'),
  ])

  type ProfileRow = { id: string; role: string | null; name: string | null }
  const profileMap = new Map<string, ProfileRow>((profiles ?? []).map((p: ProfileRow) => [p.id, p]))

  type PermRow = { profile_id: string; module: string; action: string; enabled: boolean }
  const permsByUser: Record<string, { module: string; action: string; enabled: boolean }[]> = {}
  for (const perm of (allPermissions ?? []) as PermRow[]) {
    if (!permsByUser[perm.profile_id]) permsByUser[perm.profile_id] = []
    permsByUser[perm.profile_id].push({ module: perm.module, action: perm.action, enabled: perm.enabled })
  }

  type AuthUser = { id: string; email?: string }
  const userList = (authUsers ?? []).map((u: AuthUser) => {
    const p = profileMap.get(u.id)
    return {
      id:          u.id,
      email:       u.email ?? '',
      role:        p?.role  ?? 'field',
      name:        p?.name  ?? null,
      permissions: permsByUser[u.id] ?? [],
    }
  })

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-line shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>Settings</p>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">Users & Permissions</h1>
        <p className="text-xs text-ink-muted mt-1">Manage user roles and granular module permissions.</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <UsersView users={userList} currentUserId={user.id} />
      </div>
    </div>
  )
}
