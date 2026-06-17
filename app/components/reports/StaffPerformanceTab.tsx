'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import ChartCard from './ChartCard'
import { axisTick, axisLine, gridStroke, tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle, moneyFormatter, compactMoneyFormatter, PALETTE } from './chartTheme'
import type { StaffPerfRow } from './types'

export default function StaffPerformanceTab({ data }: { data: StaffPerfRow[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 py-16 text-center">
        <p className="text-sm text-gray-400">No active staff to report on</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ChartCard title="Revenue by Staff" subtitle="last 12 months">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={gridStroke} horizontal={false} />
            <XAxis type="number" tick={axisTick} tickLine={false} axisLine={axisLine} tickFormatter={(v: number) => compactMoneyFormatter.format(v)} />
            <YAxis type="category" dataKey="name" tick={axisTick} tickLine={false} axisLine={false} width={100} />
            <Tooltip
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              formatter={(value) => [moneyFormatter.format(Number(value)), 'Revenue']}
            />
            <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Staff</th>
              <th className="text-right px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Assigned</th>
              <th className="text-right px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Completed</th>
              <th className="text-right px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Revenue</th>
              <th className="text-right px-4 py-3 font-medium text-gray-400 text-xs uppercase tracking-wider">Avg Job Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.name} style={{ borderTop: i === 0 ? undefined : '1px solid #f3f4f6' }}>
                <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{row.jobsAssigned}</td>
                <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{row.jobsCompleted}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">{moneyFormatter.format(row.revenue)}</td>
                <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{moneyFormatter.format(row.avgJobValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
