import Link from 'next/link'
import { Container, Icon, Section } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// Sawa runs three businesses and the front page used to show one. This band
// names all three in the order people arrive with them, each led by a fact
// rather than a photograph: how many cars can be bought, how many rented, and
// where imports come from. Three columns divided by rules — not three cards —
// because they are one choice, not three products.
// ─────────────────────────────────────────────────────────────────────────────

export async function ThreeWays({ saleCount, rentalCount }: { saleCount: number; rentalCount: number }) {
  const t = await getServerT()

  const ways: {
    key: 'buy' | 'rent' | 'import'
    icon: IconName
    figure: string
    href: string
  }[] = [
    { key: 'buy', icon: 'car', figure: saleCount ? String(saleCount) : '', href: '/cars' },
    { key: 'rent', icon: 'key', figure: rentalCount ? String(rentalCount) : '', href: '/rentals' },
    { key: 'import', icon: 'compass', figure: 'JP / AE', href: '/imports' },
  ]

  return (
    <Section tone="page">
      <Container>
        <h2 className="max-w-2xl text-headline font-extrabold text-content">{t('home.front.ways.title')}</h2>

        <ul className="mt-10 grid divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {ways.map((w) => (
            <li key={w.key} className="min-w-0 py-8 md:px-8 md:first:pl-0 md:last:pr-0">
              <div className="flex min-h-12 items-center justify-between gap-4">
                {/* A count only when there is one; an empty fleet shows no
                    number rather than a zero or a dash. */}
                <span className="tnum text-display font-extrabold leading-none tracking-[-0.03em] text-content">
                  {w.figure}
                </span>
                <Icon name={w.icon} size={22} className="text-content-muted" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-title font-extrabold text-content">
                {t(`home.front.ways.${w.key}Title`)}
              </h3>
              <p className="mt-2 max-w-sm text-body leading-relaxed text-content-secondary">
                {t(`home.front.ways.${w.key}Body`)}
              </p>
              <Link
                href={w.href}
                className="-my-2 mt-4 inline-flex items-center gap-1.5 py-2 text-body font-bold text-brand hover:underline"
              >
                {t(`home.front.ways.${w.key}Cta`)}
                <Icon name="arrow-right" size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}

export default ThreeWays
