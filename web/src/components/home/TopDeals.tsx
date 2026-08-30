import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { CarCard } from '@/components/marketplace/CarCard'
import { Reveal } from '@/components/ui/Reveal'
import type { FeaturedPlacement } from '@/lib/types'

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
// Renders nothing when nothing is placed. Unlike FeaturedCars — which explains
// itself when the marketplace is unreachable, because an empty inventory
// section reads as "they have no stock" — an absent Top deals section is
// simply the truth: nobody placed anything today.
// ─────────────────────────────────────────────────────────────────────────────

export function TopDeals({ placements }: { placements: FeaturedPlacement[] }) {
  if (!placements.length) return null

  return (
    <Section tone="page">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Top deals"
            title="Picked by our team this week"
            description="Chosen from cars that passed the 150-point inspection. Paid placements say so."
          />
          <Link
            href="/cars"
            className="inline-flex items-center gap-1.5 pb-1 text-body font-bold text-brand hover:underline"
          >
            View all cars
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {placements.map((placement, i) => (
            <Reveal key={placement.placement_id} delay={(i % 3) * 90}>
              <div className="relative">
                <span
                  className={`absolute left-4 top-4 z-10 rounded-lg px-2.5 py-1 text-caption font-bold shadow-card ${
                    placement.sponsored
                      ? 'bg-warning-tint text-warning-text'
                      : 'bg-surface text-content-secondary'
                  }`}
                >
                  {placement.label}
                </span>
                <CarCard car={placement} priority={i < 3} />
              </div>
              {placement.headline ? (
                <p className="mt-2 px-1 text-caption text-content-muted">{placement.headline}</p>
              ) : null}
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export default TopDeals
