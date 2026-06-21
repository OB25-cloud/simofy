'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="en">
      <body className="h-full antialiased">
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: '#fafafa' }}>
          <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-gray-900">Simofy hit an unexpected error</p>
            <p className="mt-2 text-sm text-gray-500">
              Try reloading the page. If this keeps happening, let us know what you were doing.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={reset}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90"
                style={{ background: '#B8922A' }}
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
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
