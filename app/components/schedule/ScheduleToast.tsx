'use client'

export type ToastState = { message: string; undo?: () => void; error?: boolean }

export default function ScheduleToast({ toast }: { toast: ToastState }) {
  return (
    <div className="fixed bottom-6 right-6 z-[90] page-fade-in">
      <div
        className="flex items-center gap-3 pl-4 pr-2 py-3 rounded-lg shadow-lg text-sm font-medium text-white"
        style={{ background: 'var(--charcoal)' }}
      >
        {toast.error ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-bright)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        <span className="pr-2">{toast.message}</span>
        {toast.undo && (
          <button
            onClick={toast.undo}
            className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-md hover:bg-white/10 transition-colors"
            style={{ color: 'var(--accent-bright)' }}
          >
            Undo
          </button>
        )}
      </div>
    </div>
  )
}
