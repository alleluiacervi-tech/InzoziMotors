import type { Metadata } from 'next'
import { DutyCalculator } from '@/components/tools/DutyCalculator'
import { Button, Card, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { SITE } from '@/lib/site'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('tools.dutyPage.metaTitle'),
    description: t('tools.dutyPage.metaDescription'),
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
      title: t('tools.dutyPage.ogTitle'),
      description: t('tools.dutyPage.ogDescription'),
      url: `${SITE.url}/tools/import-duty`,
      type: 'website',
    },
  }
}

// The order duty is applied in. Rates are deliberately absent from this prose —
// they are derived from the live calculation in the breakdown, so the two can
// never disagree.
const CHAIN: { titleKey: string; bodyKey: string }[] = [
  { titleKey: 'tools.dutyPage.cifTitle', bodyKey: 'tools.dutyPage.cifBody' },
  { titleKey: 'tools.dutyPage.customsTitle', bodyKey: 'tools.dutyPage.customsBody' },
  { titleKey: 'tools.dutyPage.exciseTitle', bodyKey: 'tools.dutyPage.exciseBody' },
  { titleKey: 'tools.dutyPage.vatTitle', bodyKey: 'tools.dutyPage.vatBody' },
  { titleKey: 'tools.dutyPage.infraTitle', bodyKey: 'tools.dutyPage.infraBody' },
]

export default async function ImportDutyPage() {
  const t = await getServerT()
  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <Section tone="surface" className="pb-10 pt-12 sm:pb-14 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 text-caption font-bold text-brand">{t('tools.dutyPage.heroEyebrow')}</p>
            <h1 className="text-display font-extrabold text-content">
              {t('tools.dutyPage.heroTitle')}
            </h1>
            <p className="mt-5 text-title-sm leading-relaxed text-content-secondary">
              {t('tools.dutyPage.heroLede')}
            </p>
          </div>
        </Container>
      </Section>

      {/* ─── Calculator ───────────────────────────────────────────────────── */}
      <Section className="pt-10 sm:pt-14">
        <Container>
          <SectionHeading
            title={t('tools.dutyPage.landedTitle')}
            description={t('tools.dutyPage.landedDescription')}
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
            eyebrow={t('tools.dutyPage.chainEyebrow')}
            title={t('tools.dutyPage.chainTitle')}
            description={t('tools.dutyPage.chainDescription')}
          />

          <ol className="mt-12 max-w-3xl">
            {CHAIN.map((step, index) => (
              <li key={step.titleKey} className="flex gap-4 sm:gap-6">
                <div className="flex flex-col items-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-caption font-extrabold text-white">
                    {index + 1}
                  </span>
                  {index < CHAIN.length - 1 ? (
                    <span aria-hidden="true" className="mt-2 w-px flex-1 bg-line" />
                  ) : null}
                </div>
                <div className={index < CHAIN.length - 1 ? 'pb-8' : ''}>
                  <h3 className="text-title-sm font-extrabold text-content">{t(step.titleKey)}</h3>
                  <p className="mt-1.5 text-body leading-relaxed text-content-secondary">
                    {t(step.bodyKey)}
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
            eyebrow={t('tools.dutyPage.limitsEyebrow')}
            title={t('tools.dutyPage.limitsTitle')}
            description={t('tools.dutyPage.limitsDescription')}
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: 'document' as const,
                title: t('tools.dutyPage.rraTitle'),
                body: t('tools.dutyPage.rraBody'),
              },
              {
                icon: 'clock' as const,
                title: t('tools.dutyPage.ageTitle'),
                body: t('tools.dutyPage.ageBody'),
              },
              {
                icon: 'cash' as const,
                title: t('tools.dutyPage.clearingTitle'),
                body: t('tools.dutyPage.clearingBody'),
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
              {t('tools.dutyPage.altTitle')}
            </h2>
            <p className="mt-4 text-title-sm leading-relaxed text-white/70">
              {t('tools.dutyPage.altBody')}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href="/cars" size="lg" trailingIcon={<Icon name="arrow-right" size={18} />}>
                {t('tools.dutyPage.browse')}
              </Button>
              <Button
                href="/tools/finance"
                variant="dark"
                size="lg"
                className="border border-white/20"
              >
                {t('tools.dutyPage.financeCalc')}
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}
