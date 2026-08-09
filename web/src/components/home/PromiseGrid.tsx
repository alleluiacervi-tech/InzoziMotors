import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { InspectionReportCard } from '@/components/marketplace/InspectionReportCard'
import type { InspectionReport } from '@/lib/types'

// The Promise as a ledger, not a card grid. Each claim is one line, and under
// it one line naming HOW it is enforced — evidence over assertion. No icons:
// the icon-square treatment made guarantees look like features. The 150-point
// row embeds a real report render as its proof; the report IS our product
// screenshot.

const LEDGER: { claim: string; proof: string; featured?: boolean }[] = [
  {
    claim: '150-Point Certification',
    proof: 'Enforced in code: no car reaches “live” without an inspection record and a published score.',
    featured: true,
  },
  {
    claim: 'Drive It for 7 Days',
    proof: 'Every purchase handed over at a Sawa center carries the Sawa 7-Day Guarantee, in writing.',
  },
  {
    claim: 'Verified History',
    proof: 'Ownership, mileage and RRA duty status are checked against the inspection — unknowns are labelled unknown, never guessed.',
  },
  {
    claim: 'Deposit-Back Guarantee',
    proof: 'Rental deposits are returned after the documented return check — condition photos protect both sides.',
  },
  {
    claim: 'Zero Fake Listings',
    proof: 'Only the Sawa team can publish a listing, and only after physically inspecting the car. Sellers cannot post.',
  },
]

// A representative report so the ledger can show the real component with real
// anatomy. Labelled as a sample in the caption — never passed off as a live car.
const SAMPLE_REPORT: InspectionReport = {
  score: 143,
  completed_at: undefined as unknown as string,
  checklist_results: {
    'Engine oil condition': 'pass',
    'Brake pads — front': 'pass',
    'Windscreen condition': 'flag',
    'Tyre tread depth — rear left': 'flag',
    'Service history': 'pass',
    'RRA duty paid stamp': 'pass',
  },
}

export function PromiseGrid() {
  return (
    <Section tone="alt">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading
              eyebrow="The Sawa Promise"
              title="Five things that are always true here"
              description="Every car, marketplace or rental. No premium tier buys a better promise."
            />
            <p className="mt-8 text-body text-content-secondary">
              <Link
                href="/promise"
                className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
              >
                The promise in full, including the fine print
                <Icon name="arrow-right" size={16} />
              </Link>
            </p>
          </div>

          <ul>
            {LEDGER.map((row) => (
              <li key={row.claim} className="hairline py-6 first:pt-0">
                <h3 className="text-title-sm font-extrabold text-content">{row.claim}</h3>
                <p className="mt-1.5 text-caption text-content-muted">{row.proof}</p>
                {row.featured ? (
                  <div className="mt-5 max-w-md">
                    <InspectionReportCard report={SAMPLE_REPORT} />
                    <p className="mt-2 text-micro text-content-muted">
                      A sample report — every listing publishes its own.
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  )
}

export default PromiseGrid
