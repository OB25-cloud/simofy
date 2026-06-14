import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { defaultPermissionRows } from '@/lib/permissions'

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, role } = await req.json()
  if (!userId || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!['admin', 'supervisor', 'field'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { error: roleError } = await admin.from('profiles').update({ role }).eq('id', userId)
  if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 })

  // Delete existing permissions then insert defaults for the new role
  await admin.from('user_permissions').delete().eq('profile_id', userId)

  if (role !== 'admin') {
    const rows = defaultPermissionRows(role).map(r => ({ profile_id: userId, ...r }))
    const { error: permError } = await admin.from('user_permissions').insert(rows)
    if (permError) return NextResponse.json({ error: permError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
