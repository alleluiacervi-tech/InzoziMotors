import type { Metadata } from 'next'
import { DutyCalculator } from '@/components/tools/DutyCalculator'
import { Button, Card, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Rwanda import duty calculator',
  description:
    'Estimate RRA import duty on a vehicle brought into Rwanda: CIF value, customs duty, excise by engine size, VAT and the infrastructure levy — with the landed cost in both USD and RWF.',
  keywords: [
    'Rwanda import duty calculator',
    'RRA car duty Rwanda',
    'import car to Rwanda cost',
    'Rwanda customs duty vehicle',
    'excise duty Rwanda car',
    'landed cost car Kigali',
  ],
  alternates: { canonical: '/tools/import-duty' },
  openGraph: {
    title: 'Rwanda import duty calculator',
    description:
      'Customs, excise, VAT and the infrastructure levy on an imported vehicle — the full RRA breakdown in USD and RWF.',
    url: `${SITE.url}/tools/import-duty`,
    type: 'website',
  },
}

// The order duty is applied in. Rates are deliberately absent from this prose —
// they are derived from the live calculation in the breakdown, so the two can
// never disagree.
const CHAIN: { title: string; body: string }[] = [
  {
    title: 'CIF value',
    body: 'Everything starts here: the price you pay the exporter plus the cost of getting the car to Rwanda — freight and insurance. Duty is charged on this figure, not on your invoice alone.',
  },
  {
    title: 'Customs duty',
    body: 'The East African Community external tariff, charged as a percentage of the CIF value. It is the same on every imported car regardless of engine size.',
  },
  {
    title: 'Excise duty',
    body: 'The one charge that moves with the car. Bigger engines attract a higher rate, which is why a 3.0-litre SUV and a 1.5-litre saloon of the same value land at very different totals.',
  },
  {
    title: 'VAT',
    body: 'Charged on the CIF value plus customs and excise together — so VAT is paid on the duties as well as on the car. This is the step most people leave out of their own sums.',
  },
  {
    title: 'Infrastructure levy',
    body: 'A small percentage of CIF, applied on top. It is minor next to the others but it is not zero.',
  },
]

export default function ImportDutyPage() {
  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <Section tone="surface" className="pb-10 pt-12 sm:pb-14 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 text-eyebrow font-bold uppercase text-brand">Free tool</p>
            <h1 className="text-display font-extrabold text-content">
              Rwanda import duty calculator
            </h1>
            <p className="mt-5 text-title-sm leading-relaxed text-content-secondary">
              Most cars in Rwanda are imported, so the sticker price abroad is only half the
              question. Work out what RRA will add — customs, excise, VAT and the infrastructure
              levy — before you commit to a car you have not seen.
            </p>
          </div>
        </Container>
      </Section>

      {/* ─── Calculator ───────────────────────────────────────────────────── */}
      <Section className="pt-10 sm:pt-14">
        <Container>
          <SectionHeading
            title="Work out the landed cost"
            description="Enter what you would pay the exporter and pick the engine size. The breakdown updates as you type."
          />
          <div className="mt-10">
            <DutyCalculator />
          </div>
        </Container>
      </Section>

      {/* ─── How it stacks up ─────────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow="How it is built"
            title="Duty is charged in a chain"
            description="Each step is calculated on the step before it, which is why the total climbs faster than people expect. The percentages shown against each line in the breakdown come from the same calculation, not from this page."
          />

          <ol className="mt-12 max-w-3xl">
            {CHAIN.map((step, index) => (
              <li key={step.title} className="flex gap-4 sm:gap-6">
                <div className="flex flex-col items-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-caption font-extrabold text-white">
                    {index + 1}
                  </span>
                  {index < CHAIN.length - 1 ? (
                    <span aria-hidden="true" className="mt-2 w-px flex-1 bg-line" />
                  ) : null}
                </div>
                <div className={index < CHAIN.length - 1 ? 'pb-8' : ''}>
                  <h3 className="text-title-sm font-extrabold text-content">{step.title}</h3>
                  <p className="mt-1.5 text-body leading-relaxed text-content-secondary">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ─── Limits of the estimate ───────────────────────────────────────── */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Read this before you budget"
            title="What this calculator cannot know"
            description="It is a planning figure. Treat the gap between it and the real assessment as the risk you are carrying."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: 'document' as const,
                title: 'RRA values the car itself',
                body: 'The assessment is made against RRA’s own valuation of the vehicle, which may be higher or lower than the price on your invoice. Your purchase price is an input, not the answer.',
              },
              {
                icon: 'clock' as const,
                title: 'Age and condition move it',
                body: 'Depreciation allowances, the year of manufacture and the body type all affect the assessed value. Two cars bought for the same money can clear at different totals.',
              },
              {
                icon: 'cash' as const,
                title: 'Clearing costs sit on top',
                body: 'Port handling, transport from Dar es Salaam or Mombasa, clearing agent fees, registration and first insurance are all real and none of them are in this figure.',
              },
            ].map((item) => (
              <Card key={item.title} className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-content-secondary">
                  <Icon name={item.icon} size={22} />
                </span>
                <h3 className="mt-4 text-title-sm font-extrabold text-content">{item.title}</h3>
                <p className="mt-2 text-caption leading-relaxed text-content-secondary">{item.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ─── The alternative ──────────────────────────────────────────────── */}
      <Section tone="ink">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-headline font-extrabold text-white">
              Or buy a car that has already landed
            </h2>
            <p className="mt-4 text-title-sm leading-relaxed text-white/70">
              Every car on Inzozi is already in Rwanda, duty settled. Its documentation — including
              the RRA duty stamp — is checked during the 150-point inspection and published on the
              listing, so the price you see is the price you pay.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href="/cars" size="lg" trailingIcon={<Icon name="arrow-right" size={18} />}>
                Browse certified cars
              </Button>
              <Button
                href="/tools/finance"
                variant="dark"
                size="lg"
                className="border border-white/20"
              >
                Finance calculator
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}
