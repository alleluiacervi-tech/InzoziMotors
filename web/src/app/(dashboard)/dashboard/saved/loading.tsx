import { HeaderSkeleton } from '@/components/dashboard/LoadingBlock'
import { CarCardSkeleton } from '@/components/marketplace/CarCard'
import { Skeleton } from '@/components/ui'

export default function LoadingSaved() {
  return (
    <div aria-busy="true" aria-label="Loading your saved cars">
      <HeaderSkeleton />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <CarCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="mt-10 h-40" />
    </div>
  )
}
