'use server'

import { createServerSupabase } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'

export async function login(prevState: string | null, formData: FormData) {
  const email    = (formData.get('email')    as string)?.trim()
  const password = (formData.get('password') as string)

  if (!email || !password) return 'Email and password are required.'

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return error.message

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
