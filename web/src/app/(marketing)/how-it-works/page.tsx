import type { Metadata } from 'next'
import { Button, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { StepTimeline } from '@/components/marketing/Steps'
import { CenterList } from '@/components/marketing/CenterList'
import { FaqAccordion } from '@/components/marketing/FaqAccordion'
import { Standard } from '@/components/home/Standard'
import { FAQS } from '@/lib/site'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// How Sawa works: the one page that explains the company.
//
// It used to be three pages (About, Marketplace safety, How it works) saying
// the same five things in three voices. Now each thing is said once, in the
// order a careful buyer asks: why does this exist, what is the standard, who
// checks what, what will Sawa never do, how do I buy, how do I sell, and where
// are you. /about and /promise redirect to the matching anchor here.
//
// The header lede is the page's one statement of the direct-deal rule.
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('marketing.howItWorks.meta.title'),
    description: t('marketing.howItWorks.meta.desc'),
    alternates: { canonical: '/how-it-works' },
  }
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

export default async function HowSawaWorksPage() {
  const t = await getServerT()

  const controls = range(5).map((i) => ({
    title: t(`marketing.promise.controls.items.${i}.title`),
    desc: t(`marketing.promise.controls.items.${i}.desc`),
  }))
  const never = range(4).map((i) => ({
    title: t(`marketing.about.weDoNot.items.${i}.title`),
    desc: t(`marketing.about.weDoNot.items.${i}.desc`),
  }))
  const buying = range(5).map((i) => ({
    title: t(`marketing.howItWorks.buyingSteps.${i}.title`),
    desc: t(`marketing.howItWorks.buyingSteps.${i}.desc`),
  }))
  const checks = range(4).map((i) => ({
    title: t(`marketing.howItWorks.checks.items.${i}.title`),
    desc: t(`marketing.howItWorks.checks.items.${i}.desc`),
  }))
  const selling = range(5).map((i) => ({
    title: t(`marketing.howItWorks.sellingSteps.${i}.title`),
    desc: t(`marketing.howItWorks.sellingSteps.${i}.desc`),
  }))

  return (
    <>
      <PageHeader
        eyebrow={t('nav.howItWorks')}
        title={t('marketing.howItWorks.header.title')}
        lede={t('marketing.howItWorks.header.lede')}
        actions={
          <>
            <Button href="/cars" trailingIcon={<Icon name="arrow-right" size={18} />}>
              {t('marketing.howItWorks.header.browse')}
            </Button>
            <Button href="/sell" variant="outline">
              {t('marketing.howItWorks.header.submit')}
            </Button>
          </>
        }
      />

      {/* ─── Why Sawa exists ─────────────────────────────────────────────── */}
      <Section tone="page" id="why">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
            <SectionHeading
              eyebrow={t('marketing.about.why.eyebrow')}
              title={t('marketing.about.why.title')}
              description={t('marketing.about.why.description')}
            />
            <div className="max-w-prose space-y-5 text-title-sm leading-relaxed text-content-secondary">
              <p>{t('marketing.about.why.p1')}</p>
              <p>{t('marketing.about.why.p2')}</p>
              <p>{t('marketing.about.why.p3')}</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── The standard ────────────────────────────────────────────────── */}
      <Standard id="standard" showLink={false} />

      {/* ─── Who checks what ─────────────────────────────────────────────── */}
      <Section tone="page" id="controls">
        <Container>
          <SectionHeading
            eyebrow={t('marketing.promise.controls.eyebrow')}
            title={t('marketing.promise.controls.title')}
            description={t('marketing.promise.controls.description')}
          />
          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {controls.map((item) => (
              <li key={item.title} className="min-w-0 border-t border-line pt-5">
                <h3 className="text-title-sm font-extrabold text-content">{item.title}</h3>
                <p className="mt-2 text-body leading-relaxed text-content-secondary">{item.desc}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-14 grid gap-8 border-t border-line pt-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <dt className="text-title-sm font-extrabold text-content">{t('marketing.promise.sawaControls.title')}</dt>
              <dd className="mt-2 text-body leading-relaxed text-content-secondary">{t('marketing.promise.sawaControls.body')}</dd>
            </div>
            <div>
              <dt className="text-title-sm font-extrabold text-content">{t('marketing.promise.usersControl.title')}</dt>
              <dd className="mt-2 text-body leading-relaxed text-content-secondary">{t('marketing.promise.usersControl.body')}</dd>
            </div>
          </dl>
        </Container>
      </Section>

      {/* ─── What Sawa will never do ─────────────────────────────────────── */}
      <Section tone="surface" id="limits">
        <Container>
          <SectionHeading
            eyebrow={t('marketing.about.weDoNot.eyebrow')}
            title={t('marketing.about.weDoNot.title')}
            description={t('marketing.about.weDoNot.description')}
          />
          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {never.map((item) => (
              <li key={item.title} className="flex min-w-0 gap-3 border-t border-line pt-5">
                <Icon name="close-circle" size={20} className="mt-0.5 shrink-0 text-content-muted" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="text-title-sm font-extrabold text-content">{item.title}</h3>
                  <p className="mt-2 text-body leading-relaxed text-content-secondary">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ─── Buying ──────────────────────────────────────────────────────── */}
      <Section tone="page" id="buying">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[360px_1fr] lg:gap-20">
            <SectionHeading
              eyebrow={t('marketing.howItWorks.buyers.eyebrow')}
              title={t('marketing.howItWorks.buyers.title')}
              description={t('marketing.howItWorks.buyers.description')}
            />
            <StepTimeline steps={buying} />
          </div>
          <div className="mt-16">
            <h3 className="text-title font-extrabold text-content">{t('marketing.howItWorks.checks.title')}</h3>
            <p className="mt-2 max-w-prose text-body text-content-secondary">{t('marketing.howItWorks.checks.description')}</p>
            <ol className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {checks.map((item, index) => (
                <li key={item.title} className="flex min-w-0 gap-4 border-t border-line pt-5">
                  <span className="tnum text-title-sm font-extrabold text-content-muted">{index + 1}</span>
                  <div className="min-w-0">
                    <h4 className="text-title-sm font-extrabold text-content">{item.title}</h4>
                    <p className="mt-2 text-body leading-relaxed text-content-secondary">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </Section>

      {/* ─── Selling ─────────────────────────────────────────────────────── */}
      <Section tone="surface" id="selling">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[360px_1fr] lg:gap-20">
            <div>
              <SectionHeading
                eyebrow={t('marketing.howItWorks.sellers.eyebrow')}
                title={t('marketing.howItWorks.sellers.title')}
                description={t('marketing.howItWorks.sellers.description')}
              />
              <p className="mt-6 text-caption leading-relaxed text-content-secondary">
                <strong className="text-content">{t('marketing.howItWorks.sellers.responsibilityLabel')}</strong>
                {t('marketing.howItWorks.sellers.responsibilityBody')}
              </p>
            </div>
            <StepTimeline steps={selling} />
          </div>
        </Container>
      </Section>

      {/* ─── Questions ───────────────────────────────────────────────────── */}
      <Section tone="page" id="faq">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-4">
              <h2 className="text-headline font-extrabold text-content">{t('home.faq.title')}</h2>
            </div>
            <div className="min-w-0 lg:col-span-8">
              <FaqAccordion items={FAQS} structuredData />
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── Where we are ────────────────────────────────────────────────── */}
      <Section tone="surface" id="centers">
        <Container>
          <SectionHeading
            eyebrow={t('marketing.about.centers.eyebrow')}
            title={t('marketing.about.centers.title')}
            description={t('marketing.about.centers.description')}
          />
          <CenterList className="mt-10" />
          <div className="mt-10">
            <Button href="/contact" variant="outline" trailingIcon={<Icon name="arrow-right" size={18} />}>
              {t('marketing.about.centers.directions')}
            </Button>
          </div>
        </Container>
      </Section>
    </>
  )
}
