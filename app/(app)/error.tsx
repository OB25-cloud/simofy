'use client'

import { useEffect } from 'react'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-20 text-center">
      <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-ink">Something went wrong</p>
        <p className="mt-2 text-sm text-ink-muted">
          This section hit an unexpected error. You can try again, or head back to the dashboard.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-3 sm:py-2 text-sm font-medium text-white font-semibold rounded-md transition-[filter] hover:brightness-110"
            style={{ background: 'var(--accent)' }}
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="px-4 py-3 sm:py-2 text-sm font-medium bg-white border border-line text-ink rounded-md hover:bg-surface-muted transition-colors"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
