import React from 'react'

export interface PageHeaderProps {
  title: string
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

// Page header: title + subtitle stacked left, primary action right.
export default function PageHeader({ title, subtitle, action, className = '' }: PageHeaderProps) {
  return (
    <div className={['flex items-start sm:items-center justify-between gap-4 flex-wrap mb-8', className].join(' ')}>
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{title}</h1>
        {subtitle && <p className="text-xs text-[#6B7280] mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
