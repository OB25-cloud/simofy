import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Pass revalidateSeconds to opt this client's queries into Next.js's fetch
// Data Cache instead of always hitting Supabase fresh — use this only for
// non-auth data fetching (e.g. a reports page), never for auth.getUser()/
// profile-role checks, which must stay live every request. Most callers
// should keep calling createServerSupabase() with no argument.
export async function createServerSupabase(revalidateSeconds?: number) {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Called from a Server Component — cookie writes handled by proxy refresh
          }
        },
      },
      ...(revalidateSeconds != null
        ? {
            global: {
              fetch: (input: RequestInfo | URL, init?: RequestInit) =>
                fetch(input, { ...init, next: { revalidate: revalidateSeconds } }),
            },
          }
        : {}),
    }
  )
}
