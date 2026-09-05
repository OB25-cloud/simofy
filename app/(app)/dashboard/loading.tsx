export default function Loading() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-32 bg-line rounded animate-pulse mb-2" />
          <div className="h-4 w-44 bg-line rounded animate-pulse" />
        </div>
      </div>

      {/* 5 stat cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-line shadow-sm p-4">
            <div className="h-3 w-24 bg-line rounded animate-pulse mb-3" />
            <div className="h-7 w-16 bg-line rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Revenue + Jobs by Status */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-line shadow-sm p-5">
          <div className="h-4 w-36 bg-line rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-3.5 w-28 bg-line rounded animate-pulse" />
                <div className="h-3.5 w-16 bg-line rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-line shadow-sm p-5">
          <div className="h-4 w-28 bg-line rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-3.5 w-24 bg-line rounded animate-pulse" />
                <div className="h-5 w-8 bg-line rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs Today + Recent Jobs */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-line shadow-sm p-5">
          <div className="h-4 w-24 bg-line rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3.5 w-36 bg-line rounded animate-pulse" />
                <div className="h-3.5 w-20 bg-line rounded animate-pulse ml-auto" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-line shadow-sm p-5">
          <div className="h-4 w-24 bg-line rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3.5 w-36 bg-line rounded animate-pulse" />
                <div className="h-3.5 w-20 bg-line rounded animate-pulse ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overdue invoices table */}
      <div className="mb-4">
        <div className="h-5 w-36 bg-line rounded animate-pulse mb-3" />
        <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
          <div className="h-10 bg-surface-muted border-b border-line" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 border-b border-line-soft px-5 flex items-center gap-6">
              <div className="h-3.5 w-24 bg-line rounded animate-pulse" />
              <div className="h-3.5 w-32 bg-line rounded animate-pulse" />
              <div className="h-3.5 w-20 bg-line rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* New leads table */}
      <div>
        <div className="h-5 w-24 bg-line rounded animate-pulse mb-3" />
        <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
          <div className="h-10 bg-surface-muted border-b border-line" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 border-b border-line-soft px-5 flex items-center gap-6">
              <div className="h-3.5 w-28 bg-line rounded animate-pulse" />
              <div className="h-3.5 w-36 bg-line rounded animate-pulse" />
              <div className="h-3.5 w-20 bg-line rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
