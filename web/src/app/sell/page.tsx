import type { Metadata } from 'next'
import Link from 'next/link'
import { StoreButtons } from '@/components/app/StoreButtons'
import { ValuationTool } from '@/components/tools/ValuationTool'
import {
  Badge,
  Button,
  Card,
  Container,
  Icon,
  Section,
  SectionHeading,
  type IconName,
} from '@/components/ui'
import { cars } from '@/lib/api'
import { CENTERS, FAQS, SITE } from '@/lib/site'
import { InkClose } from '@/components/layout/InkClose'
import { LISTING_PIPELINE, PipelineModules } from '@/components/marketing/PipelineModules'

// The page reads live inventory (catalogue makes for the valuation) — render
// it per request like /cars, never at build. Prerendering it made the BUILD
// depend on API reachability, which is exactly the coupling the rest of the
// site is designed to avoid.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sell your car in Kigali',
  description:
    'Bring your car to an Sawa center once. We run the 150-point inspection, shoot the 36 standard photos, publish the listing, verify the buyer and process the RRA transfer. Free valuation, no account needed.',
  alternates: { canonical: '/sell' },
  openGraph: {
    title: `Sell your car with ${SITE.name}`,
    description:
      'We inspect, photograph, list, find the buyer and handle the RRA transfer. You keep control of the price.',
    url: `${SITE.url}/sell`,
    type: 'website',
  },
}

// ─── What the seller hands over, and what we hand back ───────────────────────

const WHAT_WE_DO: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'shield-check',
    title: 'We inspect it properly',
    body: 'A 150-point check across engine and drivetrain, brakes and steering, body, interior, electronics, tyres and documentation. Every item is graded pass, flag or fail, and the full report is published with your listing.',
  },
  {
    icon: 'camera',
    title: 'We photograph it',
    body: 'Our photographers shoot the same 36 angles on every car — exteriors, wheels, engine bay, odometer, VIN plate, interior, and honest close-ups of anything the inspection flagged.',
  },
  {
    icon: 'chart',
    title: 'We price it on evidence',
    body: 'We show you what comparable cars are listed and sold for on Sawa, then you set the asking price. You can change it at any time while the car is live.',
  },
  {
    icon: 'user',
    title: 'We verify the buyer',
    body: 'Buyers request through Sawa, not through your phone number. Your car is reserved for one buyer at a time, and we confirm who they are before a handover is scheduled.',
  },
  {
    icon: 'document',
    title: 'We process the transfer',
    body: 'The RRA ownership transfer is completed with both of you at the center. New registration documents typically complete within two to three working days.',
  },
  {
    icon: 'cash',
    title: 'Payment happens in person',
    body: 'Money changes hands at the center on handover day — never through the app, never through the website. Nobody pays a deposit to hold your car.',
  },
]

/** Seller-side questions, pulled from the shared FAQ set so the site and the
 *  app answer them with the same words. */
const SELLER_QUESTIONS: readonly string[] = [
  'What does it cost to sell?',
  'Can sellers list cars themselves?',
  'Do I pay anything through the app or website?',
  'Do I need the mobile app, or can I do everything on the web?',
]

/**
 * Makes that actually exist in the live catalogue. The valuation can only find
 * comparables for these, so suggesting them is honest help rather than a
 * decorative dropdown. An unreachable API just means no suggestions.
 */
async function catalogueMakes(): Promise<string[]> {
  try {
    const live = await cars.list({ limit: 100 })
    return [...new Set(live.map((car) => car.make).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    )
  } catch {
    return []
  }
}

export default async function SellPage() {
  const makes = await catalogueMakes()
  const currentYear = new Date().getFullYear()
  const sellerFaqs = FAQS.filter((faq) => SELLER_QUESTIONS.includes(faq.q))

  return (
    <>
      {/* ─── Hero — the valuation IS the hero ─────────────────────────────── */}
      <Section tone="surface" id="valuation" className="pb-12 pt-12 sm:pb-16 sm:pt-20">
        <Container>
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="mb-4 text-eyebrow font-bold uppercase text-brand">Sell your car</p>
              <h1 className="text-display font-extrabold text-content">
                What&apos;s your car worth in Kigali?
              </h1>
              <p className="mt-5 max-w-prose text-title-sm leading-relaxed text-content-secondary">
                Priced from cars actually listed and sold on Sawa — never a lookup table. If the
                number works, we inspect it on 150 points, photograph it to one standard, publish
                the listing, verify the buyer and process the RRA transfer with you at the center.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  'The valuation takes about ten seconds and needs no account',
                  'You keep control of the price the whole way',
                  'Buyers pay nothing — demand on your listing stays high',
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <Icon name="check-circle" size={20} className="mt-0.5 shrink-0 text-success" />
                    <span className="text-body leading-relaxed text-content">{line}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-caption text-content-muted">
                <Link href="#cost" className="font-bold text-brand hover:underline">
                  See what selling costs
                </Link>{' '}
                — two charges, both quoted before you commit.
              </p>
            </div>

            <Card className="p-6 sm:p-8">
              <h2 className="text-caption font-bold uppercase tracking-wide text-content-muted">
                Free valuation
              </h2>
              <div className="mt-4">
                <ValuationTool makes={makes} currentYear={currentYear} />
              </div>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ─── What we take on ──────────────────────────────────────────────── */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="The work we do"
            title="Six jobs you no longer have to do yourself"
            description="Selling privately in Kigali means photographing the car, fielding calls, meeting strangers, and hoping the paperwork goes through. This is the same sale without any of that."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT_WE_DO.map((item) => (
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

      {/* ─── Pipeline ─────────────────────────────────────────────────────── */}
      <Section id="how" tone="surface">
        <Container>
          <SectionHeading
            eyebrow="How selling works"
            title="Six steps, and you know where you are at every one"
            description="Your submission carries a status from the moment you send it until the day the car is handed over. Nothing happens without you being told."
          />

          <div className="mt-12">
            <PipelineModules steps={LISTING_PIPELINE} />
          </div>
        </Container>
      </Section>

      {/* ─── Cost ─────────────────────────────────────────────────────────── */}
      <Section id="cost" tone="surface">
        <Container>
          <SectionHeading
            eyebrow="What it costs"
            title="Two charges, both explained before you commit"
            description="We do not take a cut of a sale we did not complete, and we do not add fees at handover."
          />

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            <Card className="p-6">
              <Badge tone="neutral">Paid once, upfront</Badge>
              <h3 className="mt-4 text-title-sm font-extrabold text-content">Certification fee</h3>
              <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                Covers the 150-point inspection, the professional photography and publishing your
                listing. It pays for real work by real people, which is why it is charged whether
                or not the car sells. We confirm the amount with you before your inspection is
                booked — never after.
              </p>
            </Card>

            <Card className="p-6">
              <Badge tone="success">Only when it sells</Badge>
              <h3 className="mt-4 text-title-sm font-extrabold text-content">Success commission</h3>
              <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                A small share of the sale price, charged when the handover completes at an Sawa
                center. It is quoted with your certification fee, before inspection. If the car
                does not sell, there is nothing to pay.
              </p>
            </Card>

            <Card className="p-6">
              <Badge tone="neutral">Optional</Badge>
              <h3 className="mt-4 text-title-sm font-extrabold text-content">Featured placement</h3>
              <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                Moves your listing to the top of browse for a set number of days. Useful on a
                crowded model, unnecessary on a rare one. Never applied unless you ask for it.
              </p>
            </Card>
          </div>

          <div className="mt-8 flex flex-col gap-3 rounded-2xl bg-ink-900 p-6 text-white sm:flex-row sm:items-center sm:gap-5 sm:p-8">
            <Icon name="info" size={22} className="text-white/70" />
            <p className="text-body leading-relaxed text-white/85">
              <span className="font-extrabold text-white">Buyers pay nothing, ever.</span> No
              buyer&apos;s premium, no booking fee, no charge to see the inspection report. That is
              deliberate — it keeps demand on your listing as high as it can be.
            </p>
          </div>
        </Container>
      </Section>

      {/* ─── The one step the web cannot do ───────────────────────────────── */}
      <Section>
        <Container>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="mb-4 text-eyebrow font-bold uppercase text-brand">Before you start</p>
              <h2 className="text-headline font-extrabold text-content">
                One step has to happen in the app
              </h2>
              <p className="mt-4 text-title-sm leading-relaxed text-content-secondary">
                Submitting a car requires a one-time identity check: a photo of your national ID,
                front and back, and a selfie. A browser cannot capture those reliably enough for us
                to stand behind them, so this single step happens in the Sawa Cars app. It takes about
                two minutes, and you never do it again.
              </p>
              <p className="mt-4 text-body leading-relaxed text-content-secondary">
                It is also the reason there are no fake listings on Sawa. Every seller on this
                marketplace is a verified person, checked by our team.
              </p>
            </div>

            <Card className="p-6 sm:p-8">
              <h3 className="text-caption font-bold uppercase tracking-wide text-content-muted">
                Where each step happens
              </h3>
              <ul className="mt-5 space-y-3.5">
                {[
                  { where: 'App', what: 'Identity verification and submitting a car' },
                  { where: 'Web', what: 'Free valuation and browsing the market' },
                  { where: 'Both', what: 'Tracking your submission through the pipeline' },
                  { where: 'Both', what: 'Messages from buyers, and changing your price' },
                  { where: 'Center', what: 'Inspection, photography, handover and RRA transfer' },
                ].map((row) => (
                  <li key={row.what} className="flex items-start gap-3">
                    <span className="mt-0.5 w-[52px] shrink-0 rounded-pill bg-surface-alt px-2 py-1 text-center text-micro font-bold uppercase tracking-wide text-content-muted">
                      {row.where}
                    </span>
                    <span className="text-body leading-relaxed text-content-secondary">
                      {row.what}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 border-t border-line-soft pt-6">
                <StoreButtons size="sm" />
                <p className="mt-4 text-micro leading-relaxed text-content-muted">
                  Already have the app?{' '}
                  <Link href="/download" className="font-bold text-brand hover:underline">
                    Open the seller flow
                  </Link>
                  .
                </p>
              </div>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ─── Centers ──────────────────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow="Where you bring it"
            title="Three centers across Kigali"
            description="Inspection, photography and handover all happen at the center you choose. Bring the car, your ID and any service records you have."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CENTERS.map((center) => (
              <Card key={center.id} className="p-6">
                <h3 className="text-title-sm font-extrabold text-content">{center.name}</h3>
                <p className="mt-3 flex items-start gap-2.5 text-caption leading-relaxed text-content-secondary">
                  <Icon name="location" size={17} className="mt-0.5 text-content-muted" />
                  {center.address}
                </p>
                <p className="mt-2 flex items-start gap-2.5 text-caption leading-relaxed text-content-secondary">
                  <Icon name="clock" size={17} className="mt-0.5 text-content-muted" />
                  {center.hours}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
      {sellerFaqs.length ? (
        <Section>
          <Container>
            <SectionHeading eyebrow="Questions" title="What sellers ask us first" />

            <div className="mt-10 max-w-3xl divide-y divide-line-soft border-y border-line-soft">
              {sellerFaqs.map((faq) => (
                <details key={faq.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-title-sm font-extrabold text-content [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <Icon
                      name="chevron-down"
                      size={20}
                      className="shrink-0 text-content-muted transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-3 max-w-prose text-body leading-relaxed text-content-secondary">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ─── Close ────────────────────────────────────────────────────────── */}
      <InkClose
        headline="Find out what it is worth first"
        actions={
          <>
            <Button href="#valuation" size="lg">
              Value my car
            </Button>
            <Button href="/download" variant="inverse" size="lg">
              Get the app to submit
            </Button>
          </>
        }
      >
        The valuation costs nothing and commits you to nothing. If the number works, verify
        your ID in the app and book an inspection at the center nearest you.
      </InkClose>
    </>
  )
}
