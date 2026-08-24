import { createBrowserClient } from '@supabase/ssr'
import { guardMutation } from './demoGuard'

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
const rawClient =
  globalThis._supabaseBrowserClient ??
  (globalThis._supabaseBrowserClient = makeClient())

// Table/storage mutation methods guarded for demo mode — see lib/demoGuard.ts.
// guardMutation() is a no-op pass-through everywhere outside a /demo route
// (including every server-side read this same client is used for), so this
// changes nothing about the real app's behaviour.
const TABLE_MUTATIONS = new Set(['insert', 'update', 'upsert', 'delete'])
const STORAGE_MUTATIONS = new Set(['upload', 'remove', 'update', 'copy', 'move', 'createSignedUploadUrl'])

function wrapQueryBuilder<T extends object>(builder: T): T {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value === 'function' && TABLE_MUTATIONS.has(prop as string)) {
        return (...args: unknown[]) => guardMutation(() => (value as (...a: unknown[]) => unknown).apply(target, args))
      }
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

function wrapStorageBucket<T extends object>(bucket: T): T {
  return new Proxy(bucket, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value === 'function' && STORAGE_MUTATIONS.has(prop as string)) {
        return (...args: unknown[]) => guardMutation(() => (value as (...a: unknown[]) => unknown).apply(target, args))
      }
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

export const supabase: typeof rawClient = new Proxy(rawClient, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return (table: string) => wrapQueryBuilder(target.from(table))
    }
    if (prop === 'rpc') {
      return (...args: Parameters<typeof rawClient.rpc>) => guardMutation(() => target.rpc(...args))
    }
    if (prop === 'storage') {
      const storage = target.storage
      return new Proxy(storage, {
        get(storageTarget, storageProp, storageReceiver) {
          if (storageProp === 'from') {
            return (bucketId: string) => wrapStorageBucket(storageTarget.from(bucketId))
          }
          const value = Reflect.get(storageTarget, storageProp, storageReceiver)
          return typeof value === 'function' ? value.bind(storageTarget) : value
        },
      })
    }
    const value = Reflect.get(target, prop, receiver)
    return typeof value === 'function' ? value.bind(target) : value
  },
})
