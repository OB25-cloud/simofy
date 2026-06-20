export default function Loading() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-44 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-white p-4">
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mb-3" />
            <div className="h-7 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-5">
        <div className="h-10 flex-1 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-10 w-44 bg-gray-100 rounded-lg animate-pulse" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-50 border-b border-gray-100" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 border-b border-gray-50 px-5 flex items-center gap-5">
            <div className="h-3.5 w-28 bg-gray-100 rounded animate-pulse" />
            <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3.5 w-16 bg-gray-100 rounded animate-pulse ml-auto" />
            <div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
