import { HeaderSkeleton, RowsSkeleton } from '@/components/dashboard/LoadingBlock'

export default function LoadingNotifications() {
  return (
    <div aria-busy="true" aria-label="Loading your notifications">
      <HeaderSkeleton />
      <RowsSkeleton count={3} height="h-32" />
    </div>
  )
}
