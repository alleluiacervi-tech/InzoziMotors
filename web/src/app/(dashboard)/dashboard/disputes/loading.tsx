import { HeaderSkeleton, RowsSkeleton } from '@/components/dashboard/LoadingBlock'

export default function LoadingDisputes() {
  return (
    <div aria-busy="true" aria-label="Loading your disputes">
      <HeaderSkeleton />
      <RowsSkeleton count={1} height="h-64" />
      <div className="mt-10">
        <RowsSkeleton count={2} height="h-32" />
      </div>
    </div>
  )
}
