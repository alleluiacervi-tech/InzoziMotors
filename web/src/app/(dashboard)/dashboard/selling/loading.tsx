import { HeaderSkeleton, RowsSkeleton } from '@/components/dashboard/LoadingBlock'

export default function LoadingSelling() {
  return (
    <div aria-busy="true" aria-label="Loading your cars">
      <HeaderSkeleton />
      <RowsSkeleton count={2} height="h-56" />
    </div>
  )
}
