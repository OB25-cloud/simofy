export default function Loading() {
  return (
    <div className="p-4 md:p-8">
      {/* Header + controls */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="h-7 w-24 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-16 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 w-9 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 w-9 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* 7-column calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
        {/* Day headers */}
        {[...Array(7)].map((_, i) => (
          <div key={i} className="bg-gray-50 px-3 py-2 border-b border-gray-100">
            <div className="h-3 w-8 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-5 w-6 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
        {/* Day columns with job block skeletons */}
        {[...Array(7)].map((_, col) => (
          <div key={col} className="bg-white min-h-[200px] p-2 space-y-2">
            {col % 3 !== 2 && (
              <div className="rounded border-l-[3px] border-gray-200 bg-gray-50 px-2 py-1.5">
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mb-1" />
                <div className="h-2.5 w-14 bg-gray-100 rounded animate-pulse" />
              </div>
            )}
            {col % 2 === 0 && (
              <div className="rounded border-l-[3px] border-gray-200 bg-gray-50 px-2 py-1.5">
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mb-1" />
                <div className="h-2.5 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
