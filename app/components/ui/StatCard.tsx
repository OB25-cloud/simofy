import React from 'react'

export interface StatCardProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: React.ReactNode
  trend?: number | null
  danger?: boolean
  className?: string
}

// Light stat card: bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6.
// Value renders gold by default, red when `danger`.
export function StatCard({ label, value, sub, icon, trend, danger, className = '' }: StatCardProps) {
  return (
    <div className={['bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6', className].join(' ')}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{label}</p>
        {icon && (
          <span className="shrink-0" style={{ color: danger ? '#EF4444' : '#C9A84C' }}>
            {icon}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold" style={{ color: danger ? '#EF4444' : '#C9A84C' }}>
        {value}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {sub && <p className="text-xs text-[#6B7280]">{sub}</p>}
        {trend != null && (
          <span
            className="text-xs font-semibold"
            style={{ color: trend >= 0 ? '#22C55E' : '#EF4444' }}
          >
            {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  )
}

// Dark stat card (pipeline / dashboard highlight): bg-[#1A1A2E] rounded-xl p-6 text-white.
export function DarkStatCard({ label, value, sub, icon, className = '' }: StatCardProps) {
  return (
    <div className={['bg-[#1A1A2E] rounded-xl p-6 text-white', className].join(' ')}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C]">{label}</p>
        {icon && <span className="shrink-0 text-[#C9A84C]/70">{icon}</span>}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#9CA3AF]">{sub}</p>}
    </div>
  )
}
