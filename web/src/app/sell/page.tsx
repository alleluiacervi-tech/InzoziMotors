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
import { FAQS, SITE } from '@/lib/site'
import { getDisplayCenters } from '@/lib/centers'
import { InkClose } from '@/components/layout/InkClose'
import { LISTING_PIPELINE, PipelineModules } from '@/components/marketing/PipelineModules'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbNode, graph, serviceNode } from '@/lib/seo'

// The page reads live inventory (catalogue makes for the valuation) — render
// it per request like /cars, never at build. Prerendering it made the BUILD
// depend on API reachability, which is exactly the coupling the rest of the
// site is designed to avoid.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sell your car in Kigali, Rwanda — valuation and inspection',
  description:
    'Submit your vehicle for seller verification, inspection and controlled publication on Sawa Cars. Manage direct buyer enquiries and keep control of your price.',
  alternates: { canonical: '/sell' },
  openGraph: {
    title: `Sell your car with ${SITE.name}`,
    description:
      'We review, inspect and publish verified listings. You communicate and agree any sale directly with the buyer.',
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
    body: 'We add a clear, truthful gallery with the useful exterior, interior, document and defect views this particular vehicle needs. There is no fixed angle count.',
  },
  {
    icon: 'chart',
    title: 'We price it on evidence',
    body: 'We show you what comparable cars are listed and sold for on Sawa Cars, then you set the asking price. You can change it at any time while the car is live.',
  },
  {
    icon: 'user',
    title: 'You choose your contact channels',
    body: 'Use in-app messages, or opt in to phone and WhatsApp disclosure. Direct details are released only after a signed-in buyer acknowledges the marketplace notice.',
  },
  {
    icon: 'document',
    title: 'You agree the sale directly',
    body: 'You and the buyer decide the price, payment, viewing, written contract, ownership transfer and delivery without making Sawa Cars a party.',
  },
  {
    icon: 'cash',
    title: 'Sawa never holds the payment',
    body: 'There is no platform checkout or escrow. Verify the buyer and recipient, document your terms and retain proof of any independent payment.',
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
  const centers = await getDisplayCenters()
  const currentYear = new Date().getFullYear()
  const sellerFaqs = FAQS.filter((faq) => SELLER_QUESTIONS.includes(faq.q))

  return (
    <>
      <JsonLd data={graph(
        serviceNode({
          id: 'sell-car-kigali',
          name: 'Sell your car in Kigali with Sawa Cars',
          description: 'Car valuation, 150-point inspection, photography, buyer verification and RRA ownership transfer support in Kigali.',
          path: '/sell',
          serviceType: 'Vehicle selling service',
        }),
        breadcrumbNode([{ name: 'Home', path: '/' }, { name: 'Sell your car', path: '/sell' }])
      )} />
      {/* ─── Hero — the valuation IS the hero ─────────────────────────────── */}
      <Section tone="ink" id="valuation" className="relative isolate overflow-hidden pb-14 pt-14 sm:pb-20 sm:pt-20">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_15%,rgba(204,5,15,0.30),transparent_32%),radial-gradient(circle_at_88%_85%,rgba(255,255,255,0.08),transparent_28%)]" />
        <Container>
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="mb-4 text-eyebrow font-bold uppercase text-white/55">Sell your car</p>
              <h1 className="text-display-xl font-extrabold text-white">
                What&apos;s your car worth in Kigali?
              </h1>
              <p className="mt-5 max-w-prose text-title-sm leading-relaxed text-white/70">
                Priced from cars actually listed and sold on Sawa Cars — never a lookup table. If the
                 number works, we inspect it, create a useful gallery and publish only after admin
                 review. You then manage verified buyer enquiries and any agreement directly.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  'The valuation takes about ten seconds and needs no account',
                  'You keep control of the price the whole way',
                   'You control whether buyers can request phone or WhatsApp contact',
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <Icon name="check-circle" size={20} className="mt-0.5 shrink-0 text-white" />
                    <span className="text-body leading-relaxed text-white/85">{line}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-caption text-white/55">
                <Link href="#cost" className="font-bold text-white hover:underline">
                  See what selling costs
                </Link>{' '}
                — two charges, both quoted before you commit.
              </p>
            </div>

            <Card className="relative overflow-hidden rounded-3xl border-white/10 p-6 shadow-float sm:p-8">
              <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-brand-bright to-brand-deep" />
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

          <div className="stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT_WE_DO.map((item) => (
              <Card key={item.title} interactive className="p-6">
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
            title="Five steps, and you know where you are at every one"
            description="Your submission carries a status from verification through inspection, publication and any seller-reported close."
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
            eyebrow="Clear boundaries"
            title="What the platform controls—and what you control"
            description="The publication workflow is managed by Sawa Cars. The transaction workflow belongs to you and the buyer."
          />

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            <Card className="p-6">
              <Badge tone="neutral">Platform</Badge>
              <h3 className="mt-4 text-title-sm font-extrabold text-content">Publication requirements</h3>
              <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                Your account must be active and verified, the required inspection must be complete,
                and the listing needs a valid gallery before an administrator can make it public.
              </p>
            </Card>

            <Card className="p-6">
              <Badge tone="success">Seller</Badge>
              <h3 className="mt-4 text-title-sm font-extrabold text-content">Direct buyer communication</h3>
              <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                Reply in the platform or enable phone and WhatsApp. Keep the listing accurate,
                disclose material changes and pause or mark it sold when it is no longer available.
              </p>
            </Card>

            <Card className="p-6">
              <Badge tone="neutral">Independent</Badge>
              <h3 className="mt-4 text-title-sm font-extrabold text-content">Contract and payment</h3>
              <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                You and the buyer are responsible for inspection, price, payment, ownership
                transfer, delivery and written terms. Sawa Cars does not hold money or guarantee the deal.
              </p>
            </Card>
          </div>

          <div className="mt-8 flex flex-col gap-3 rounded-2xl bg-ink-900 p-6 text-white sm:flex-row sm:items-center sm:gap-5 sm:p-8">
            <Icon name="info" size={22} className="text-white/70" />
            <p className="text-body leading-relaxed text-white/85">
              <span className="font-extrabold text-white">No Sawa transaction checkout.</span> Contacting you is an inquiry only; it does not reserve the vehicle or create a contract with Sawa Cars.
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
                You can submit the car first. Before the listing or your direct contact details can
                become public, complete a one-time identity check: a photo of your national ID, front
                and back, and a selfie. The capture happens in the Sawa Cars app, takes about two
                minutes, and only needs to be approved once.
              </p>
              <p className="mt-4 text-body leading-relaxed text-content-secondary">
                It is also the reason there are no fake listings on Sawa Cars. Every seller on this
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
                  { where: 'Center', what: 'Vehicle inspection and listing evidence where required' },
                  { where: 'Direct', what: 'Viewing, negotiation, contract, payment, transfer and delivery' },
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
            title="Inspection centers across Kigali"
            description="Inspection services happen at the center you choose. Bring the car, your ID and any service records you have."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {centers.map((center) => (
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
