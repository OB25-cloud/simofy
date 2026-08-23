import React from 'react'

type Variant = 'primary' | 'secondary' | 'destructive'
type Size = 'sm' | 'md'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-[#C9A84C] text-[#1A1A2E] font-semibold hover:bg-[#B8963F] disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-white border border-[#E5E7EB] text-[#1A1A2E] hover:bg-[#F4F5F7] disabled:opacity-50 disabled:cursor-not-allowed',
  destructive:
    'bg-[#EF4444] text-white font-semibold hover:bg-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors duration-150 whitespace-nowrap',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
      {...props}
    />
  )
}

// Same visual system, rendered as a Link (or any anchor-like element) for navigation actions.
export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: { variant?: Variant; size?: Size } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors duration-150 whitespace-nowrap',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
      {...props}
    />
  )
}
