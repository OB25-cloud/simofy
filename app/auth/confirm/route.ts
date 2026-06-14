import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null

  if (code || (token_hash && type)) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    let error: { message: string } | null = null

    if (code) {
      // PKCE flow — Supabase exchanges the code for a session
      ;({ error } = await supabase.auth.exchangeCodeForSession(code))
    } else if (token_hash && type) {
      // Token-hash flow (older email OTP format)
      ;({ error } = await supabase.auth.verifyOtp({ token_hash, type }))
    }

    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=invalid_link', origin))
}
