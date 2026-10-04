import Image from '@/components/ui/SafeImage'
import Link from 'next/link'
import { Container, Icon, Section } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// Import, as a photograph. It is the unfamiliar business (a quote, an
// agreement, two bank-transfer milestones), and a car on a ship is the fastest
// way to say "from Japan, Korea or China". It used to be one tile of the
// "Three ways" band; that band is gone, and this card is the part worth keeping.
//
// The photo is licensed stock (public/img/CREDITS.md): the alt text says what
// it shows, never that it is a Sawa shipment.
// ─────────────────────────────────────────────────────────────────────────────

export async function ImportBand() {
  const t = await getServerT()

  return (
    <Section tone="page">
      <Container>
        <Link
          href="/imports"
          className="group relative isolate flex min-h-[24rem] min-w-0 flex-col justify-end overflow-hidden rounded-3xl bg-ink-900 p-6 text-white sm:min-h-[28rem] sm:p-10 lg:min-h-[36rem]"
        >
          <Image
            src="/img/import-cargo-ship.jpg"
            alt={t('home.land.photoImportAlt')}
            fill
            sizes="(min-width: 1280px) 1200px, 100vw"
            className="-z-10 object-cover object-[50%_92%] sm:object-[50%_75%] transition-transform duration-700 ease-brand group-hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-900 via-ink-900/75 via-45% to-ink-900/10 sm:bg-gradient-to-r sm:from-ink-900/90 sm:via-ink-900/50 sm:to-transparent"
          />
          <span className="mb-auto self-start rounded-pill bg-white/15 px-3 py-1.5 text-caption font-bold backdrop-blur-md">
            {t('home.land.importOrigins')}
          </span>
          <div className="flex items-end justify-between gap-6">
            <div className="max-w-md">
              <h2 className="text-headline font-extrabold">{t('home.front.ways.importTitle')}</h2>
              <p className="mt-3 text-body leading-relaxed text-white/80">{t('home.front.ways.importBody')}</p>
              <span className="mt-5 inline-block text-body font-bold underline decoration-white/40 decoration-2 underline-offset-[6px] group-hover:decoration-white">
                {t('home.front.ways.importCta')}
              </span>
            </div>
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink-900 transition-transform duration-300 ease-brand group-hover:translate-x-1"
            >
              <Icon name="arrow-right" size={18} />
            </span>
          </div>
        </Link>
      </Container>
    </Section>
  )
}

export default ImportBand
