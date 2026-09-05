import React from 'react'

export interface StatCardProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: React.ReactNode
  trend?: number | null
  danger?: boolean
  /** Key metrics get a 3px green left accent bar. Defaults to true. */
  accent?: boolean
  className?: string
}

// Light stat card: white surface, hairline border, soft shadow, green left accent bar.
// Muted uppercase label, large tabular number, small icon tile top-right.
export function StatCard({ label, value, sub, icon, trend, danger, accent = true, className = '' }: StatCardProps) {
  return (
    <div
      className={[
        'relative bg-surface rounded-xl border border-line shadow-card p-5 overflow-hidden',
        className,
      ].join(' ')}
    >
      {(accent || danger) && (
        <span
          aria-hidden
          className={['absolute inset-y-0 left-0 w-[3px]', danger ? 'bg-error' : 'bg-accent'].join(' ')}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted leading-4 pt-1">
          {label}
        </p>
        {icon && (
          <span
            className={[
              'shrink-0 flex items-center justify-center w-8 h-8 rounded-lg',
              danger ? 'bg-red-50 text-error' : 'bg-accent-soft text-accent',
            ].join(' ')}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={[
          'mt-2 text-[30px] leading-none font-bold tracking-tight tabular-nums',
          danger ? 'text-error' : 'text-ink',
        ].join(' ')}
      >
        {value}
      </p>
      {(sub || trend != null) && (
        <div className="mt-2 flex items-center gap-2 min-h-4">
          {trend != null && (
            <span
              className={[
                'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums px-1.5 py-px rounded-md',
                trend >= 0 ? 'bg-accent-soft text-accent' : 'bg-red-50 text-error',
              ].join(' ')}
            >
              {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
            </span>
          )}
          {sub && <p className="text-xs text-ink-muted truncate">{sub}</p>}
        </div>
      )}
    </div>
  )
}

// Dark stat card (pipeline / dashboard highlight): charcoal surface, green label.
export function DarkStatCard({ label, value, sub, icon, className = '' }: StatCardProps) {
  return (
    <div
      className={[
        'relative bg-charcoal rounded-xl p-5 text-white overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_16px_-4px_rgba(17,24,39,0.35)]',
        className,
      ].join(' ')}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4ade80] leading-4 pt-1">{label}</p>
        {icon && (
          <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.06] text-[#4ade80]">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-[30px] leading-none font-bold tracking-tight tabular-nums text-white">{value}</p>
      {sub && <p className="mt-2 text-xs text-ink-faint">{sub}</p>}
    </div>
  )
}
