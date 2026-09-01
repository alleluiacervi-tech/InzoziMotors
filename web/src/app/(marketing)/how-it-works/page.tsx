import type { Metadata } from 'next'
import { Button, Card, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { StepTimeline } from '@/components/marketing/Steps'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('marketing.howItWorks.meta.title'),
    description: t('marketing.howItWorks.meta.desc'),
    alternates: { canonical: '/how-it-works' },
  }
}

export default async function HowItWorksPage() {
  const t = await getServerT()

  const BUYING_STEPS = [0, 1, 2, 3, 4].map((i) => ({
    title: t(`marketing.howItWorks.buyingSteps.${i}.title`),
    desc: t(`marketing.howItWorks.buyingSteps.${i}.desc`),
  }))
  const SELLING_STEPS = [0, 1, 2, 3, 4, 5].map((i) => ({
    title: t(`marketing.howItWorks.sellingSteps.${i}.title`),
    desc: t(`marketing.howItWorks.sellingSteps.${i}.desc`),
  }))
  const SAFETY = [0, 1, 2, 3].map((i) => ({
    title: t(`marketing.howItWorks.checks.items.${i}.title`),
    desc: t(`marketing.howItWorks.checks.items.${i}.desc`),
  }))

  return <>
    <PageHeader eyebrow={t('marketing.howItWorks.header.eyebrow')} title={t('marketing.howItWorks.header.title')} lede={t('marketing.howItWorks.header.lede')} actions={<><Button href="/cars" trailingIcon={<Icon name="arrow-right" size={18} />}>{t('marketing.howItWorks.header.browse')}</Button><Button href="/sell" variant="outline">{t('marketing.howItWorks.header.submit')}</Button></>} />

    <Section tone="surface" id="buying"><Container><div className="grid gap-12 lg:grid-cols-[360px_1fr] lg:gap-20"><SectionHeading eyebrow={t('marketing.howItWorks.buyers.eyebrow')} title={t('marketing.howItWorks.buyers.title')} description={t('marketing.howItWorks.buyers.description')} /><StepTimeline steps={BUYING_STEPS} /></div></Container></Section>

    <Section tone="page"><Container><SectionHeading eyebrow={t('marketing.howItWorks.checks.eyebrow')} title={t('marketing.howItWorks.checks.title')} description={t('marketing.howItWorks.checks.description')} /><ul className="mt-10 grid gap-4 sm:grid-cols-2">{SAFETY.map((item, index) => <li key={item.title}><Card className="h-full p-6"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-tint text-caption font-extrabold text-brand">{index + 1}</span><h3 className="mt-4 text-title-sm font-extrabold text-content">{item.title}</h3><p className="mt-2 text-body leading-relaxed text-content-secondary">{item.desc}</p></Card></li>)}</ul></Container></Section>

    <Section tone="alt" id="selling"><Container><div className="grid gap-12 lg:grid-cols-[360px_1fr] lg:gap-20"><div><SectionHeading eyebrow={t('marketing.howItWorks.sellers.eyebrow')} title={t('marketing.howItWorks.sellers.title')} description={t('marketing.howItWorks.sellers.description')} /><div className="mt-6 rounded-2xl border border-line-soft bg-surface p-5 text-caption leading-relaxed text-content-secondary"><strong className="text-content">{t('marketing.howItWorks.sellers.responsibilityLabel')}</strong>{t('marketing.howItWorks.sellers.responsibilityBody')}</div></div><StepTimeline steps={SELLING_STEPS} /></div></Container></Section>

    <Section tone="surface"><Container><Card className="border-brand/20 bg-brand-tint p-6 sm:p-8"><h2 className="text-title font-extrabold text-content">{t('marketing.howItWorks.notParty.title')}</h2><p className="mt-3 max-w-3xl text-body leading-relaxed text-content-secondary">{t('marketing.howItWorks.notParty.body')}</p><Button href="/legal/terms" variant="outline" className="mt-5">{t('marketing.howItWorks.notParty.cta')}</Button></Card></Container></Section>
  </>
}
