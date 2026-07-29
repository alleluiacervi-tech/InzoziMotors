import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'

// The comparison from the product blueprint, rendered as paired cells rather
// than a table so it stays readable at 320px without a horizontal scroller.
//
// Each row is its own grid, so the two columns always align with each other and
// never with an unrelated row. The Inzozi side is the raised surface; the
// classifieds side is deliberately flat and quiet. No red — this section
// persuades with contrast, not with brand colour.

// Three rows, not five — the photography and seller-identity stories already
// live in the pipeline and the Promise ledger. A comparison earns its length
// only where the contrast is sharpest.
const ROWS = [
  {
    dimension: 'Who publishes the listing',
    elsewhere: 'Anyone with a phone number and a price in mind.',
    inzozi: 'Only our team, after the car has been in our hands.',
  },
  {
    dimension: 'Mechanical condition',
    elsewhere: 'Described by the person selling it to you.',
    inzozi: '150 points checked and published in full — flags included.',
  },
  {
    dimension: 'After you hand over the money',
    elsewhere: 'No guarantee, and nobody to return to.',
    inzozi: 'Seven days to bring it back if it doesn’t match its report.',
  },
]

export function TrustPillars() {
  return (
    <Section tone="surface">
      <Container>
        <SectionHeading
          eyebrow="The difference"
          title="Nothing here is listed unseen"
          description="A classifieds site carries whatever is posted to it. We put our own name on every listing."
        />

        <ul className="mt-12 divide-y divide-line-soft overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-card">
          {ROWS.map((row) => (
            <li key={row.dimension} className="p-4 sm:p-5">
              <h3 className="px-4 pb-3 pt-1 text-micro font-bold uppercase tracking-[0.1em] text-content-muted">
                {row.dimension}
              </h3>

              <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                {/* Quiet, anchored, flat — the noticeboard world. */}
                <div className="rounded-xl bg-surface-alt p-4">
                  <p className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-[0.1em] text-content-muted">
                    <Icon name="close" size={12} />
                    Elsewhere
                  </p>
                  <p className="mt-2 text-body leading-relaxed text-content-secondary">
                    {row.elsewhere}
                  </p>
                </div>

                {/* The raised surface — ours. */}
                <div className="rounded-xl bg-surface p-4 shadow-card ring-1 ring-inset ring-line">
                  <p className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-[0.1em] text-content">
                    <Icon name="check" size={12} className="text-success" />
                    On Inzozi
                  </p>
                  <p className="mt-2 text-body font-medium leading-relaxed text-content">
                    {row.inzozi}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-body text-content-secondary">
          <Link
            href="/promise"
            className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
          >
            Read the five guarantees behind every listing
            <Icon name="arrow-right" size={16} />
          </Link>
        </p>
      </Container>
    </Section>
  )
}

export default TrustPillars
