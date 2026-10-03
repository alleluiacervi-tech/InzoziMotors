import type { Metadata } from 'next'
import Link from 'next/link'
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
import { cars, rateCard } from '@/lib/api'
import { formatMoneyExact } from '@/lib/business'
import { FAQS, SITE } from '@/lib/site'
import { getDisplayCenters } from '@/lib/centers'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbNode, graph, serviceNode } from '@/lib/seo'
import { getServerT } from '@/lib/i18n/server'

// The page reads live inventory (catalogue makes for the valuation) — render
// it per request like /cars, never at build. Prerendering it made the BUILD
// depend on API reachability, which is exactly the coupling the rest of the
// site is designed to avoid.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('sell.metaTitle'),
    description: t('sell.metaDescription'),
    alternates: { canonical: '/sell' },
    openGraph: {
      title: t('sell.metaOgTitle', { name: SITE.name }),
      description: t('sell.metaOgDescription'),
      url: `${SITE.url}/sell`,
      type: 'website',
    },
  }
}

// ─── What the seller hands over, and what we hand back ───────────────────────

const WHAT_WE_DO: { icon: IconName; key: string }[] = [
  { icon: 'shield-check', key: 'inspect' },
  { icon: 'camera', key: 'photograph' },
  { icon: 'document', key: 'publish' },
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

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? ''
  // The homepage's sell strip submits make and year here; anything else is ignored.
  const initialMake = one(params.make).slice(0, 40)
  const initialYear = /^\d{4}$/.test(one(params.year)) ? one(params.year) : ''
  const t = await getServerT()
  const makes = await catalogueMakes()
  const centers = await getDisplayCenters()
  const rates = await rateCard.get()
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
              <p className="mb-4 text-caption font-bold text-white/55">{t('sell.hero.eyebrow')}</p>
              <h1 className="text-display-xl font-extrabold text-white">
                {t('sell.hero.title')}
              </h1>
              <p className="mt-5 max-w-prose text-title-sm leading-relaxed text-white/70">
                {t('sell.hero.subtitle')}
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  t('sell.hero.bullet1'),
                  t('sell.hero.bullet2'),
                  t('sell.hero.bullet3'),
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <Icon name="check-circle" size={20} className="mt-0.5 shrink-0 text-white" />
                    <span className="text-body leading-relaxed text-white/85">{line}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-caption text-white/55">
                <Link href="#cost" className="font-bold text-white hover:underline">
                  {t('sell.hero.seeCost')}
                </Link>{' '}
                {t('sell.hero.costNote')}
              </p>
            </div>

            <Card className="relative overflow-hidden rounded-3xl border-white/10 p-6 shadow-float sm:p-8">
              <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-brand-bright to-brand-deep" />
              <h2 className="text-caption font-bold text-content-muted">
                {t('sell.hero.freeValuation')}
              </h2>
              <div className="mt-4">
                <ValuationTool makes={makes} currentYear={currentYear} initialMake={initialMake} initialYear={initialYear} />
              </div>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ─── What we do for you ───────────────────────────────────────────── */}
      <Section>
        <Container>
          <SectionHeading title={t('sell.work.title')} description={t('sell.work.description')} />

          <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-3">
            {WHAT_WE_DO.map((item) => (
              <li key={item.key} className="min-w-0 border-t border-line pt-5">
                <Icon name={item.icon} size={22} className="text-content-muted" aria-hidden="true" />
                <h3 className="mt-3 text-title-sm font-extrabold text-content">{t(`sell.work.${item.key}.title`)}</h3>
                <p className="mt-2 text-body leading-relaxed text-content-secondary">{t(`sell.work.${item.key}.body`)}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ─── What it costs, and the start button ──────────────────────────── */}
      <Section id="cost" tone="surface">
        <Container>
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-16">
            <div className="min-w-0 lg:col-span-7">
              <h2 className="text-headline font-extrabold text-content">{t('sell.cost.title')}</h2>
              <dl className="mt-6 divide-y divide-line-soft border-y border-line-soft">
                <div className="flex items-baseline justify-between gap-6 py-4">
                  <dt className="min-w-0">
                    <span className="block text-body font-bold text-content">{t('sell.cost.inspection')}</span>
                    <span className="mt-0.5 block text-caption text-content-secondary">{t('sell.cost.inspectionNote')}</span>
                  </dt>
                  <dd className="tnum shrink-0 text-title font-extrabold text-content">
                    {rates?.inspection_fee_rwf != null ? formatMoneyExact(rates.inspection_fee_rwf) : t('sell.cost.atCentre')}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-6 py-4">
                  <dt className="min-w-0 text-body font-bold text-content">{t('sell.cost.free')}</dt>
                  <dd className="shrink-0 text-title font-extrabold text-content">{t('sell.cost.freeValue')}</dd>
                </div>
              </dl>
              {rates?.reviewed_on ? (
                <p className="mt-3 text-caption text-content-muted">
                  {t('tools.pricingPage.reviewedNote', { date: rates.reviewed_on })}{' '}
                  <Link href="/tools/pricing" className="font-bold text-content underline decoration-line underline-offset-4 hover:decoration-content">
                    {t('sell.cost.allPrices')}
                  </Link>
                </p>
              ) : null}
            </div>
            <div className="min-w-0 lg:col-span-5">
              <p className="text-body leading-relaxed text-content-secondary">{t('sell.cost.bookLede')}</p>
              <Button href="/sell/submit" size="lg" className="mt-5" fullWidth trailingIcon={<Icon name="arrow-right" size={18} />}>
                {t('sell.cost.book')}
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── Centers ──────────────────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow={t('sell.centers.eyebrow')}
            title={t('sell.centers.title')}
            description={t('sell.centers.description')}
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
            <SectionHeading eyebrow={t('sell.faq.eyebrow')} title={t('sell.faq.title')} />

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

    </>
  )
}
