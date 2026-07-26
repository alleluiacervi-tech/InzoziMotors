import { Container, Section, SectionHeading } from '@/components/ui'
import { ChipLink } from '@/components/ui/Chip'
import { RWF_RATE } from '@/lib/business'

// The inventory entry the homepage lacked: buyers start from a budget or a
// body type, not from a search box. Chips link straight into the browse page
// with real filter params, so every tile is a working, shareable query.
//
// Budgets are shown in RWF (the currency buyers think in) but the API filters
// on USD prices — derive the bound from the shared rate so the label and the
// filter can never drift apart.

const usd = (rwfMillions: number) => Math.round((rwfMillions * 1_000_000) / RWF_RATE)

const BUDGETS = [
  { label: 'Under 10M RWF', href: `/cars?max_price=${usd(10)}` },
  { label: '10 – 20M RWF', href: `/cars?min_price=${usd(10)}&max_price=${usd(20)}` },
  { label: '20 – 35M RWF', href: `/cars?min_price=${usd(20)}&max_price=${usd(35)}` },
  { label: '35M+ RWF', href: `/cars?min_price=${usd(35)}` },
] as const

const BODY_TYPES = ['SUV', 'Sedan', 'Hatchback', 'Pickup', 'Van'] as const

export function BrowseEntry() {
  return (
    <Section tone="page">
      <Container>
        <SectionHeading eyebrow="Browse" title="Start where buyers start" />
        <div className="mt-12 space-y-4">
          <div className="flex flex-wrap gap-2.5">
            {BUDGETS.map((b) => (
              <ChipLink key={b.label} href={b.href}>
                {b.label}
              </ChipLink>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {BODY_TYPES.map((body) => (
              <ChipLink key={body} href={`/cars?body_type=${body}`}>
                {body}
              </ChipLink>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  )
}

export default BrowseEntry
