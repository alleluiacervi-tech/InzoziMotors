import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'

// The homepage's single trust section. There used to be three — a stat band,
// an "elsewhere vs Sawa" comparison, and a five-promise ledger — saying the
// same true thing three ways across three viewports. Repetition reads as
// insecurity; the inventory-first page states the promise once, completely,
// and lets the listings above it do the persuading.
//
// What survived from each: the four process facts (numbers about how we work,
// not vanity metrics — true on day one, impossible to inflate), and the five
// promises as one-line claim + one-line enforcement. The full argument, with
// the comparison and the sample report, lives on /promise and /how-it-works.

const FACTS = [
  { value: '150', label: 'point inspection, published in full' },
  { value: '36', label: 'standard photo angles, shot by us' },
  { value: '7', label: 'day drive-it guarantee' },
  { value: '3', label: 'Kigali inspection centers' },
] as const

const LEDGER: { claim: string; proof: string }[] = [
  {
    claim: '150-Point Certification',
    proof: 'Enforced in code: no car reaches “live” without an inspection record and a published score.',
  },
  {
    claim: 'Drive It for 7 Days',
    proof: 'Every purchase handed over at a Sawa center carries the 7-Day Guarantee, in writing.',
  },
  {
    claim: 'Verified History',
    proof: 'Ownership, mileage and RRA duty status are checked — unknowns are labelled unknown, never guessed.',
  },
  {
    claim: 'Zero Fake Listings',
    proof: 'Only the Sawa team can publish, and only after physically inspecting the car. Sellers cannot post.',
  },
  {
    claim: 'Buyers Pay Nothing',
    proof: 'Browsing, buying and the guarantee are free for buyers — every fee on the platform is the seller’s.',
  },
]

export function TrustBand() {
  return (
    <Section tone="alt">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading
              eyebrow="The Sawa promise"
              title="Nothing here is listed unseen"
              description="A classifieds site carries whatever is posted to it. Every listing above went through our hands first."
            />

            {/* The process in four numbers. Facts about how we work — not
                ratings, not user counts — so they need no users to be true. */}
            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-7">
              {FACTS.map((fact) => (
                <div key={fact.value}>
                  <dt className="sr-only">{fact.label}</dt>
                  <dd>
                    <span className="block text-display font-extrabold tracking-[-0.03em] text-content">
                      {fact.value}
                    </span>
                    <span className="mt-1 block text-caption text-content-secondary">
                      {fact.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-10 text-body text-content-secondary">
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
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  )
}

export default TrustBand
