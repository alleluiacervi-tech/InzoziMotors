import type { Metadata } from 'next'
import { FinanceCalculator } from '@/components/tools/FinanceCalculator'
import { Button, Card, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { FINANCE_TERMS } from '@/lib/business'
import { SITE } from '@/lib/site'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('tools.financePage.metaTitle'),
    description: t('tools.financePage.metaDescription'),
    keywords: [
      'car loan calculator Rwanda',
      'car finance Kigali',
      'monthly car payment Rwanda',
      'vehicle loan RWF',
      'car affordability calculator',
    ],
    alternates: { canonical: '/tools/finance' },
    openGraph: {
      title: t('tools.financePage.ogTitle'),
      description: t('tools.financePage.ogDescription'),
      url: `${SITE.url}/tools/finance`,
      type: 'website',
    },
  }
}

export default async function FinancePage() {
  const t = await getServerT()
  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <Section tone="surface" className="pb-10 pt-12 sm:pb-14 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 text-eyebrow font-bold uppercase text-brand">{t('tools.financePage.heroEyebrow')}</p>
            <h1 className="text-display font-extrabold text-content">{t('tools.financePage.heroTitle')}</h1>
            <p className="mt-5 text-title-sm leading-relaxed text-content-secondary">
              {t('tools.financePage.heroLede')}
            </p>
          </div>
        </Container>
      </Section>

      {/* ─── Calculator ───────────────────────────────────────────────────── */}
      <Section className="pt-10 sm:pt-14">
        <Container>
          <SectionHeading
            title={t('tools.financePage.estimateTitle')}
            description={t('tools.financePage.estimateDescription', { rate: FINANCE_TERMS.annualRatePct })}
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
            eyebrow={t('tools.financePage.beforeEyebrow')}
            title={t('tools.financePage.beforeTitle')}
            description={t('tools.financePage.beforeDescription')}
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: 'chart' as const,
                title: t('tools.financePage.rateTitle'),
                body: t('tools.financePage.rateBody', { rate: FINANCE_TERMS.annualRatePct }),
              },
              {
                icon: 'document' as const,
                title: t('tools.financePage.feesTitle'),
                body: t('tools.financePage.feesBody'),
              },
              {
                icon: 'clock' as const,
                title: t('tools.financePage.termTitle'),
                body: t('tools.financePage.termBody'),
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
              {t('tools.financePage.closeTitle')}
            </h2>
            <p className="mt-4 text-title-sm leading-relaxed text-white/70">
              {t('tools.financePage.closeBody')}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href="/cars" size="lg" trailingIcon={<Icon name="arrow-right" size={18} />}>
                {t('tools.financePage.browse')}
              </Button>
              <Button
                href="/how-it-works"
                variant="dark"
                size="lg"
                className="border border-white/20"
              >
                {t('tools.financePage.howBuying')}
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}
