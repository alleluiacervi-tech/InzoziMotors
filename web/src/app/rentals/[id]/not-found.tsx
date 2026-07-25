import { Button, Container, Icon } from '@/components/ui'

export default function RentalNotFound() {
  return (
    <Container className="py-20">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-alt text-content-muted">
          <Icon name="key" size={28} />
        </div>
        <h1 className="text-headline font-extrabold text-content">
          This car is not in the fleet
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-content-secondary">
          It may have been retired or taken in for its service check. The rest of
          the fleet is still available.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/rentals">See the fleet</Button>
          <Button href="/cars" variant="outline">
            Browse cars for sale
          </Button>
        </div>
      </div>
    </Container>
  )
}
