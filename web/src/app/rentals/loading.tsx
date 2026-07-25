import { Container, Skeleton } from '@/components/ui'
import { RentalCardSkeleton } from '@/components/marketplace/RentalCard'

export default function RentalsLoading() {
  return (
    <Container className="py-8 sm:py-12">
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>

      <div className="mt-8 flex gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-28 rounded-pill" />
        ))}
      </div>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index}>
            <RentalCardSkeleton />
          </li>
        ))}
      </ul>
    </Container>
  )
}
