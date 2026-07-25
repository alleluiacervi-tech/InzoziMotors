import { HeaderSkeleton, RowsSkeleton } from '@/components/dashboard/LoadingBlock'
import { Skeleton } from '@/components/ui'

export default function LoadingReferrals() {
  return (
    <div aria-busy="true" aria-label="Loading your referral code">
      <HeaderSkeleton />
      <Skeleton className="h-48" />
      <div className="mt-8">
        <RowsSkeleton count={1} height="h-40" />
      </div>
    </div>
  )
}
