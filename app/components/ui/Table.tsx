import React from 'react'

// Table container: bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden
export function TableContainer({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={['bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden', className].join(' ')}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

// Table header cell: bg-[#F4F5F7] text-xs font-semibold uppercase tracking-wider text-[#6B7280]
export function Th({ className = '', children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={[
        'text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280] bg-[#F4F5F7]',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </th>
  )
}

// Table row: border-b border-[#F4F5F7] hover:bg-[#F9FAFB] transition-colors
export function Tr({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={['border-b border-[#F4F5F7] hover:bg-[#F9FAFB] transition-colors', className].join(' ')} {...props}>
      {children}
    </tr>
  )
}

export function TdPrimary({ className = '', children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={['px-4 py-3 text-sm font-medium text-[#1A1A2E]', className].join(' ')} {...props}>
      {children}
    </td>
  )
}

export function TdSecondary({ className = '', children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={['px-4 py-3 text-sm text-[#6B7280]', className].join(' ')} {...props}>
      {children}
    </td>
  )
}
