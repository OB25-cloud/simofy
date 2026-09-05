import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padded?: boolean
}

// Standard light card: white surface, rounded-xl, hairline border, soft two-layer shadow.
// This class list is the canonical card recipe; the `card-surface` utility in
// globals.css mirrors it for markup that cannot use this component.
export const CARD_CLASSES = 'bg-surface rounded-xl border border-line shadow-card'

export default function Card({ hover = false, padded = true, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        CARD_CLASSES,
        padded ? 'p-6' : '',
        hover ? 'transition-shadow duration-200 hover:shadow-card-hover' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

// Dark panel for charts/reports: charcoal surface with a faint inner ring, light text.
export function DarkPanel({ padded = true, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-charcoal rounded-xl text-[#F5F5F5] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_16px_-4px_rgba(17,24,39,0.35)]',
        padded ? 'p-6' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
