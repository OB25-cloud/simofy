import { createBrowserClient } from '@supabase/ssr'

declare global {
  // eslint-disable-next-line no-var
  var _supabaseBrowserClient: ReturnType<typeof createBrowserClient> | undefined
}

function makeClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Stored on globalThis so HMR module re-evaluation doesn't create a second GoTrueClient instance.
export const supabase =
  globalThis._supabaseBrowserClient ??
  (globalThis._supabaseBrowserClient = makeClient())
