import { Skeleton } from '@/components/ui'

// Shared loading scaffolding. Each route's loading.tsx composes these so a
// slow VPS shows the shape of the answer rather than a blank column.

export function HeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
    </div>
  )
}

export function TileGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[124px]" />
      ))}
    </div>
  )
}

export function RowsSkeleton({ count = 3, height = 'h-24' }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={height} />
      ))}
    </div>
  )
}
