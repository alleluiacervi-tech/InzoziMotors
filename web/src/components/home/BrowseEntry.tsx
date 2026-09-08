import Image from 'next/image'
import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { Reveal } from '@/components/ui/Reveal'
import { isDemoListing } from '@/lib/business'
import { BODY_TYPE_IMAGES } from '@/lib/imagery'
import type { Car } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'

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

const FAMILIES = [
  { value: 'SUV', labelKey: 'home.browse.family.suv' },
  { value: 'Sedan', labelKey: 'home.browse.family.sedan' },
  { value: 'Hatchback', labelKey: 'home.browse.family.hatchback' },
  { value: 'Pickup', labelKey: 'home.browse.family.pickup' },
] as const

// The budget chips that lived here are gone, along with the `budgets()` helper
// that built them. They were the third set of price bands on one homepage and
// the three sets disagreed. Price is a filter, and filtering belongs in the
// hero's search box and in /cars' own filter panel — not repeated in three
// places with three different definitions of "affordable".
//
// What this section keeps is the thing it alone does: a photographic way in,
// by the four families people actually shop by, wearing a real listing's own
// photograph wherever one exists.

export async function BrowseEntry({ cars }: { cars: Car[] }) {
  const t = await getServerT()
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
        <SectionHeading eyebrow={t('home.browse.eyebrow')} title={t('home.browse.title')} />

        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {FAMILIES.map((family, i) => {
            const photo = familyImage(family.value)
            return (
              <Reveal key={family.value} delay={i * 90}>
                {/* The model-grid card: the whole vehicle contained on a clean
                    studio field, name below — never a portrait crop of a wide
                    side profile. */}
                <Link
                  href={`/cars?body_type=${family.value}`}
                  className="group block overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-card transition-all duration-300 ease-brand hover:-translate-y-1 hover:border-line hover:shadow-card-lg"
                >
                  <div className="relative aspect-[16/10] bg-surface-alt">
                    <Image
                      src={photo.image}
                      alt={photo.alt}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-contain p-4 transition-transform duration-500 ease-brand group-hover:scale-[1.04]"
                      {...(typeof photo.image !== 'string' ? { placeholder: 'blur' as const } : {})}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3 sm:p-5">
                    <div className="min-w-0">
                      <h3 className="truncate text-title-sm font-extrabold text-content">{t(family.labelKey)}</h3>
                      <p className="mt-0.5 truncate text-caption text-content-muted">{t('home.browse.familyMeta')}</p>
                    </div>
                    <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-pill border border-line text-content-secondary transition-colors group-hover:border-content-muted group-hover:bg-surface-alt sm:flex">
                      <Icon name="arrow-right" size={16} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>

      </Container>
    </Section>
  )
}

export default BrowseEntry
