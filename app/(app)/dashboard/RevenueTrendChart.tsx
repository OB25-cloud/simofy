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

export default function RevenueTrendChart({ data }: { data: Point[] }) {
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
          fill="#B8922A"
        >
          PEAK
        </text>
        <circle cx={cx} cy={cy} r={6} fill="#B8922A" stroke="#1a1a1a" strokeWidth={2} />
      </g>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#111', boxShadow: '0 0 0 1px rgba(184,146,42,0.15), 0 4px 24px rgba(0,0,0,0.4)' }}
    >
      <div className="flex items-center gap-2.5 px-6 py-4 border-b" style={{ borderColor: 'rgba(184,146,42,0.2)' }}>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#B8922A' }}>Revenue Trend</span>
        <span className="ml-auto text-[10px]" style={{ color: 'rgba(184,146,42,0.4)' }}>last 6 months</span>
      </div>
      <div className="px-4 py-4" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 24, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B8922A" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#B8922A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2a2a2a" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(184,146,42,0.2)' }}
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
                background: '#1a1a1a',
                border: '1px solid rgba(184,146,42,0.3)',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
              labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: 2 }}
              itemStyle={{ color: '#B8922A', fontWeight: 600 }}
              formatter={(value) => [tooltipFormatter.format(Number(value)), 'Revenue']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#B8922A"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
              dot={renderDot}
              activeDot={{ r: 6, fill: '#B8922A', stroke: '#1a1a1a', strokeWidth: 2 }}
              style={{ filter: 'drop-shadow(0 0 6px rgba(184,146,42,0.5))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
