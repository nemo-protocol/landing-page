import { cn } from "@/lib/utils"

interface MarketSkeletonProps {
  className?: string
}

const MarketSkeleton = ({ className }: MarketSkeletonProps) => {
  return (
    <div className={cn("border border-white/10 rounded-3xl", className)}>
      <div className="p-5 rounded-3xl bg-[#0E0F16]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-y-2.5 items-start">
            <div className="h-6 w-24 bg-white/5 rounded-md animate-pulse"></div>
            <div className="h-8 w-32 bg-white/5 rounded-full animate-pulse"></div>
          </div>
          <div className="size-14 rounded-full bg-white/5 animate-pulse"></div>
        </div>
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-16 bg-white/5 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="h-4 w-12 bg-white/5 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-white/5 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="mt-3.5">
          <div className="h-4 w-16 bg-white/5 rounded mb-2.5 animate-pulse"></div>
          <div className="grid grid-cols-2 gap-x-4">
            <div className="h-14 bg-white/5 rounded-xl animate-pulse"></div>
            <div className="h-14 bg-white/5 rounded-xl animate-pulse"></div>
          </div>
        </div>
        <div className="mt-3.5">
          <div className="h-4 w-12 bg-white/5 rounded mb-2.5 animate-pulse"></div>
          <div className="h-14 bg-white/5 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

export default MarketSkeleton 