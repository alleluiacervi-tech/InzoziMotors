import { Container, Skeleton } from '@/components/ui'

// Same two-column geometry as the real listing, so the gallery and the price
// card do not jump into place once the API answers.
export default function CarDetailLoading() {
  return (
    <Container className="py-8 sm:py-12">
      <Skeleton className="h-3 w-56" />

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_368px] lg:gap-12">
        <div className="space-y-6">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl sm:aspect-[16/10]" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>

        <div>
          <Skeleton className="h-[420px] w-full rounded-2xl" />
        </div>
      </div>
    </Container>
  )
}
