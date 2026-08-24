import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']

// Demo mode: /demo/* is publicly readable, no auth required. `/demo` itself
// is a real standalone page (app/demo/page.tsx). Everything under
// `/demo/xxx` is transparently rewritten to the exact same route tree the
// real app renders for `/xxx` — no page is duplicated — tagged with a
// header so app/(app)/layout.tsx and the handful of pages with their own
// auth redirect (reports, my-jobs, settings/*) know to skip the login gate.
const DEMO_PREFIX = '/demo'
const DEMO_COOKIE = 'operify_demo'
const DEMO_HEADER = 'x-operify-demo' // must match lib/demoHeader.ts's DEMO_HEADER

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname === DEMO_PREFIX) {
    return NextResponse.next()
  }

  if (pathname.startsWith(DEMO_PREFIX + '/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice(DEMO_PREFIX.length) || '/'

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(DEMO_HEADER, '1')

    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    // Marks this browser as "in a demo session" so a link that escapes the
    // /demo prefix (an internal href a shared component wasn't aware needed
    // prefixing) self-heals back under /demo instead of hitting the real
    // login gate below.
    response.cookies.set(DEMO_COOKIE, '1', { path: '/', sameSite: 'lax' })
    return response
  }

  const cameFromDemo = request.cookies.get(DEMO_COOKIE)?.value === '1'

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh the session so it doesn't expire mid-use
  const { data: { user } } = await supabase.auth.getUser()

  // Authenticated users hitting /login → send to dashboard
  if (PUBLIC_PATHS.includes(pathname)) {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Unauthenticated users hitting any protected route → send to login,
  // unless they're a demo visitor who followed a link that wasn't
  // /demo-prefixed — send those back under /demo instead.
  if (!user) {
    if (cameFromDemo) {
      return NextResponse.redirect(new URL(DEMO_PREFIX + pathname, request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
