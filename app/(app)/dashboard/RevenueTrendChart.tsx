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

interface Props {
  data: Point[]
  title?: string
  periodLabel?: string
}

export default function RevenueTrendChart({ data, title = 'Revenue Trend', periodLabel = 'last 6 months' }: Props) {
  const maxRevenue = data.length > 0 ? Math.max(...data.map(p => p.revenue)) : null

  function renderDot(props: DotRenderProps) {
    const { cx, cy, payload } = props
    if (cx == null || cy == null || !payload || maxRevenue == null || payload.revenue !== maxRevenue) {
      return <g key={`dot-${cx}-${cy}`} />
    }
    return (
      <g key={`peak-${cx}-${cy}`}>
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          letterSpacing={0.6}
          fill="#C9A84C"
        >
          PEAK
        </text>
        <circle cx={cx} cy={cy} r={6} fill="#C9A84C" stroke="#1A1A2E" strokeWidth={2} />
      </g>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#1A1A2E', boxShadow: '0 0 0 1px rgba(201, 168, 76,0.15), 0 4px 24px rgba(0,0,0,0.4)' }}
    >
      <div className="flex items-center gap-2.5 px-6 py-4 border-b" style={{ borderColor: 'rgba(201, 168, 76,0.2)' }}>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#C9A84C' }}>{title}</span>
        <span className="ml-auto text-[10px]" style={{ color: 'rgba(201, 168, 76,0.4)' }}>{periodLabel}</span>
      </div>
      <div className="px-4 py-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 24, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2a2a2a" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(201, 168, 76,0.2)' }}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => axisFormatter.format(v)}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: '#1A1A2E',
                border: '1px solid rgba(201, 168, 76,0.3)',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
              labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: 2 }}
              itemStyle={{ color: '#C9A84C', fontWeight: 600 }}
              formatter={(value) => [tooltipFormatter.format(Number(value)), 'Revenue']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#C9A84C"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
              dot={renderDot}
              activeDot={{ r: 6, fill: '#C9A84C', stroke: '#1A1A2E', strokeWidth: 2 }}
              style={{ filter: 'drop-shadow(0 0 6px rgba(201, 168, 76,0.5))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
