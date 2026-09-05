function Block({ className = '' }: { className?: string }) {
  return <div className={['bg-line rounded animate-pulse', className].join(' ')} />
}

function CardShell({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <div className={['bg-white rounded-xl border border-line shadow-card', className].join(' ')}>{children}</div>
}

export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto">
      {/* Hero */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Block className="h-3 w-40 mb-3" />
          <Block className="h-8 w-64 mb-3" />
          <div className="flex gap-2">
            <Block className="h-7 w-28 rounded-full" />
            <Block className="h-7 w-32 rounded-full" />
            <Block className="h-7 w-24 rounded-full" />
          </div>
        </div>
        <div className="hidden sm:flex gap-2">
          <Block className="h-9 w-24 rounded-lg" />
          <Block className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* AI bar */}
      <div className="rounded-2xl bg-charcoal h-[150px] mb-6 animate-pulse" />

      {/* Hero metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        <CardShell className="lg:col-span-4 p-5 h-[168px]"><Block className="h-3 w-28 mb-5" /><Block className="h-9 w-40 mb-4" /><Block className="h-3 w-48" /></CardShell>
        <CardShell className="lg:col-span-4 p-5 h-[168px]"><Block className="h-3 w-28 mb-5" /><Block className="h-9 w-40 mb-4" /><Block className="h-3 w-48" /></CardShell>
        <div className="lg:col-span-4 grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardShell key={i} className="p-4"><Block className="h-3 w-20 mb-3" /><Block className="h-6 w-14" /></CardShell>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      <CardShell className="p-5 mb-6"><Block className="h-3 w-32 mb-4" /><Block className="h-[88px] w-full rounded-lg" /></CardShell>

      {/* Today + crew */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        <CardShell className="lg:col-span-8 h-[300px]" />
        <CardShell className="lg:col-span-4 h-[300px]" />
      </div>

      {/* Chart + insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <CardShell className="lg:col-span-7 h-[300px]" />
        <CardShell className="lg:col-span-5 h-[300px]" />
      </div>
    </div>
  )
}
