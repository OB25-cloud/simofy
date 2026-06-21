const CACHE = 'simofy-v2'

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(['/']))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  // Static assets: cache-first
  if (url.pathname.startsWith('/_next/static/') || /\.(png|jpg|jpeg|svg|gif|ico|webp|woff|woff2|ttf)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          const clone = response.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // Pages and RSC/data requests for client-side navigation: always go to the
  // network. These responses can reference hashed JS chunk filenames that are
  // only valid for the build that's currently live — caching them and serving
  // them back after a new deploy ships (network hiccup, or just an old tab
  // left open) makes the page request chunks the server no longer has,
  // crashing the React tree with no way to recover short of a hard refresh.
  event.respondWith(fetch(request))
})
