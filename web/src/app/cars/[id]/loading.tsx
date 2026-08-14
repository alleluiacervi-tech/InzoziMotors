import { Container } from '@/components/ui'

export default function VehicleLoading() {
  return (
    <Container className="pb-24 pt-8" aria-label="Loading vehicle details">
      <div className="skeleton h-4 w-56 rounded" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_392px] lg:gap-14">
        <div>
          <div className="skeleton aspect-[4/3] rounded-2xl sm:aspect-[16/10]" />
          <div className="mt-5 flex gap-2">
            {[0, 1, 2, 3].map((item) => <div key={item} className="skeleton h-16 w-24 rounded-lg" />)}
          </div>
          <div className="mt-8 skeleton h-6 w-32 rounded-pill" />
          <div className="mt-4 skeleton h-12 w-3/4 rounded-xl" />
          <div className="mt-3 skeleton h-4 w-1/2 rounded" />
        </div>
        <div className="skeleton h-[420px] rounded-3xl" />
      </div>
      <span className="sr-only" role="status">Loading this vehicle and its inspection evidence…</span>
    </Container>
  )
}
