import Link from 'next/link'
import { Button, Container, Icon, Section, type IconName } from '@/components/ui'

// A 404 on a marketplace usually means one of two honest things: the car sold
// and left the site, or the link is old. Say that, then put the visitor back
// into the catalogue in one tap rather than leaving them at a dead end.

const ELSEWHERE: { href: string; label: string; description: string; icon: IconName }[] = [
  {
    href: '/cars',
    label: 'Certified cars',
    description: 'Every listing inspected on 150 points before it appears.',
    icon: 'car',
  },
  {
    href: '/rentals',
    label: 'Rent a car',
    description: 'The same inspection standard, by the day or the week.',
    icon: 'key',
  },
  {
    href: '/sell',
    label: 'Sell your car',
    description: 'Submit it for inspection — our team does the listing.',
    icon: 'cash',
  },
  {
    href: '/how-it-works',
    label: 'How buying works',
    description: 'Request, handover at a center, RRA transfer, 7-day window.',
    icon: 'document',
  },
  {
    href: '/promise',
    label: 'The Sawa Promise',
    description: 'The five guarantees behind every car we publish.',
    icon: 'shield-check',
  },
  {
    href: '/contact',
    label: 'Contact and centers',
    description: 'Nyarutarama, Kicukiro and Kimironko.',
    icon: 'location',
  },
]

export default function NotFound() {
  return (
    <Section>
      <Container>
        <div className="max-w-2xl">
          <p className="text-eyebrow font-bold uppercase text-brand">404</p>
          <h1 className="mt-3 text-display font-extrabold tracking-[-0.03em] text-content">
            This page isn’t here.
          </h1>
          <p className="mt-5 text-title-sm leading-relaxed text-content-secondary">
            The car may have been sold and taken off the marketplace, or the link may be out of
            date. Nothing on Sawa Cars disappears without a reason — every listing is published and
            removed by our team.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/cars" trailingIcon={<Icon name="arrow-right" size={18} />}>
              Browse certified cars
            </Button>
            <Button href="/" variant="outline">
              Go to the homepage
            </Button>
          </div>
        </div>

        <div className="mt-14 border-t border-line-soft pt-10">
          <h2 className="text-caption font-bold uppercase tracking-wide text-content-muted">
            Try one of these
          </h2>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {ELSEWHERE.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-start gap-4 rounded-xl border border-line-soft bg-surface px-4 py-4
                             transition-colors duration-200 ease-brand hover:border-line hover:bg-surface-alt"
                >
                  {/* Wayfinding icons stay neutral — red is reserved for actions. */}
                  <Icon name={item.icon} size={20} className="mt-0.5 text-content-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-bold text-content">{item.label}</span>
                    <span className="mt-1 block text-caption leading-relaxed text-content-secondary">
                      {item.description}
                    </span>
                  </span>
                  <Icon name="chevron-right" size={18} className="mt-0.5 text-content-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  )
}
