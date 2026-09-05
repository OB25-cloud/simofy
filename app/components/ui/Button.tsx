import React from 'react'

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost'
type Size = 'sm' | 'md'

// Operify buttons — see globals.css for the tokens behind these classes.
//   primary:     solid forest green, white text, brightness shift on hover
//   secondary:   white, hairline border, ink text
//   destructive: solid red
//   ghost:       borderless, muted text (toolbar / inline actions)
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-accent text-white font-semibold shadow-[0_1px_2px_rgba(17,24,39,0.12)] hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100',
  secondary:
    'bg-surface border border-line text-ink font-medium shadow-[0_1px_2px_rgba(17,24,39,0.04)] hover:bg-surface-muted hover:border-[#d6d3d1] disabled:opacity-50 disabled:cursor-not-allowed',
  destructive:
    'bg-error text-white font-semibold hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-ink-muted font-medium hover:bg-surface-muted hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-1.5 rounded-lg transition-[background-color,border-color,filter,color] duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1'

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
      className={[BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className].join(' ')}
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
      className={[BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className].join(' ')}
      {...props}
    />
  )
}
