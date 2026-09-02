import type { Metadata } from 'next'
import { rateCard as rateCardApi } from '@/lib/api'
import { formatMoneyExact } from '@/lib/business'
import { Button, Card, Container, Icon, Section, type IconName } from '@/components/ui'
import { SITE } from '@/lib/site'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('tools.pricingPage.metaTitle'),
    description: t('tools.pricingPage.metaDescription'),
    alternates: { canonical: '/tools/pricing' },
    openGraph: {
      title: t('tools.pricingPage.ogTitle'),
      description: t('tools.pricingPage.metaDescription'),
      url: `${SITE.url}/tools/pricing`,
      type: 'website',
    },
  }
}

export default async function PricingPage() {
  const [t, rateCard] = await Promise.all([getServerT(), rateCardApi.get()])

  // Never a hard failure: a pricing page that cannot load a number should say
  // so, not throw. `rateCard` is null only if the API was unreachable.
  const lines: { icon: IconName; titleKey: string; bodyKey: string; amount: number | undefined }[] = [
    { icon: 'shield-check', titleKey: 'tools.pricingPage.inspectionTitle', bodyKey: 'tools.pricingPage.inspectionBody', amount: rateCard?.inspection_fee_rwf },
    { icon: 'document', titleKey: 'tools.pricingPage.reportTitle', bodyKey: 'tools.pricingPage.reportBody', amount: rateCard?.report_resale_fee_rwf },
    { icon: 'key', titleKey: 'tools.pricingPage.rentalTitle', bodyKey: 'tools.pricingPage.rentalBody', amount: rateCard?.rental_subscription_monthly_rwf },
  ]

  return (
    <>
      <Section tone="surface" className="pb-10 pt-12 sm:pb-14 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 text-eyebrow font-bold uppercase text-brand">{t('tools.pricingPage.heroEyebrow')}</p>
            <h1 className="text-display font-extrabold text-content">{t('tools.pricingPage.heroTitle')}</h1>
            <p className="mt-5 text-title-sm leading-relaxed text-content-secondary">{t('tools.pricingPage.heroLede')}</p>
          </div>
        </Container>
      </Section>

      <Section className="pt-10 sm:pt-14">
        <Container>
          <div className="grid gap-5 sm:grid-cols-3">
            {lines.map((line) => (
              <Card key={line.titleKey} className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-content-secondary">
                  <Icon name={line.icon} size={22} />
                </span>
                <h2 className="mt-4 text-title-sm font-extrabold text-content">{t(line.titleKey)}</h2>
                <p
                  className="mt-2 text-price font-extrabold tracking-[-0.02em] text-brand tabular-nums"
                  title={line.amount != null ? formatMoneyExact(line.amount) : undefined}
                >
                  {line.amount != null ? formatMoneyExact(line.amount) : '—'}
                </p>
                <p className="mt-3 text-caption leading-relaxed text-content-secondary">{t(line.bodyKey)}</p>
              </Card>
            ))}
          </div>

          {rateCard?.reviewed_on ? (
            <p className="mt-6 text-caption text-content-muted">{t('tools.pricingPage.reviewedNote', { date: rateCard.reviewed_on })}</p>
          ) : null}

          <p className="mt-8 max-w-3xl rounded-xl bg-surface-alt px-5 py-4 text-caption leading-relaxed text-content-secondary">
            {t('tools.pricingPage.disclaimer')}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {/* A walk-in inspection is booked at the office today — there is no
                self-serve web form for it yet, so this sends people to the
                channel that actually books one rather than to /sell, which is
                the different flow for listing your own car with Sawa. */}
            <Button href="/contact" size="lg" trailingIcon={<Icon name="arrow-right" size={18} />}>
              {t('tools.pricingPage.bookInspection')}
            </Button>
            <Button href="/cars" variant="outline" size="lg">
              {t('tools.pricingPage.browseCars')}
            </Button>
          </div>
        </Container>
      </Section>
    </>
  )
}
