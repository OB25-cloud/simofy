import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { MODULES, ACTIONS } from '@/lib/permissions'
import type { Module, Action } from '@/lib/permissions'

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, permissions } = await req.json()
  if (!userId || !Array.isArray(permissions)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  for (const p of permissions) {
    if (
      !(MODULES as readonly string[]).includes(p.module) ||
      !(ACTIONS as readonly string[]).includes(p.action)
    ) {
      return NextResponse.json({ error: 'Invalid module or action' }, { status: 400 })
    }
  }

  const admin = getSupabaseAdmin()
  const rows = (permissions as { module: Module; action: Action; enabled: boolean }[]).map(p => ({
    profile_id: userId,
    module: p.module,
    action: p.action,
    enabled: p.enabled,
  }))

  const { error } = await admin
    .from('user_permissions')
    .upsert(rows, { onConflict: 'profile_id,module,action' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
