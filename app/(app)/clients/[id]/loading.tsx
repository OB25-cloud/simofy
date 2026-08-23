export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="h-4 w-28 bg-[#E5E7EB] rounded animate-pulse mb-6" />
      <div className="h-7 w-52 bg-[#E5E7EB] rounded animate-pulse mb-1" />
      <div className="h-4 w-36 bg-[#E5E7EB] rounded animate-pulse mb-8" />
      <div className="grid grid-cols-2 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 space-y-4">
          <div className="h-3 w-24 bg-[#E5E7EB] rounded animate-pulse" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-2.5 w-12 bg-[#E5E7EB] rounded animate-pulse" />
                <div className="h-4 w-40 bg-[#E5E7EB] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 space-y-4">
          <div className="h-3 w-16 bg-[#E5E7EB] rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-3.5 w-full bg-[#E5E7EB] rounded animate-pulse" />
            <div className="h-3.5 w-4/5 bg-[#E5E7EB] rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="h-5 w-24 bg-[#E5E7EB] rounded animate-pulse mb-4" />
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="h-10 bg-[#F4F5F7] border-b border-[#E5E7EB]" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-12 border-b border-[#F4F5F7] px-5 flex items-center gap-6"
          >
            <div className="h-3.5 w-32 bg-[#E5E7EB] rounded animate-pulse" />
            <div className="h-5 w-24 bg-[#E5E7EB] rounded-full animate-pulse" />
            <div className="h-3.5 w-20 bg-[#E5E7EB] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
