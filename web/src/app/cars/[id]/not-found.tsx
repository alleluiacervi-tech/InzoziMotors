import { Button, Container, Icon } from '@/components/ui'

/**
 * A listing that has gone. Inventory turns over — a car that sold last week is
 * a normal 404 here, so the copy says so and points at what is still available
 * instead of apologising for a broken link.
 */
export default function CarNotFound() {
  return (
    <Container className="py-20">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-alt text-content-muted">
          <Icon name="car" size={28} />
        </div>
        <h1 className="text-headline font-extrabold text-content">
          This car is no longer listed
        </h1>
        <p className="mt-4 text-title-sm leading-relaxed text-content-secondary">
          It has either been sold or taken off the marketplace. Cars clear
          inspection every week, so there is usually something close.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/cars">Browse certified cars</Button>
          <Button href="/rentals" variant="outline">
            Rent instead
          </Button>
        </div>
      </div>
    </Container>
  )
}
