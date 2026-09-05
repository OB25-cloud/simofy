// Light stat card used by the report tabs' small metric rows.
export default function StatCard({
  label, value, sub, accent, danger,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  danger?: boolean
}) {
  return (
    <div className="relative bg-surface rounded-xl border border-line shadow-card px-4 py-3 overflow-hidden">
      <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', danger ? 'bg-error' : accent ? 'bg-accent' : 'bg-line'].join(' ')} />
      <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-[0.1em]">{label}</p>
      <p className={['mt-1.5 text-[22px] font-bold tracking-tight tabular-nums leading-none truncate', danger ? 'text-error' : 'text-ink'].join(' ')}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-ink-muted truncate">{sub}</p>}
    </div>
  )
}
