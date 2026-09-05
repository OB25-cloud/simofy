'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="en">
      <body className="h-full antialiased">
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: 'var(--page-bg)' }}>
          <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-ink">Runsite hit an unexpected error</p>
            <p className="mt-2 text-sm text-ink-muted">
              Try reloading the page. If this keeps happening, let us know what you were doing.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={reset}
                className="px-4 py-3 sm:py-2 text-sm font-medium text-white font-semibold rounded-md transition-[filter] hover:brightness-110"
                style={{ background: 'var(--accent)' }}
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-3 sm:py-2 text-sm font-medium bg-white border border-line text-ink rounded-md hover:bg-surface-muted transition-colors"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
