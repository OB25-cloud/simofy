'use client'

import type React from 'react'

export type Insight = { icon: React.ReactNode; text: string; positive?: boolean; negative?: boolean }

function InsightIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md" style={{ background: 'rgba(74, 222, 128,0.15)' }}>
      {children}
    </span>
  )
}

export default function AiInsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--charcoal)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 4px 16px -4px rgba(17,24,39,0.35)' }}>
      <div className="flex items-center gap-2.5 px-6 py-4 border-b" style={{ borderColor: 'rgba(74, 222, 128,0.2)' }}>
        <span style={{ color: 'var(--accent-bright)', fontSize: '15px', lineHeight: 1 }}>✦</span>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--accent-bright)' }}>AI Insights</span>
        <span className="ml-auto text-[10px]" style={{ color: 'rgba(74, 222, 128,0.4)' }}>refreshed now</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="group relative flex items-start gap-3.5 px-6 py-5 transition-colors duration-150"
            style={{
              borderLeft: '2px solid rgba(74, 222, 128,0.35)',
              background: 'transparent',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(74, 222, 128,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          >
            {i < insights.length - 1 && (
              <span
                className="pointer-events-none absolute bottom-0 left-6 right-6"
                style={{ borderBottom: '1px solid rgba(74, 222, 128,0.18)' }}
              />
            )}
            <InsightIcon>{insight.icon}</InsightIcon>
            <p
              className="text-[13px] leading-relaxed pt-0.5"
              style={{ color: insight.negative ? '#f87171' : insight.positive ? '#86efac' : 'rgba(74, 222, 128,0.9)' }}
            >
              {insight.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
