export default function StatCard({
  label, value, sub, accent, danger,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  danger?: boolean
}) {
  const color = danger ? '#dc2626' : accent ? '#C9A84C' : '#111827'
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-[#6B7280]">{sub}</p>}
    </div>
  )
}
