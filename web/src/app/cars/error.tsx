'use client'

import { useEffect } from 'react'
import { Alert, Button, Container, Icon } from '@/components/ui'
import { CONTACT } from '@/lib/site'

/**
 * Shown when the catalogue cannot be loaded — almost always the API being
 * unreachable rather than anything the visitor did. It says so plainly, offers
 * a retry that re-runs the server render, and gives a way to reach a human.
 * The underlying error is logged, never printed: it can carry internals.
 */
export default function CarsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('cars route failed:', error.message)
  }, [error])

  return (
    <Container className="py-20">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-alt text-content-muted">
          <Icon name="alert" size={28} />
        </div>
        <h1 className="text-headline font-extrabold text-content">
          We could not load the listings
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-content-secondary">
          This is on our side, not yours. The cars are still there — try again in
          a moment.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} leadingIcon={<Icon name="refresh" size={16} />}>
            Try again
          </Button>
          <Button href="/" variant="outline">
            Back to home
          </Button>
        </div>

        <Alert tone="info" className="mt-8 text-left">
          Looking for something specific? Message the team on WhatsApp at{' '}
          {CONTACT.whatsappDisplay} and we will check the yard for you.
        </Alert>
      </div>
    </Container>
  )
}
