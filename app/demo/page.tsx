import Link from 'next/link'
import DemoBanner from '@/app/components/DemoBanner'

export const metadata = {
  title: 'Runsite Demo — See It In Action',
}

export default function DemoLandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--page-bg)' }}>
      <DemoBanner />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <span
            className="text-3xl font-bold tracking-[0.3em]"
            style={{ color: 'var(--accent)' }}
          >
            RUNSITE
          </span>

          <div className="bg-white rounded-xl shadow-sm border border-line px-8 py-10 mt-8">
            <h1 className="text-xl font-bold text-ink">See Runsite in action</h1>
            <p className="mt-3 text-sm text-ink-muted leading-relaxed">
              A live demo of a real field service management platform — no login required.
            </p>

            <Link
              href="/demo/dashboard"
              className="mt-7 w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-md transition-[filter] hover:brightness-110"
              style={{ background: 'var(--accent)' }}
            >
              View Demo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <p className="mt-6 text-xs text-ink-muted">
            Want this for your business? <a href="https://barrassai.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:opacity-80" style={{ color: 'var(--accent)' }}>barrassai.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
