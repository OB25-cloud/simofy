'use client'

import { useState } from 'react'
import RevenueTab from './RevenueTab'
import JobsTab from './JobsTab'
import StaffPerformanceTab from './StaffPerformanceTab'
import ProfitabilityTab from './ProfitabilityTab'
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

export default function ReportsTabs({ revenue, jobsStats, staffPerformance, profitability }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('revenue')

  return (
    <div>
      <div className="border-b border-gray-100 mb-6">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-4 pb-3 text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  color: active ? '#B8922A' : '#9ca3af',
                  borderBottom: active ? '2px solid #B8922A' : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === 'revenue' && <RevenueTab data={revenue} />}
      {activeTab === 'jobs' && <JobsTab data={jobsStats} />}
      {activeTab === 'staff' && <StaffPerformanceTab data={staffPerformance} />}
      {activeTab === 'profitability' && <ProfitabilityTab data={profitability} />}
    </div>
  )
}
