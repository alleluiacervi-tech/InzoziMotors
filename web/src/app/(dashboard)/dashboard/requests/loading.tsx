import { HeaderSkeleton, RowsSkeleton } from '@/components/dashboard/LoadingBlock'

export default function LoadingRequests() {
  return (
    <div aria-busy="true" aria-label="Loading your requests">
      <HeaderSkeleton />
      <RowsSkeleton count={2} height="h-64 sm:h-52" />
    </div>
  )
}
