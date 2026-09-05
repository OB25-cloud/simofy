import React from 'react'

// Table container: white card surface with hairline border, clipped corners.
export function TableContainer({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={['bg-surface rounded-xl border border-line shadow-card overflow-hidden', className].join(' ')}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

// Table header cell: muted background, small uppercase label, hairline underline.
export const TH_CLASSES =
  'text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted bg-surface-muted border-b border-line'

export function Th({ className = '', children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={[TH_CLASSES, className].join(' ')} {...props}>
      {children}
    </th>
  )
}

// Table row: soft separator, warm hover.
export function Tr({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={['border-b border-line-soft last:border-b-0 hover:bg-surface-hover transition-colors', className].join(' ')} {...props}>
      {children}
    </tr>
  )
}

export function TdPrimary({ className = '', children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={['px-4 py-3 text-sm font-medium text-ink', className].join(' ')} {...props}>
      {children}
    </td>
  )
}

export function TdSecondary({ className = '', children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={['px-4 py-3 text-sm text-ink-muted', className].join(' ')} {...props}>
      {children}
    </td>
  )
}
