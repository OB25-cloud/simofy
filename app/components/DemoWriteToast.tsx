'use client'

import { useEffect, useRef, useState } from 'react'
import { DEMO_BLOCK_EVENT } from '@/lib/demoGuard'

// Global toast for "you tried to create/edit/delete something in the demo".
// Mounted once by app/(app)/layout.tsx's demo branch (and the /demo landing
// page) so it catches every blocked write regardless of which modal/button
// triggered it — see lib/demoGuard.ts and app/components/DemoFetchGuard.tsx
// for the two places that dispatch DEMO_BLOCK_EVENT.
export default function DemoWriteToast() {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleBlocked() {
      setVisible(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(false), 3500)
    }
    window.addEventListener(DEMO_BLOCK_EVENT, handleBlocked)
    return () => {
      window.removeEventListener(DEMO_BLOCK_EVENT, handleBlocked)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      <div
        className="flex items-center gap-3 pl-4 pr-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white"
        style={{ background: '#1A1A2E' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>This is a demo — sign up to make changes</span>
      </div>
    </div>
  )
}
