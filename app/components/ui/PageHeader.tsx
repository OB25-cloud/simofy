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
        <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
