import type { Metadata } from 'next'
import Link from 'next/link'
import { Button, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { RefundTable } from '@/components/marketing/RefundTable'
import { PROMISES } from '@/lib/site'
import { RETURN_WINDOW_DAYS } from '@/lib/business'

export const metadata: Metadata = {
  title: 'The Inzozi Promise',
  description:
    'Five guarantees on every vehicle: a 150-point certification, a 7-day drive-it window, verified history, deposit-back on rentals, and zero fake listings.',
  alternates: { canonical: '/promise' },
}

// The five promises come from lib/site.ts untouched. What is added here is one
// paragraph each explaining the mechanic behind the guarantee — the checklist
// categories, where the window starts, who takes the photographs. Every detail
// is something the platform actually does; none of it is a new commitment
// invented for the website.
const DETAIL: Record<string, string> = {
  '150-Point Certification':
    'Seven categories: engine and drivetrain, brakes and steering, body and exterior, interior and comfort, electronics and safety, tyres and wheels, and documentation. A mechanic grades every item pass, flag or fail on a tablet at the center, the score is computed from those results rather than typed in, and a car that falls below our threshold is not published at all.',
  'Drive It for 7 Days':
    'The window opens the day the car is handed to you at a center — not the day you requested it. A return is judged against the report we published, so the question is never your word against the seller’s. Change-of-mind returns are accepted too, with a reconditioning fee and a per-km charge beyond 300 km.',
  'Verified History':
    'Ownership records, odometer readings cross-checked against service history, import origin and RRA duty status. We publish what we found, including the parts that did not check out — a flagged item on a report is information you are entitled to before you decide, not a reason to hide the car.',
  'Deposit-Back Guarantee':
    'Rental deposits are returned in full after the return check, the same day, at the center. Condition photographs are taken when you collect the car and again when you bring it back, so neither side has to argue from memory.',
  'Zero Fake Listings':
    'Sellers submit cars; they cannot publish them. Only the Inzozi team creates a listing, and only after the car has physically been at a center. Every photograph on this site was taken by our photographers in the same 36 standard angles, which is what makes two listings genuinely comparable.',
}

// Verbatim from the plain-terms block in src/screens/InzoziPromiseScreen.js.
const WINDOW_ROWS = [
  { free: true, text: 'Cancel before handover — always free' },
  { free: true, text: `Days 1–${RETURN_WINDOW_DAYS}: full refund if the car doesn’t match its report` },
  { free: false, text: 'Change of mind: reconditioning fee is deducted' },
  { free: false, text: 'Over 300 km driven: per-km usage charge applies' },
]

export default function PromisePage() {
  return (
    <>
      <PageHeader
        eyebrow="The Inzozi Promise"
        title="Our promise to every customer"
        lede="Buying or renting a car is one of the biggest decisions you will make. These five guarantees apply to every single vehicle on Inzozi — for sale or for rent, first listing or fiftieth."
        actions={
          <>
            <Button href="/cars" trailingIcon={<Icon name="arrow-right" size={18} />}>
              Browse certified cars
            </Button>
            <Button href="/how-it-works" variant="outline">
              How buying works
            </Button>
          </>
        }
      />

      {/* ─── The window, in plain terms ──────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <div>
              <SectionHeading
                eyebrow={`The ${RETURN_WINDOW_DAYS}-day window`}
                title="In plain terms"
                description="Four lines. This is the whole of it, and it is the same wording the app shows you before you confirm."
              />

              <ul className="mt-10 space-y-4">
                {WINDOW_ROWS.map((row) => (
                  <li key={row.text} className="flex gap-3">
                    <Icon
                      name={row.free ? 'check-circle' : 'info'}
                      size={19}
                      className={`mt-0.5 shrink-0 ${row.free ? 'text-success' : 'text-warning'}`}
                    />
                    <span className="text-title-sm leading-relaxed text-content">{row.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-caption font-bold uppercase tracking-[0.1em] text-content-muted">
                The same conditions, in full
              </h3>
              <RefundTable className="mt-5" />
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── The five guarantees ─────────────────────────────────────────── */}
      <Section tone="page">
        <Container>
          <SectionHeading
            eyebrow="Five guarantees"
            title="What each one actually means"
            description="A promise is only worth the mechanism behind it, so here is the mechanism behind each of ours."
          />

          <ol className="mt-14 space-y-4">
            {PROMISES.map((promise, i) => (
              <li
                key={promise.title}
                className="rounded-3xl border border-line-soft bg-surface p-6 shadow-card sm:p-9"
              >
                <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-8">
                  <div className="flex items-center gap-4 sm:block">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-alt text-content-secondary">
                      <Icon name={promise.icon} size={22} />
                    </span>
                    <span className="text-caption font-extrabold tabular-nums tracking-[0.1em] text-content-muted sm:mt-4 sm:block sm:text-center">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-title font-extrabold text-content">{promise.title}</h3>
                    <p className="mt-3 max-w-prose text-title-sm leading-relaxed text-content-secondary">
                      {promise.desc}
                    </p>
                    <p className="mt-4 max-w-prose border-t border-line-soft pt-4 text-body leading-relaxed text-content-secondary">
                      {DETAIL[promise.title]}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-12 max-w-prose text-caption leading-relaxed text-content-muted">
            The {RETURN_WINDOW_DAYS}-day return guarantee applies to purchases handed over at an
            Inzozi center. Deposit refunds follow the documented return check. Full terms are
            available at any center and in the{' '}
            <Link href="/legal/guarantee" className="font-bold text-brand hover:underline">
              guarantee terms
            </Link>
            .
          </p>
        </Container>
      </Section>
    </>
  )
}
