import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padded?: boolean
}

// Standard light card: bg-white rounded-xl border border-[#E5E7EB] shadow-sm.
export default function Card({ hover = false, padded = true, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-xl border border-[#E5E7EB] shadow-sm',
        padded ? 'p-6' : '',
        hover ? 'transition-shadow duration-200 hover:shadow-md' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

// Dark panel for charts/reports: bg-[#1A1A2E] rounded-xl p-6, light text.
export function DarkPanel({ padded = true, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-[#1A1A2E] rounded-xl text-[#F5F5F5]',
        padded ? 'p-6' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
