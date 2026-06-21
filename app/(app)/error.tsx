'use client'

import { useEffect } from 'react'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-20 text-center">
      <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">Something went wrong</p>
        <p className="mt-2 text-sm text-gray-500">
          This section hit an unexpected error. You can try again, or head back to the dashboard.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90"
            style={{ background: '#B8922A' }}
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
