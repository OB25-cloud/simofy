import Link from 'next/link'
import DemoBanner from '@/app/components/DemoBanner'

export const metadata = {
  title: 'Operify Demo — See It In Action',
}

export default function DemoLandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F4F5F7' }}>
      <DemoBanner />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <span
            className="text-3xl font-bold tracking-[0.3em]"
            style={{ color: '#C9A84C' }}
          >
            OPERIFY
          </span>

          <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] px-8 py-10 mt-8">
            <h1 className="text-xl font-bold text-[#1A1A2E]">See Operify in action</h1>
            <p className="mt-3 text-sm text-[#6B7280] leading-relaxed">
              A live demo of a real field service management platform — no login required.
            </p>

            <Link
              href="/demo/dashboard"
              className="mt-7 w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-[#1A1A2E] rounded-md transition-opacity hover:opacity-90"
              style={{ background: '#C9A84C' }}
            >
              View Demo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <p className="mt-6 text-xs text-[#6B7280]">
            Want this for your business? <a href="https://barrassai.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:opacity-80" style={{ color: '#C9A84C' }}>barrassai.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
