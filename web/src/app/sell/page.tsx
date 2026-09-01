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
  { icon: 'chart', key: 'price' },
  { icon: 'user', key: 'contact' },
  { icon: 'document', key: 'agree' },
  { icon: 'cash', key: 'payment' },
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
  const t = await getServerT()
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
              <p className="mb-4 text-eyebrow font-bold uppercase text-white/55">{t('sell.hero.eyebrow')}</p>
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
              <h2 className="text-caption font-bold uppercase tracking-wide text-content-muted">
                {t('sell.hero.freeValuation')}
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
            eyebrow={t('sell.work.eyebrow')}
            title={t('sell.work.title')}
            description={t('sell.work.description')}
          />

          <div className="stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT_WE_DO.map((item) => (
              <Card key={item.key} interactive className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-content-secondary">
                  <Icon name={item.icon} size={22} />
                </span>
                <h3 className="mt-4 text-title-sm font-extrabold text-content">{t(`sell.work.${item.key}.title`)}</h3>
                <p className="mt-2 text-caption leading-relaxed text-content-secondary">{t(`sell.work.${item.key}.body`)}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ─── Pipeline ─────────────────────────────────────────────────────── */}
      <Section id="how" tone="surface">
        <Container>
          <SectionHeading
            eyebrow={t('sell.pipeline.eyebrow')}
            title={t('sell.pipeline.title')}
            description={t('sell.pipeline.description')}
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
            eyebrow={t('sell.boundaries.eyebrow')}
            title={t('sell.boundaries.title')}
            description={t('sell.boundaries.description')}
          />

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            <Card className="p-6">
              <Badge tone="neutral">{t('sell.boundaries.platform')}</Badge>
              <h3 className="mt-4 text-title-sm font-extrabold text-content">{t('sell.boundaries.pubReqTitle')}</h3>
              <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                {t('sell.boundaries.pubReqBody')}
              </p>
            </Card>

            <Card className="p-6">
              <Badge tone="success">{t('sell.boundaries.seller')}</Badge>
              <h3 className="mt-4 text-title-sm font-extrabold text-content">{t('sell.boundaries.commTitle')}</h3>
              <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                {t('sell.boundaries.commBody')}
              </p>
            </Card>

            <Card className="p-6">
              <Badge tone="neutral">{t('sell.boundaries.independent')}</Badge>
              <h3 className="mt-4 text-title-sm font-extrabold text-content">{t('sell.boundaries.contractTitle')}</h3>
              <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                {t('sell.boundaries.contractBody')}
              </p>
            </Card>
          </div>

          <div className="mt-8 flex flex-col gap-3 rounded-2xl bg-ink-900 p-6 text-white sm:flex-row sm:items-center sm:gap-5 sm:p-8">
            <Icon name="info" size={22} className="text-white/70" />
            <p className="text-body leading-relaxed text-white/85">
              <span className="font-extrabold text-white">{t('sell.boundaries.noCheckoutBold')}</span>{t('sell.boundaries.noCheckoutBody')}
            </p>
          </div>
        </Container>
      </Section>

      {/* ─── The one step the web cannot do ───────────────────────────────── */}
      <Section>
        <Container>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="mb-4 text-eyebrow font-bold uppercase text-brand">{t('sell.app.eyebrow')}</p>
              <h2 className="text-headline font-extrabold text-content">
                {t('sell.app.title')}
              </h2>
              <p className="mt-4 text-title-sm leading-relaxed text-content-secondary">
                {t('sell.app.body1')}
              </p>
              <p className="mt-4 text-body leading-relaxed text-content-secondary">
                {t('sell.app.body2')}
              </p>
            </div>

            <Card className="p-6 sm:p-8">
              <h3 className="text-caption font-bold uppercase tracking-wide text-content-muted">
                {t('sell.app.whereTitle')}
              </h3>
              <ul className="mt-5 space-y-3.5">
                {[
                  { where: t('sell.app.whereApp'), what: t('sell.app.step1') },
                  { where: t('sell.app.whereWeb'), what: t('sell.app.step2') },
                  { where: t('sell.app.whereBoth'), what: t('sell.app.step3') },
                  { where: t('sell.app.whereBoth'), what: t('sell.app.step4') },
                  { where: t('sell.app.whereCenter'), what: t('sell.app.step5') },
                  { where: t('sell.app.whereDirect'), what: t('sell.app.step6') },
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
                  {t('sell.app.alreadyHaveApp')}{' '}
                  <Link href="/download" className="font-bold text-brand hover:underline">
                    {t('sell.app.openSellerFlow')}
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

      {/* ─── Close ────────────────────────────────────────────────────────── */}
      <InkClose
        headline={t('sell.close.headline')}
        actions={
          <>
            <Button href="#valuation" size="lg">
              {t('sell.close.valueMy')}
            </Button>
            <Button href="/download" variant="inverse" size="lg">
              {t('sell.close.getApp')}
            </Button>
          </>
        }
      >
        {t('sell.close.body')}
      </InkClose>
    </>
  )
}
