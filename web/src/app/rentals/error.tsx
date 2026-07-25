'use client'

import { useEffect } from 'react'
import { Button, Container, Icon } from '@/components/ui'
import { CONTACT } from '@/lib/site'

export default function RentalsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('rentals route failed:', error.message)
  }, [error])

  return (
    <Container className="py-20">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-alt text-content-muted">
          <Icon name="alert" size={28} />
        </div>
        <h1 className="text-headline font-extrabold text-content">
          We could not load the fleet
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-content-secondary">
          Something on our side is not answering. The cars are still here — try
          again, or message the team and we will check availability for you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} leadingIcon={<Icon name="refresh" size={16} />}>
            Try again
          </Button>
          <Button
            href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            variant="outline"
            leadingIcon={<Icon name="whatsapp" size={16} />}
          >
            Message us
          </Button>
        </div>
      </div>
    </Container>
  )
}
