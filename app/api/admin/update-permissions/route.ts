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

  const { userId, module, action, enabled } = await req.json()
  if (!userId || !module || !action || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!(MODULES as readonly string[]).includes(module) || !(ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ error: 'Invalid module or action' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { error } = await admin.from('user_permissions').upsert(
    { profile_id: userId, module: module as Module, action: action as Action, enabled },
    { onConflict: 'profile_id,module,action' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
