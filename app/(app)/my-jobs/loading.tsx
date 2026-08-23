export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="h-7 w-28 bg-[#E5E7EB] rounded animate-pulse mb-2" />
        <div className="h-4 w-44 bg-[#E5E7EB] rounded animate-pulse" />
      </div>

      {/* Upcoming group */}
      <div className="mb-6">
        <div className="h-3 w-32 bg-[#E5E7EB] rounded animate-pulse mb-3" />
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-5 py-4 ${i > 0 ? 'border-t border-[#F4F5F7]' : ''}`}
            >
              <div>
                <div className="h-3.5 w-40 bg-[#E5E7EB] rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-[#E5E7EB] rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-[#E5E7EB] rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Past group */}
      <div>
        <div className="h-3 w-14 bg-[#E5E7EB] rounded animate-pulse mb-3" />
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-5 py-4 opacity-60 ${i > 0 ? 'border-t border-[#F4F5F7]' : ''}`}
            >
              <div>
                <div className="h-3.5 w-36 bg-[#E5E7EB] rounded animate-pulse mb-2" />
                <div className="h-3 w-28 bg-[#E5E7EB] rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-[#E5E7EB] rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
