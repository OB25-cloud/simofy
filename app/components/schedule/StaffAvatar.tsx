import { colorForStaff } from './scheduleColors'
import { initials } from './scheduleDates'

interface Props {
  staffId: string | null | undefined
  name: string | null | undefined
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

const SIZE: Record<NonNullable<Props['size']>, string> = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
}

// Initials circle, colour-coded per staff member (stable across the app —
// same hue as the dashboard crew list). Unassigned renders a dashed ring.
export default function StaffAvatar({ staffId, name, size = 'md', className = '' }: Props) {
  const color = colorForStaff(staffId)
  if (!staffId) {
    return (
      <span
        className={`${SIZE[size]} rounded-full flex items-center justify-center font-bold text-ink-faint border border-dashed border-ink-faint/60 bg-surface-muted shrink-0 ${className}`}
        aria-hidden
      >
        ?
      </span>
    )
  }
  return (
    <span
      className={`${SIZE[size]} rounded-full flex items-center justify-center font-bold text-white shrink-0 ring-2 ring-white shadow-[0_0_0_1px_rgba(17,24,39,0.06)] ${className}`}
      style={{ background: color.solid }}
      title={name ?? undefined}
    >
      {initials(name)}
    </span>
  )
}
