'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Point = { month: string; revenue: number }

const axisFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency', currency: 'NZD', notation: 'compact', maximumFractionDigits: 1,
})
const tooltipFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency', currency: 'NZD', maximumFractionDigits: 0,
})

export default function RevenueTrendChart({ data }: { data: Point[] }) {
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
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgba(184,146,42,0.1)" vertical={false} />
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
              contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(184,146,42,0.3)', borderRadius: 8 }}
              labelStyle={{ color: '#B8922A', fontWeight: 600 }}
              itemStyle={{ color: '#fff' }}
              formatter={(value) => [tooltipFormatter.format(Number(value)), 'Revenue']}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#B8922A"
              strokeWidth={2.5}
              dot={{ fill: '#B8922A', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#B8922A' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
