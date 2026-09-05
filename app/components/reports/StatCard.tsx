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
    <div className="relative bg-surface rounded-xl border border-line shadow-card p-4 overflow-hidden">
      {(accent || danger) && (
        <span aria-hidden className={['absolute inset-y-0 left-0 w-[3px]', danger ? 'bg-error' : 'bg-accent'].join(' ')} />
      )}
      <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-[0.1em] mb-1.5">{label}</p>
      <p className={['text-2xl font-bold tracking-tight tabular-nums leading-none', danger ? 'text-error' : 'text-ink'].join(' ')}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-ink-muted">{sub}</p>}
    </div>
  )
}
