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
          <div className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-[#1A1A2E]">Simofy hit an unexpected error</p>
            <p className="mt-2 text-sm text-gray-500">
              Try reloading the page. If this keeps happening, let us know what you were doing.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={reset}
                className="px-4 py-3 sm:py-2 text-sm font-medium text-[#1A1A2E] font-semibold rounded-md transition-opacity hover:opacity-90"
                style={{ background: '#C9A84C' }}
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-3 sm:py-2 text-sm font-medium bg-white border border-[#E5E7EB] text-[#1A1A2E] rounded-md hover:bg-[#F4F5F7] transition-colors"
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
