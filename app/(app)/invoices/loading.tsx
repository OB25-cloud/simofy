export default function Loading() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-24 bg-[#E5E7EB] rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-[#E5E7EB] rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-[#E5E7EB] rounded animate-pulse" />
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
            <div className="h-3 w-24 bg-[#E5E7EB] rounded animate-pulse mb-3" />
            <div className="h-7 w-20 bg-[#E5E7EB] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-5">
        <div className="h-10 flex-1 bg-[#E5E7EB] rounded-lg animate-pulse" />
        <div className="h-10 w-44 bg-[#E5E7EB] rounded-lg animate-pulse" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="h-10 bg-[#F4F5F7] border-b border-[#E5E7EB]" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 border-b border-[#F4F5F7] px-5 flex items-center gap-5">
            <div className="h-3.5 w-24 bg-[#E5E7EB] rounded animate-pulse" />
            <div className="h-3.5 w-28 bg-[#E5E7EB] rounded animate-pulse" />
            <div className="h-3.5 w-32 bg-[#E5E7EB] rounded animate-pulse" />
            <div className="h-5 w-16 bg-[#E5E7EB] rounded-full animate-pulse" />
            <div className="h-3.5 w-16 bg-[#E5E7EB] rounded animate-pulse" />
            <div className="h-3.5 w-20 bg-[#E5E7EB] rounded animate-pulse" />
            <div className="h-3.5 w-20 bg-[#E5E7EB] rounded animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
