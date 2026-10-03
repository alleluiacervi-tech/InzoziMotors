import Link from 'next/link'
import { Container, Section, SectionHeading, TextLink } from '@/components/ui'
import { CarCard } from '@/components/marketplace/CarCard'
import type { FeaturedPlacement } from '@/lib/types'
import { formatMoney } from '@/lib/business'
import { getLocale, getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// Top deals — the cars an operator actually placed.
//
// The section above this one is titled "Just listed" and shows the newest six
// live listings, which is honest. What was NOT honest is that the website had
// no concept of a placement at all: an operator choosing a car for the top of
// the marketplace — including a seller who paid for the slot — got it in the
// app and nowhere else. This is the other half of that.
//
// ── Why the label is not decoration ──────────────────────────────────────────
// Sawa's product is INDEPENDENT verification. A slot we chose on the merits and
// a slot a seller bought are different claims, and a company that blurs them is
// selling something other than what it says. The server computes `sponsored`
// and `label`, so this cannot be got wrong by forgetting to check the kind, and
// a paid placement is visibly paid to every visitor.
//
// The label is read from `label`, never from `kind`: "Hot deal" is a claim
// about a price and the server only sends it when the price really fell (see
// backend/src/lib/featured.js). The same rule as the app's FeaturedCard.
//
// Renders nothing when nothing is placed. Unlike FeaturedCars — which explains
// itself when the marketplace is unreachable, because an empty inventory
// section reads as "they have no stock" — an absent Top deals section is
// simply the truth: nobody placed anything today.
// ─────────────────────────────────────────────────────────────────────────────

export async function TopDeals({ placements }: { placements: FeaturedPlacement[] }) {
  if (!placements.length) return null
  const t = await getServerT()

  const heading = (
    <SectionHeading
      title={t('home.topDeals.title')}
      description={t('home.topDeals.description')}
      action={<TextLink href="/featured">{t('home.topDeals.seeAll')}</TextLink>}
    />
  )

  // One or two picks in a four-column grid left most of the row empty — the
  // section looked unfinished every week the team placed two cars. With two
  // or fewer, the heading takes the left third and the cards the rest.
  if (placements.length <= 2) {
    return (
      <Section tone="page">
        <Container>
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="min-w-0 lg:col-span-4 lg:pt-8">{heading}</div>
            <div className="min-w-0 lg:col-span-8">
              <PlacementGrid placements={placements} />
            </div>
          </div>
        </Container>
      </Section>
    )
  }

  return (
    <Section tone="page">
      <Container>
        {heading}
        <div className="mt-8">
          <PlacementGrid placements={placements} />
        </div>
      </Container>
    </Section>
  )
}

/** The placements as cards. Shared by the homepage and /featured. */
export async function PlacementGrid({ placements }: { placements: FeaturedPlacement[] }) {
  const t = await getServerT()
  const locale = await getLocale()

  return (
    <div
      className={`grid items-stretch gap-x-5 gap-y-8 sm:grid-cols-2 ${
        placements.length >= 4 ? 'lg:grid-cols-3 xl:grid-cols-4' : placements.length === 3 ? 'lg:grid-cols-3' : ''
      }`}
    >
      {placements.map((placement, i) => {
        // Editorial picks carry no badge; the section title already says a
        // person chose them. A paid slot always says so, quietly.
        const label = placement.label === 'Sponsored' || placement.sponsored
          ? t('home.topDeals.sponsored')
          : placement.label === 'Hot deal' ? t('home.topDeals.hotDeal') : null
        const previous = placement.previous_price != null && placement.previous_price > placement.price
          ? placement.previous_price
          : null
        const droppedOn = previous && placement.price_dropped_at
          ? new Date(placement.price_dropped_at).toLocaleDateString(locale, {
              day: 'numeric', month: 'short', timeZone: 'Africa/Kigali',
            })
          : null

        return (
          <div key={placement.placement_id} className="flex h-full min-w-0 flex-col">
            {/* The label sits above the card, not on its photo: the photo's
                top-left corner belongs to the score. An empty line keeps the
                cards in a row aligned when only some of them are labelled. */}
            <p className="mb-2 flex h-6 items-center">
              {label ? (
                <span className="rounded-md bg-surface-alt px-2 py-0.5 text-micro font-bold text-content-secondary">
                  {label}
                </span>
              ) : null}
            </p>
            <div className="min-w-0 flex-1">
              <CarCard car={placement} priority={i < 3} />
            </div>
            {previous ? (
              <p className="mt-2 px-1 text-caption text-content-secondary">
                <s className="text-content-muted">{t('home.topDeals.was', { price: formatMoney(previous) })}</s>
                {droppedOn ? (
                  <>
                    <span aria-hidden className="mx-1.5 text-line">·</span>
                    {t('home.topDeals.dropped', { amount: formatMoney(previous - placement.price), date: droppedOn })}
                  </>
                ) : null}
              </p>
            ) : null}
            {placement.headline ? (
              <p className="mt-2 px-1 text-caption text-content-muted">{placement.headline}</p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default TopDeals
