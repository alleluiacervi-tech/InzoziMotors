import Image from 'next/image'
import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { ChipLink } from '@/components/ui/Chip'
import { Reveal } from '@/components/ui/Reveal'
import { RWF_RATE, isDemoListing } from '@/lib/business'
import { BODY_TYPE_IMAGES } from '@/lib/imagery'
import type { Car } from '@/lib/types'

// The browse showcase — our adaptation of a model-range grid. AVATR shows six
// vehicles; our honest equivalent is the four body-type families buyers
// actually shop by. Each family card is photographic and links straight into
// the filtered browse URL.
//
// Photo choice is inventory-first: if a live listing of that family has a
// photograph, the family wears a REAL car we are selling right now; the
// curated marketing image (lib/imagery.ts) is only the fallback. No counts are
// shown — the homepage fetch sees one page of inventory, and a number we can't
// back is a number we don't print.

const FAMILIES = ['SUV', 'Sedan', 'Hatchback', 'Pickup'] as const

const usd = (rwfMillions: number) => Math.round((rwfMillions * 1_000_000) / RWF_RATE)

const BUDGETS = [
  { label: 'Under 10M RWF', href: `/cars?max_price=${usd(10)}` },
  { label: '10 – 20M RWF', href: `/cars?min_price=${usd(10)}&max_price=${usd(20)}` },
  { label: '20 – 35M RWF', href: `/cars?min_price=${usd(20)}&max_price=${usd(35)}` },
  { label: '35M+ RWF', href: `/cars?min_price=${usd(35)}` },
] as const

export function BrowseEntry({ cars }: { cars: Car[] }) {
  const familyImage = (family: string) => {
    // Inventory-first, but never demo-first: the seeded listings carry press
    // renders that contradict their own body types (the "SUV" that put a white
    // sedan on the SUVs tile was a seeded Telluride). Only a real, photographed
    // listing may represent a family; otherwise the curated image, which at
    // least matches its label.
    const live = cars.find(
      (car) =>
        car.body_type?.toLowerCase() === family.toLowerCase() &&
        car.images?.[0] &&
        !isDemoListing(car)
    )
    if (live) {
      return { image: live.images![0], alt: `${live.title} — photographed at a Sawa center` }
    }
    return BODY_TYPE_IMAGES[family]
  }

  return (
    <Section tone="page">
      <Container>
        <SectionHeading eyebrow="Browse" title="Start where buyers start" />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FAMILIES.map((family, i) => {
            const photo = familyImage(family)
            return (
              <Reveal key={family} delay={i * 90}>
                {/* The model-grid card: the whole vehicle contained on a clean
                    studio field, name below — never a portrait crop of a wide
                    side profile. */}
                <Link
                  href={`/cars?body_type=${family}`}
                  className="group block overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-card transition-all duration-300 ease-brand hover:-translate-y-1 hover:border-line hover:shadow-card-lg"
                >
                  <div className="relative aspect-[16/10] bg-surface-alt">
                    <Image
                      src={photo.image}
                      alt={photo.alt}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-contain p-4 transition-transform duration-500 ease-brand group-hover:scale-[1.04]"
                      {...(typeof photo.image !== 'string' ? { placeholder: 'blur' as const } : {})}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-5">
                    <div>
                      <h3 className="text-title-sm font-extrabold text-content">{family}s</h3>
                      <p className="mt-0.5 text-caption text-content-muted">Certified · Kigali</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border border-line text-content-secondary transition-colors group-hover:border-content-muted group-hover:bg-surface-alt">
                      <Icon name="arrow-right" size={16} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>

        {/* Budgets stay — quiet, one row, under the photography */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          {BUDGETS.map((b) => (
            <ChipLink key={b.label} href={b.href}>
              {b.label}
            </ChipLink>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export default BrowseEntry
