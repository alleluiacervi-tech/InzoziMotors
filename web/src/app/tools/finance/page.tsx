import type { Metadata } from 'next'
import { FinanceCalculator } from '@/components/tools/FinanceCalculator'
import { Button, Card, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { FINANCE_TERMS } from '@/lib/business'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Car finance calculator',
  description:
    'Estimate the monthly repayment on a car loan in Kigali, or work backwards from what you can afford each month. Deposit, term and total interest, in USD and RWF.',
  keywords: [
    'car loan calculator Rwanda',
    'car finance Kigali',
    'monthly car payment Rwanda',
    'vehicle loan RWF',
    'car affordability calculator',
  ],
  alternates: { canonical: '/tools/finance' },
  openGraph: {
    title: 'Car finance calculator',
    description:
      'Monthly repayment, deposit and total interest on a car loan in Kigali — or the car price your monthly budget supports.',
    url: `${SITE.url}/tools/finance`,
    type: 'website',
  },
}

export default function FinancePage() {
  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <Section tone="surface" className="pb-10 pt-12 sm:pb-14 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 text-eyebrow font-bold uppercase text-brand">Free tool</p>
            <h1 className="text-display font-extrabold text-content">Car finance calculator</h1>
            <p className="mt-5 text-title-sm leading-relaxed text-content-secondary">
              Two ways round the same question. Start from a car you have found and see the monthly
              payment, or start from what you can pay each month and see which cars that reaches.
            </p>
          </div>
        </Container>
      </Section>

      {/* ─── Calculator ───────────────────────────────────────────────────── */}
      <Section className="pt-10 sm:pt-14">
        <Container>
          <SectionHeading
            title="Estimate a repayment"
            description={`Calculated at ${FINANCE_TERMS.annualRatePct}% a year — a representative rate for car lending in Kigali, and the same rate behind the monthly figure on every listing card.`}
          />
          <div className="mt-10">
            <FinanceCalculator />
          </div>
        </Container>
      </Section>

      {/* ─── What the estimate leaves out ─────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow="Before you take it to a bank"
            title="Three things that will change this number"
            description="Sawa does not lend and takes no commission from any lender. This tool exists so you walk into the bank knowing roughly what to expect."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: 'chart' as const,
                title: 'Your rate is personal',
                body: `${FINANCE_TERMS.annualRatePct}% a year is a market reference point, not a quote. Banks price on your income, your employment and your history with them, and the rate they offer may sit either side of it.`,
              },
              {
                icon: 'document' as const,
                title: 'Fees are not in here',
                body: 'Arrangement fees, valuation fees and the comprehensive insurance most lenders require are charged separately. They usually add to the monthly figure rather than the price.',
              },
              {
                icon: 'clock' as const,
                title: 'A longer term costs more',
                body: 'Stretching the same loan over more months lowers the payment and raises the total interest. Compare the "total you pay" line, not just the monthly one.',
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

      {/* ─── Close ────────────────────────────────────────────────────────── */}
      <Section tone="ink">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-headline font-extrabold text-white">
              Payment still happens at the center
            </h2>
            <p className="mt-4 text-title-sm leading-relaxed text-white/70">
              However you fund it, money changes hands in person on handover day — never through
              the app or the website. Your bank pays at the center, we complete the RRA transfer
              with you, and the 7-day guarantee starts that day.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href="/cars" size="lg" trailingIcon={<Icon name="arrow-right" size={18} />}>
                Browse certified cars
              </Button>
              <Button
                href="/how-it-works"
                variant="dark"
                size="lg"
                className="border border-white/20"
              >
                How buying works
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}
