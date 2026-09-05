'use client'

import type React from 'react'

export type Insight = { icon: React.ReactNode; text: string; positive?: boolean; negative?: boolean }

function tone(insight: Insight) {
  if (insight.negative) return { tile: 'bg-red-50 text-red-600', dot: '#ef4444' }
  if (insight.positive) return { tile: 'bg-accent-soft text-accent', dot: 'var(--accent)' }
  return { tile: 'bg-surface-muted text-ink-muted', dot: '#9ca3af' }
}

// Light insight list: each row gets a tinted icon tile and a status dot so the
// owner can scan good / neutral / needs-attention at a glance.
export default function AiInsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden h-full flex flex-col">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-line-soft">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent text-white shadow-[0_1px_2px_rgba(17,24,39,0.15)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.7L19.5 9.5l-5.7 1.8L12 17l-1.8-5.7L4.5 9.5l5.7-1.8z"/><path d="M19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" opacity=".6"/></svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-ink leading-tight">AI Insights</p>
          <p className="text-[11px] text-ink-faint leading-tight mt-0.5">Refreshed just now</p>
        </div>
      </div>
      <ul className="divide-y divide-line-soft flex-1">
        {insights.map((insight, i) => {
          const t = tone(insight)
          return (
            <li key={i} className="flex items-start gap-3 px-5 py-3">
              <span className={['shrink-0 flex items-center justify-center w-7 h-7 rounded-lg [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:stroke-current', t.tile].join(' ')}>
                {insight.icon}
              </span>
              <p className="text-[13px] leading-relaxed text-ink pt-0.5 flex-1">{insight.text}</p>
              <span aria-hidden className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.dot }} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
