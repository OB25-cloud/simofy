'use client'

// Client-side half of demo read-only enforcement. lib/supabase.ts wraps
// every mutating call (.insert/.update/.upsert/.delete/.rpc/.storage) with
// guardMutation() below; DemoFetchGuard (app/components/DemoFetchGuard.tsx)
// covers the handful of mutations that go through a Route Handler instead
// of the Supabase client directly (the /api/admin/* endpoints). Both funnel
// into the same DEMO_BLOCK_EVENT so there's exactly one toast implementation
// (DemoWriteToast) for "you tried to change something in the demo".
export const DEMO_BLOCK_EVENT = 'operify:demo-write-blocked'

export function isDemoRoute(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')
}

export function notifyDemoBlocked() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(DEMO_BLOCK_EVENT))
}

// An infinitely-chainable, always-thenable no-op standing in for a
// PostgREST query/storage builder. Callers commonly chain further methods
// after a mutation (.insert(...).select().single(), .update(...).eq(...))
// before awaiting — every property access returns the same stub so any
// chain shape resolves, and awaiting it resolves to an empty-but-successful
// response so callers that only branch on `error` don't treat a blocked
// demo write as a failure requiring their own error UI.
function createNoopBuilder(): unknown {
  const target = () => {}
  const handler: ProxyHandler<typeof target> = {
    get(_t, prop) {
      if (prop === 'then') {
        return (resolve: (v: { data: null; error: null; count: null }) => void) =>
          resolve({ data: null, error: null, count: null })
      }
      if (prop === 'catch' || prop === 'finally') return () => proxy
      return () => proxy
    },
    apply() {
      return proxy
    },
  }
  const proxy: unknown = new Proxy(target, handler)
  return proxy
}

// Wraps a mutating Supabase call: on a /demo route, shows the toast and
// returns a no-op stand-in instead of calling `run`; otherwise calls
// `run()` straight through, completely unchanged for the real app.
export function guardMutation<T>(run: () => T): T {
  if (isDemoRoute()) {
    notifyDemoBlocked()
    return createNoopBuilder() as T
  }
  return run()
}
