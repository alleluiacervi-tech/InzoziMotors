import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { CountUp } from '@/components/ui/CountUp'

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
  { value: 150, label: 'point inspection, published in full' },
  { value: 40, label: 'gallery images supported per listing' },
  { value: 0, label: 'payments processed by Sawa Cars' },
  { value: 3, label: 'Kigali inspection centers' },
] as const

const LEDGER: { claim: string; proof: string }[] = [
  {
    claim: 'Inspection evidence',
    proof: 'Publication checks require a completed inspection when the platform inspection policy is enabled.',
  },
  {
    claim: 'Verified seller status',
    proof: 'A listing cannot go live for a suspended, deleted or identity-unverified seller.',
  },
  {
    claim: 'Evidence without guessing',
    proof: 'Ownership, mileage and RRA duty status are checked — unknowns are labelled unknown, never guessed.',
  },
  {
    claim: 'Controlled publication',
    proof: 'Only authorized administrators publish, with the decision and readiness result retained in the audit history.',
  },
  {
    claim: 'Direct transactions',
    proof: 'Sawa Cars does not accept, hold or route user transaction funds and does not create the parties’ contract.',
  },
]

export function TrustBand() {
  return (
    <Section tone="alt">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading
              eyebrow="Marketplace controls"
              title="Evidence before contact"
              description="Sawa Cars controls verification and publication. Users retain control—and responsibility—for the deal itself."
            />

            {/* The process in four numbers. Facts about how we work — not
                ratings, not user counts — so they need no users to be true. */}
            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-7">
              {FACTS.map((fact) => (
                <div key={fact.value}>
                  <dt className="sr-only">{fact.label}</dt>
                  <dd>
                    {/* Counts up as it enters the viewport — the numbers are
                        the section's whole argument, so they get the moment. */}
                    <CountUp
                      value={fact.value}
                      className="block text-display font-extrabold tracking-[-0.03em] text-content"
                    />
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
                See the controls and their limits
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
