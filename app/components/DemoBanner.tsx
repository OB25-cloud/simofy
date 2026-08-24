'use client'

import { useEffect, useState } from 'react'

const DISMISS_KEY = 'operify-demo-banner-dismissed'
// Real, fixed height (not measured) so app/(app)/schedule/page.tsx's
// viewport-height math can subtract exactly this via the
// --demo-banner-h CSS var — see globals.css.
const BANNER_HEIGHT_PX = 36

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
      className="shrink-0 w-full flex items-center justify-center gap-3 px-4 text-center"
      style={{ height: BANNER_HEIGHT_PX, background: '#C9A84C', color: '#1A1A2E' }}
    >
      <p className="text-xs font-medium truncate">
        You&apos;re viewing the Operify demo — Green &amp; Co Landscaping{' '}
        <span className="hidden sm:inline">
          | Book a free demo:{' '}
          <a href="https://barrassai.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">
            barrassai.com
          </a>
        </span>
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss demo banner"
        className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full hover:bg-black/10 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
