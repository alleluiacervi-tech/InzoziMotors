import {
  HeaderSkeleton,
  RowsSkeleton,
  TileGridSkeleton,
} from '@/components/dashboard/LoadingBlock'

export default function LoadingOverview() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard">
      <HeaderSkeleton />
      <TileGridSkeleton />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <RowsSkeleton count={1} height="h-64" />
        <RowsSkeleton count={1} height="h-64" />
      </div>
    </div>
  )
}
