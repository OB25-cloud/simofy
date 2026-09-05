'use client'

import { useEffect, useState } from 'react'

const DISMISS_KEY = 'operify-demo-banner-dismissed'
// Real, fixed height (not measured) so app/(app)/schedule/page.tsx's
// viewport-height math can subtract exactly this via the
// --demo-banner-h CSS var — see globals.css.
const BANNER_HEIGHT_PX = 32

function setBannerHeightVar(px: number) {
  document.documentElement.style.setProperty('--demo-banner-h', `${px}px`)
}

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(true) // default hidden until the sessionStorage check below runs, so a returning-dismissed visitor never sees a flash

  useEffect(() => {
    // sessionStorage isn't available during SSR, so this can't be a lazy useState initializer.
    const alreadyDismissed = sessionStorage.getItem(DISMISS_KEY) === '1'
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(alreadyDismissed)
    setBannerHeightVar(alreadyDismissed ? 0 : BANNER_HEIGHT_PX)
    return () => setBannerHeightVar(0)
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
    setBannerHeightVar(0)
  }

  if (dismissed) return null

  return (
    <div
      className="shrink-0 w-full flex items-center justify-center gap-3 px-4 text-center border-b"
      style={{
        height: BANNER_HEIGHT_PX,
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--sidebar-line)',
        color: 'rgba(255,255,255,0.8)',
      }}
    >
      <span
        className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(74, 222, 128, 0.14)', color: 'var(--accent-bright)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-bright)' }} />
        Demo
      </span>
      <p className="text-xs truncate">
        You&apos;re viewing the Operify demo for Green &amp; Co Landscaping
        <span className="hidden sm:inline">
          {' '}·{' '}
          <a
            href="https://barrassai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 decoration-white/30 hover:decoration-white transition-colors"
            style={{ color: 'var(--accent-bright)' }}
          >
            Book a free demo
          </a>
        </span>
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss demo banner"
        className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
