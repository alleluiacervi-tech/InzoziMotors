import { HeaderSkeleton } from '@/components/dashboard/LoadingBlock'
import { Skeleton } from '@/components/ui'

export default function LoadingProfile() {
  return (
    <div aria-busy="true" aria-label="Loading your profile">
      <HeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <div className="space-y-6">
          <Skeleton className="h-44" />
          <Skeleton className="h-80" />
        </div>
      </div>
    </div>
  )
}
