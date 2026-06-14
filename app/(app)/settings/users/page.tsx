import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import UsersView from '@/app/components/settings/UsersView'

export const dynamic = 'force-dynamic'

export default async function UsersSettingsPage() {
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
      <div className="px-6 py-5 border-b border-gray-100 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#B8922A' }}>Settings</p>
        <h1 className="text-xl font-bold text-gray-900">Users & Permissions</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage user roles and granular module permissions.</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <UsersView users={userList} currentUserId={user.id} />
      </div>
    </div>
  )
}
