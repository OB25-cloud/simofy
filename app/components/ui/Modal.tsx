'use client'

import React from 'react'

export interface ModalShellProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}

// Shared modal chrome: dark overlay, white rounded-xl panel, sticky header with title + close.
// Callers render their own <form> (with footer buttons) as children.
export default function ModalShell({ title, onClose, children, maxWidth = 'sm:max-w-lg' }: ModalShellProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-white w-full h-full sm:h-auto ${maxWidth} sm:rounded-xl sm:max-h-[90vh] shadow-2xl overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-[#1A1A2E]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1A1A2E] transition-colors p-3.5 -m-3.5 md:p-0 md:m-0"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
