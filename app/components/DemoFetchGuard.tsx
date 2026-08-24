'use client'

import { useEffect } from 'react'
import { isDemoRoute, notifyDemoBlocked } from '@/lib/demoGuard'

// Defense in depth for the handful of mutations that go through a Route
// Handler instead of the Supabase client (app/api/admin/* — invite/delete
// user, update role/permissions). Those already reject unauthenticated
// requests server-side (no session exists in demo mode, so they 401
// regardless), but intercepting the fetch here means a blocked demo write
// shows the same toast as everything else instead of a raw server error.
// /api/ai-search is excluded — it's read-only Q&A, not a write, and works
// fine in the demo.
const EXCLUDED_PREFIXES = ['/api/ai-search']

export default function DemoFetchGuard() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url

      const isApiWrite = url.startsWith('/api/') && method !== 'GET' && !EXCLUDED_PREFIXES.some(p => url.startsWith(p))

      if (isApiWrite && isDemoRoute()) {
        notifyDemoBlocked()
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'This is a demo — sign up to make changes' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      }

      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
