import type { Metadata } from 'next'
import Link from 'next/link'
import { Alert, Button, Card, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { StepTimeline } from '@/components/marketing/Steps'
import { BUYING_PIPELINE, PipelineModules } from '@/components/marketing/PipelineModules'
import { RefundTable } from '@/components/marketing/RefundTable'
import { BUYING_STEPS, SELLING_STEPS } from '@/lib/site'

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Buying on Inzozi Motors in six steps, the refund conditions in full, what to bring to a handover, and how selling a car through our inspection centers works.',
  alternates: { canonical: '/how-it-works' },
}

// What to bring — drawn from the documents question in BuyingGuideScreen and
// the insurance step in BUYING_STEPS. Nothing here is a new rule invented for
// the website.
const BRING = [
  {
    icon: 'user' as const,
    title: 'Your national ID',
    desc: 'We check it against the reservation before anything is signed. The seller does the same on their side.',
  },
  {
    icon: 'shield' as const,
    title: 'Proof of insurance',
    desc: 'Third-party cover is required before the car leaves the center. Bring a policy, or arrive early and our team helps you arrange one on the spot.',
  },
  {
    icon: 'cash' as const,
    title: 'Your payment',
    desc: 'Handed over in person at the center, in the form you agreed with our team. There is no payment feature in the app or on this website.',
  },
  {
    icon: 'eye' as const,
    title: 'A second opinion, if you want one',
    desc: 'Bring whoever you like. You can check the car against its published 150-point report before any money moves.',
  },
]

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        title="Six steps to buy. Six steps to sell. No payment on either side of the screen."
        lede="Inzozi sits between the two of you for the whole transaction: we inspect the car, we publish the listing, we arrange the handover, and we process the ownership transfer with you at the center."
        actions={
          <>
            <Button href="/cars" trailingIcon={<Icon name="arrow-right" size={18} />}>
              Browse certified cars
            </Button>
            <Button href="/sell" variant="outline">
              Sell your car
            </Button>
          </>
        }
      />

      {/* ─── Buying ──────────────────────────────────────────────────────── */}
      <Section tone="surface" id="buying">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[360px_1fr] lg:gap-20">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+40px)] lg:self-start">
              <SectionHeading
                eyebrow="For buyers"
                title="Buying a car"
                description="From the moment you request a car to the day your guarantee window closes."
              />
              <p className="mt-6 text-body leading-relaxed text-content-secondary">
                Requesting a car costs nothing and commits you to nothing. It reserves the
                vehicle and takes it off the marketplace while we confirm with the seller.
              </p>
            </div>

            <PipelineModules steps={BUYING_PIPELINE} />
          </div>
        </Container>
      </Section>

      {/* ─── Refunds ─────────────────────────────────────────────────────── */}
      <Section tone="page" id="refunds">
        <Container>
          <SectionHeading
            eyebrow="Refund conditions"
            title="Exactly when you get your money back"
            description="These are the same terms the app shows before you confirm a request. Nothing is held back for the small print."
          />

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-16">
            <RefundTable />

            <div>
              <Alert tone="info" title="The window starts at handover">
                Seven days, counted from the day the car is handed to you at an Inzozi center —
                not from the day you requested it.
              </Alert>
              <p className="mt-6 text-body leading-relaxed text-content-secondary">
                A return is judged against the published inspection report. If the car does not
                match what we certified, the refund is full and the fault is ours to carry with
                the seller.
              </p>
              <p className="mt-4 text-body">
                <Link
                  href="/legal/guarantee"
                  className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
                >
                  Read the full guarantee terms
                  <Icon name="arrow-right" size={16} />
                </Link>
              </p>
            </div>
          </div>

          {/* The honest-scope block — stating what the check does NOT cover is
              what makes the rest of the page believable. Plain card, no tint,
              no red: limits are stated, not dramatized. */}
          <Card className="mt-12 border-line p-6 sm:p-8">
            <h3 className="text-title-sm font-extrabold text-content">
              What the 150 points cover — and don&apos;t
            </h3>
            <div className="mt-5 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="text-caption font-bold uppercase tracking-wide text-content-muted">
                  Covered, item by item
                </p>
                <ul className="mt-3 space-y-2">
                  {[
                    'Engine & drivetrain', 'Brakes & steering', 'Body & exterior',
                    'Interior & comfort', 'Electronics & safety', 'Tyres & wheels',
                    'Documentation — registration, service history, RRA duty',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-body text-content-secondary">
                      <Icon name="check" size={16} className="mt-1 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-caption font-bold uppercase tracking-wide text-content-muted">
                  Not covered
                </p>
                <ul className="mt-3 space-y-2">
                  {[
                    'Wear that develops after handover',
                    'Consumables — fuel, wiper blades, bulbs — once you drive off',
                    'Damage from use, accident or neglect after the 7-day window',
                    'Faults the report already flagged and you accepted',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-body text-content-secondary">
                      <Icon name="minus" size={16} className="mt-1 shrink-0 text-content-muted" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </Container>
      </Section>

      {/* ─── Handover checklist ──────────────────────────────────────────── */}
      <Section tone="surface" id="handover">
        <Container>
          <SectionHeading
            eyebrow="On the day"
            title="What to bring to a handover"
            description="Handovers take place at one of our three Kigali centers. Bring these four things and it takes about an hour."
          />

          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {BRING.map((item) => (
              <li key={item.title}>
                <Card className="h-full p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-content-secondary">
                    <Icon name={item.icon} size={20} />
                  </div>
                  <h3 className="mt-5 text-title-sm font-extrabold text-content">{item.title}</h3>
                  <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                    {item.desc}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ─── Selling ─────────────────────────────────────────────────────── */}
      <Section tone="alt" id="selling">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[360px_1fr] lg:gap-20">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+40px)] lg:self-start">
              <SectionHeading
                eyebrow="For sellers"
                title="Selling a car"
                description="You never post a listing yourself. You submit the car, we inspect it, and we publish it under our name."
              />

              <div className="mt-8 rounded-2xl border border-line-soft bg-surface p-6 shadow-card">
                <h3 className="text-body font-extrabold text-content">What it costs</h3>
                <p className="mt-2.5 text-caption leading-relaxed text-content-secondary">
                  A certification fee covers the inspection, the professional photography and the
                  listing. A small success commission applies only when the handover completes.
                  Buyers pay nothing, ever.
                </p>
              </div>

              <div className="mt-4">
                <Button href="/sell" trailingIcon={<Icon name="arrow-right" size={18} />}>
                  Start a submission
                </Button>
              </div>
            </div>

            <StepTimeline steps={SELLING_STEPS} />
          </div>
        </Container>
      </Section>
    </>
  )
}
