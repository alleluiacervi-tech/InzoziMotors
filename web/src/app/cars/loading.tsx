import { Container, Skeleton } from '@/components/ui'
import { CarCardSkeleton } from '@/components/marketplace/CarCard'

// The skeleton mirrors the real grid's geometry, so the page does not jump when
// the data lands. Six cards is roughly one viewport on a laptop.
export default function BrowseLoading() {
  return (
    <Container className="py-8 sm:py-12">
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-12">
        <div className="hidden space-y-5 lg:block">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-11 w-44" />
          </div>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <li key={index}>
                <CarCardSkeleton />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  )
}
