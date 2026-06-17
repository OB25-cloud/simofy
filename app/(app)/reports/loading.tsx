export default function Loading() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="h-3 w-14 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-7 w-32 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-56 bg-gray-100 rounded animate-pulse" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 border-b border-gray-100 mb-6 pb-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-white p-4">
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mb-3" />
            <div className="h-7 w-16 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Dark chart card */}
      <div className="rounded-xl overflow-hidden mb-5" style={{ background: '#111' }}>
        <div className="flex items-center px-6 py-4 border-b" style={{ borderColor: 'rgba(184,146,42,0.2)' }}>
          <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'rgba(184,146,42,0.2)' }} />
        </div>
        <div className="px-4 py-4" style={{ height: 260 }}>
          <div className="w-full h-full rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>

      {/* Two more dark chart cards */}
      <div className="grid grid-cols-2 gap-5">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden" style={{ background: '#111' }}>
            <div className="flex items-center px-6 py-4 border-b" style={{ borderColor: 'rgba(184,146,42,0.2)' }}>
              <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'rgba(184,146,42,0.2)' }} />
            </div>
            <div className="px-4 py-4" style={{ height: 280 }}>
              <div className="w-full h-full rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
