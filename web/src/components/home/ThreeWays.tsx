import Image from 'next/image'
import Link from 'next/link'
import { Container, Icon, Section } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// Sawa runs three businesses; this band names all three in the order people
// arrive with them. Buy and Rent are led by a live count — the strongest thing
// either can say. Import is the unfamiliar one (a quote, an agreement, two
// bank-transfer milestones), so it gets the photograph and the most room: a
// car on a ship is the fastest way to say "from Japan, Korea or China".
//
// Unequal on purpose. Three identical tiles would claim the three are the
// same size of decision; they are not.
// ─────────────────────────────────────────────────────────────────────────────

function Arrow({ tone }: { tone: 'paper' | 'photo' }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform duration-300 ease-brand group-hover:translate-x-1 ${
        tone === 'photo' ? 'bg-white text-ink-900' : 'bg-content text-surface-page'
      }`}
    >
      <Icon name="arrow-right" size={18} />
    </span>
  )
}

export async function ThreeWays({ saleCount, rentalCount }: { saleCount: number; rentalCount: number }) {
  const t = await getServerT()

  const text: { key: 'buy' | 'rent'; icon: IconName; figure: number; href: string }[] = [
    { key: 'buy', icon: 'car', figure: saleCount, href: '/cars' },
    { key: 'rent', icon: 'key', figure: rentalCount, href: '/rentals' },
  ]

  return (
    <Section tone="page">
      <Container>
        <h2 className="max-w-2xl text-headline font-extrabold text-content">{t('home.front.ways.title')}</h2>

        <div className="mt-10 grid gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="grid gap-4 lg:col-span-7 lg:gap-5">
            {text.map((w) => (
              <Link
                key={w.key}
                href={w.href}
                className="group flex min-w-0 flex-col justify-between gap-10 rounded-3xl border border-line bg-surface p-6 transition-[border-color,box-shadow] duration-300 ease-brand hover:border-content/40 hover:shadow-card-lg sm:p-8"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* A count only when there is one: an empty fleet shows its
                      icon rather than a zero. */}
                  {w.figure > 0 ? (
                    <span className="tnum text-display font-black leading-none text-content">{w.figure}</span>
                  ) : (
                    <Icon name={w.icon} size={28} className="text-content-muted" aria-hidden="true" />
                  )}
                  <Arrow tone="paper" />
                </div>
                <div className="max-w-lg">
                  <h3 className="text-title font-extrabold text-content">{t(`home.front.ways.${w.key}Title`)}</h3>
                  <p className="mt-2 text-body leading-relaxed text-content-secondary">{t(`home.front.ways.${w.key}Body`)}</p>
                  <span className="mt-4 inline-block text-body font-bold text-content underline decoration-line decoration-2 underline-offset-[6px] group-hover:decoration-content">
                    {t(`home.front.ways.${w.key}Cta`)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <Link
            href="/imports"
            className="group relative isolate flex min-h-[26rem] min-w-0 flex-col justify-end overflow-hidden rounded-3xl bg-ink-900 p-6 text-white sm:p-8 lg:col-span-5"
          >
            <Image
              src="/img/import-cargo-ship.jpg"
              alt={t('home.land.photoImportAlt')}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="-z-10 object-cover object-[50%_92%] transition-transform duration-700 ease-brand group-hover:scale-[1.03]"
            />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-900 via-ink-900/75 via-45% to-ink-900/10 lg:via-ink-900/50" />
            <span className="mb-auto self-start rounded-pill bg-white/15 px-3 py-1.5 text-caption font-bold backdrop-blur-md">
              {t('home.land.importOrigins')}
            </span>
            <div className="flex items-end justify-between gap-6">
              <div className="max-w-md">
                <h3 className="text-title font-extrabold">{t('home.front.ways.importTitle')}</h3>
                <p className="mt-2 text-body leading-relaxed text-white/80">{t('home.front.ways.importBody')}</p>
                <span className="mt-4 inline-block text-body font-bold underline decoration-white/40 decoration-2 underline-offset-[6px] group-hover:decoration-white">
                  {t('home.front.ways.importCta')}
                </span>
              </div>
              <Arrow tone="photo" />
            </div>
          </Link>
        </div>
      </Container>
    </Section>
  )
}

export default ThreeWays
