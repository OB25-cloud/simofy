import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role } = await req.json()
  if (!email || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!['supervisor', 'field'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role — only supervisor or field allowed' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo: 'https://simofy.vercel.app/auth/confirm',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed the profile row so the role is set even before the user accepts
  if (data.user) {
    await admin.from('profiles').upsert(
      { id: data.user.id, email, role },
      { onConflict: 'id' },
    )
  }

  return NextResponse.json({ ok: true })
}
