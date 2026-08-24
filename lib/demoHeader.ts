import { headers } from 'next/headers'

// Set by proxy.ts on every request rewritten from /demo/* — read by
// app/(app)/layout.tsx and the handful of pages that do their own
// auth-redirect (reports, my-jobs, settings/*) to skip the login gate
// without needing a real session.
export const DEMO_HEADER = 'x-operify-demo'

export async function isDemoRequest(): Promise<boolean> {
  const h = await headers()
  return h.get(DEMO_HEADER) === '1'
}
