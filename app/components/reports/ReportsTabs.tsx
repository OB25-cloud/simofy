'use client'

import { useState } from 'react'
import RevenueTab from './RevenueTab'
import JobsTab from './JobsTab'
import StaffPerformanceTab from './StaffPerformanceTab'
import ProfitabilityTab from './ProfitabilityTab'
import { moneyFormatter, PANEL, PANEL_TOP } from './chartTheme'
import type { RevenueData, JobsStatsData, StaffPerfRow, ProfitabilityData } from './types'

const TABS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'staff', label: 'Staff Performance' },
  { key: 'profitability', label: 'Profitability' },
] as const
type TabKey = (typeof TABS)[number]['key']

interface Props {
  revenue: RevenueData
  jobsStats: JobsStatsData
  staffPerformance: StaffPerfRow[]
  profitability: ProfitabilityData
}

const I = {
  revenue: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  tag: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
  pin: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  margin: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
}

function HeroStat({ label, value, sub, icon, first = false }: { label: string; value: string; sub?: string; icon: React.ReactNode; first?: boolean }) {
  return (
    <div className={['relative px-5 py-4 min-w-0', first ? '' : 'md:border-l'].join(' ')} style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', boxShadow: 'inset 0 0 0 1px rgba(74,222,128,0.25)' }}>{icon}</span>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
      </div>
      <p className={['mt-2.5 font-bold tracking-tight tabular-nums leading-none truncate', first ? 'text-[30px]' : 'text-[24px]'].join(' ')} style={{ color: first ? '#4ade80' : '#fff', textShadow: first ? '0 0 24px rgba(74,222,128,0.35)' : undefined }}>{value}</p>
      <p className="mt-1.5 text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub ?? ''}</p>
    </div>
  )
}

export default function ReportsTabs({ revenue, jobsStats, staffPerformance, profitability }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('revenue')

  const topJobType = revenue.byJobType[0]
  const topLocation = revenue.byLocation[0]
  const jobTypeShare = topJobType && revenue.total > 0 ? Math.round((topJobType.revenue / revenue.total) * 100) : null
  const locationShare = topLocation && revenue.total > 0 ? Math.round((topLocation.revenue / revenue.total) * 100) : null
  const monthsWithRevenue = revenue.byMonth.filter(m => m.revenue > 0).length
  const avgMonthly = monthsWithRevenue > 0 ? revenue.total / monthsWithRevenue : 0

  return (
    <div>
      {/* ── Hero strip — stays across all tabs ── */}
      <div
        className="relative rounded-2xl overflow-hidden mb-5 text-white"
        style={{
          background: `linear-gradient(135deg, ${PANEL_TOP} 0%, ${PANEL} 60%, #121722 100%)`,
          boxShadow: '0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 44px -22px rgba(2,6,23,0.75)',
        }}
      >
        <span aria-hidden className="pointer-events-none absolute -top-28 -left-20 w-[520px] h-[300px] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(74,222,128,0.2), rgba(74,222,128,0) 70%)', filter: 'blur(10px)' }} />
        <span aria-hidden className="pointer-events-none absolute -bottom-32 right-10 w-[420px] h-[260px] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(45,212,191,0.12), rgba(45,212,191,0) 70%)', filter: 'blur(12px)' }} />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, rgba(74,222,128,0) 0%, rgba(74,222,128,0.5) 30%, rgba(74,222,128,0) 70%)' }} />
        <div className="relative grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <HeroStat first icon={I.revenue} label="Total revenue" value={moneyFormatter.format(revenue.total)} sub={avgMonthly > 0 ? `${moneyFormatter.format(avgMonthly)} avg per active month` : 'No paid invoices in window'} />
          <HeroStat icon={I.tag} label="Top job type" value={topJobType?.jobType ?? '—'} sub={topJobType ? `${moneyFormatter.format(topJobType.revenue)} · ${jobTypeShare}% of revenue` : 'No revenue by type yet'} />
          <HeroStat icon={I.pin} label="Top location" value={topLocation?.location ?? '—'} sub={topLocation ? `${moneyFormatter.format(topLocation.revenue)} · ${locationShare}% of revenue` : 'No revenue by location yet'} />
          <HeroStat icon={I.margin} label="Avg margin" value={profitability.avgMargin != null ? `${profitability.avgMargin}%` : '—'} sub={`${jobsStats.completionRate}% completion · ${jobsStats.completed} jobs done`} />
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(17,24,39,0.04)] overflow-x-auto scrollbar-hidden">
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'px-3.5 py-1.5 text-[12.5px] rounded-lg whitespace-nowrap transition-[background-color,color,box-shadow] duration-150',
                  active ? 'bg-charcoal text-white font-semibold shadow-[0_2px_8px_-2px_rgba(17,24,39,0.5)]' : 'text-ink-muted hover:text-ink hover:bg-surface-muted font-medium',
                ].join(' ')}
              >
                {active && <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />}
                {tab.label}
              </button>
            )
          })}
        </div>
        <p className="hidden md:block text-[11px] text-ink-faint">Paid invoices · completed jobs · trailing 12 months</p>
      </div>

      <div key={activeTab} className="tab-fade-in">
        {activeTab === 'revenue' && <RevenueTab data={revenue} />}
        {activeTab === 'jobs' && <JobsTab data={jobsStats} />}
        {activeTab === 'staff' && <StaffPerformanceTab data={staffPerformance} />}
        {activeTab === 'profitability' && <ProfitabilityTab data={profitability} />}
      </div>
    </div>
  )
}
