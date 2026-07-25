import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'

// The comparison from the product blueprint, rendered as paired cells rather
// than a table so it stays readable at 320px without a horizontal scroller.
//
// Each row is its own grid, so the two columns always align with each other and
// never with an unrelated row. The Inzozi side is the raised surface; the
// classifieds side is deliberately flat and quiet. No red — this section
// persuades with contrast, not with brand colour.

const ROWS = [
  {
    dimension: 'Who publishes the listing',
    elsewhere: 'Anyone with a phone number and a price in mind.',
    inzozi: 'Only the Inzozi team, and only after the car has been in our hands.',
  },
  {
    dimension: 'The photographs',
    elsewhere: 'Shot on the seller’s phone, in whatever light there was.',
    inzozi: '36 standard angles shot by our photographers at the center — the same set for every car.',
  },
  {
    dimension: 'Mechanical condition',
    elsewhere: 'Described by the person who wants to sell it to you.',
    inzozi: 'A 150-point check across engine, brakes, body, interior, electronics, tyres and documents — published in full.',
  },
  {
    dimension: 'Seller identity',
    elsewhere: 'Optional. Often nothing more than a number.',
    inzozi: 'A national ID check is mandatory before a car can even be submitted.',
  },
  {
    dimension: 'After you hand over the money',
    elsewhere: 'No guarantee and nobody to return to.',
    inzozi: 'Seven days to bring the car back to any center if it does not match its report.',
  },
]

export function TrustPillars() {
  return (
    <Section tone="surface">
      <Container>
        <SectionHeading
          eyebrow="The difference"
          title="Nothing on Inzozi gets listed unseen."
          description="A classifieds site is a noticeboard: it carries whatever is posted to it. Inzozi is the opposite arrangement — we take the car in, check it, photograph it, and put our own name on the listing."
        />

        <ul className="mt-12 divide-y divide-line-soft overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-card">
          {ROWS.map((row) => (
            <li key={row.dimension} className="p-4 sm:p-5">
              <h3 className="px-2 pb-3 pt-1 text-[12px] font-bold uppercase tracking-[0.1em] text-content-muted">
                {row.dimension}
              </h3>

              <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                <div className="rounded-2xl p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-content-muted">
                    <Icon name="close" size={12} />
                    Elsewhere
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-content-secondary">
                    {row.elsewhere}
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-alt p-4 ring-1 ring-inset ring-line">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-content">
                    <Icon name="check" size={12} className="text-success" />
                    On Inzozi
                  </p>
                  <p className="mt-2 text-[15px] font-medium leading-relaxed text-content">
                    {row.inzozi}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[15px] text-content-secondary">
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
