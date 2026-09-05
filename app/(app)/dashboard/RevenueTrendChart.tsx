'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Point = { month: string; revenue: number }

type DotRenderProps = { cx?: number; cy?: number; payload?: Point }

const axisFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency', currency: 'NZD', notation: 'compact', maximumFractionDigits: 1,
})
const tooltipFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency', currency: 'NZD', maximumFractionDigits: 0,
})

const GREEN = '#15803d'

interface Props {
  data: Point[]
  title?: string
  periodLabel?: string
  /** Optional headline rendered in the card header (e.g. 6-month total). */
  headline?: string
}

// Light revenue chart: white card, forest-green line with a soft fill, the
// peak month called out. Animation is off so the line is there on first paint.
export default function RevenueTrendChart({ data, title = 'Revenue Trend', periodLabel = 'last 6 months', headline }: Props) {
  const maxRevenue = data.length > 0 ? Math.max(...data.map(p => p.revenue)) : null

  function renderDot(props: DotRenderProps) {
    const { cx, cy, payload } = props
    if (cx == null || cy == null || !payload || maxRevenue == null || maxRevenue === 0 || payload.revenue !== maxRevenue) {
      return <g key={`dot-${cx}-${cy}`} />
    }
    return (
      <g key={`peak-${cx}-${cy}`}>
        <text x={cx} y={cy - 14} textAnchor="middle" fontSize={9} fontWeight={700} letterSpacing={0.8} fill={GREEN}>
          PEAK
        </text>
        <circle cx={cx} cy={cy} r={5.5} fill={GREEN} stroke="#fff" strokeWidth={2.5} />
      </g>
    )
  }

  return (
    <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line-soft">
        <div>
          <p className="text-sm font-semibold text-ink leading-tight">{title}</p>
          <p className="text-[11px] text-ink-faint leading-tight mt-0.5">{periodLabel}</p>
        </div>
        {headline && (
          <p className="text-lg font-bold tracking-tight tabular-nums text-ink">{headline}</p>
        )}
      </div>
      <div className="px-2 pt-4 pb-2 flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={220}>
          <AreaChart data={data} margin={{ top: 24, right: 20, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GREEN} stopOpacity={0.22} />
                <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#eeece8" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#e7e5e4' }}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => axisFormatter.format(v)}
              width={52}
            />
            <Tooltip
              cursor={{ stroke: '#d6d3d1', strokeDasharray: '3 3' }}
              contentStyle={{
                background: '#fff',
                border: '1px solid #e7e5e4',
                borderRadius: 10,
                boxShadow: '0 8px 24px -8px rgba(17,24,39,0.18)',
                padding: '8px 12px',
              }}
              labelStyle={{ color: '#6b7280', fontWeight: 600, fontSize: 11, marginBottom: 2 }}
              itemStyle={{ color: GREEN, fontWeight: 700, fontSize: 13 }}
              formatter={(value) => [tooltipFormatter.format(Number(value)), 'Revenue']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={GREEN}
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
              dot={renderDot}
              activeDot={{ r: 5, fill: GREEN, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
