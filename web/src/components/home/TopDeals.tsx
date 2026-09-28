import Link from 'next/link'
import { Container, Icon, Section } from '@/components/ui'
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

  return (
    <Section tone="page">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-headline font-extrabold text-content">{t('home.topDeals.title')}</h2>
            <p className="mt-2 text-body text-content-secondary">{t('home.topDeals.description')}</p>
          </div>
          <Link
            href="/featured"
            className="-my-2 inline-flex items-center gap-1.5 py-2 text-body font-bold text-brand hover:underline"
          >
            {t('home.topDeals.seeAll')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        <PlacementGrid placements={placements} />
      </Container>
    </Section>
  )
}

/** The placements as cards. Shared by the homepage and /featured. */
export async function PlacementGrid({ placements }: { placements: FeaturedPlacement[] }) {
  const t = await getServerT()
  const locale = await getLocale()

  return (
    <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                <span className="rounded-md bg-surface-alt px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-content-muted">
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
