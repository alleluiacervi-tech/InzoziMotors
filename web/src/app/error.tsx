'use client'

import { useEffect } from 'react'
import { Button, Container, Icon, Section } from '@/components/ui'
import { CONTACT } from '@/lib/site'

// The last line of defence for any render that throws below the root layout.
//
// Two rules here. First, nothing internal reaches the page: in production Next
// replaces the real message with a generic one and hands over a `digest`, and
// that digest is all a visitor should ever see — it is the thread support pulls
// to find the matching server log. Second, this is a client component, because
// reset() re-renders the failed segment in place.

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Digest only. The message can carry internals in development and is
    // already in the server log in production.
    console.error('Unhandled page error', error.digest ?? '(no digest)')
  }, [error])

  return (
    <Section>
      <Container>
        <div className="max-w-2xl">
          <p className="text-caption font-bold text-brand">Something went wrong</p>
          <h1 className="mt-3 text-display font-extrabold tracking-[-0.03em] text-content">
            This page didn’t load.
          </h1>
          <p className="mt-5 text-title-sm leading-relaxed text-content-secondary">
            The fault is on our side, not yours. Nothing you were doing has been lost — no request
            is ever completed by a page loading. Try again, and if it keeps happening, tell us and
            we will look at it.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={reset} leadingIcon={<Icon name="refresh" size={18} />}>
              Try again
            </Button>
            <Button href="/" variant="outline">
              Go to the homepage
            </Button>
            <Button href={`mailto:${CONTACT.supportEmail}`} variant="ghost">
              Email support
            </Button>
          </div>

          {error.digest ? (
            <p className="mt-10 border-t border-line-soft pt-6 text-caption text-content-muted">
              Reference for support:{' '}
              <span className="font-mono font-semibold text-content-secondary">{error.digest}</span>
            </p>
          ) : null}
        </div>
      </Container>
    </Section>
  )
}
