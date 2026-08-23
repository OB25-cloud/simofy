export default function Loading() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-[#E5E7EB] shrink-0">
        <div className="h-3 w-14 bg-[#E5E7EB] rounded animate-pulse mb-2" />
        <div className="h-6 w-44 bg-[#E5E7EB] rounded animate-pulse mb-2" />
        <div className="h-3.5 w-72 bg-[#E5E7EB] rounded animate-pulse" />
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className="w-72 shrink-0 border-r border-[#E5E7EB]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F4F5F7]">
              <div className="w-8 h-8 rounded-full bg-[#E5E7EB] animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-3.5 w-24 bg-[#E5E7EB] rounded animate-pulse mb-1.5" />
                <div className="h-3 w-32 bg-[#E5E7EB] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        {/* Detail */}
        <div className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#E5E7EB] animate-pulse" />
            <div>
              <div className="h-4 w-32 bg-[#E5E7EB] rounded animate-pulse mb-1.5" />
              <div className="h-3 w-40 bg-[#E5E7EB] rounded animate-pulse" />
            </div>
          </div>
          <div className="h-3 w-16 bg-[#E5E7EB] rounded animate-pulse mb-2" />
          <div className="h-9 w-40 bg-[#E5E7EB] rounded-md animate-pulse mb-7" />
          <div className="h-3 w-24 bg-[#E5E7EB] rounded animate-pulse mb-3" />
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="h-9 bg-[#F4F5F7]" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 border-t border-[#F4F5F7]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
