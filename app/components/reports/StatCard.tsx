export default function StatCard({
  label, value, sub, accent, danger,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  danger?: boolean
}) {
  const color = danger ? '#dc2626' : accent ? '#B8922A' : '#111827'
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}
