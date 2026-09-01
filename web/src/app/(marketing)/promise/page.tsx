import type { Metadata } from 'next'
import { Button, Card, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('marketing.promise.meta.title'),
    description: t('marketing.promise.meta.desc'),
    alternates: { canonical: '/promise' },
  }
}

// Icons stay in code; only the copy is localized.
const ICONS = ['shield', 'user', 'document', 'mail', 'eye-off'] as const

export default async function MarketplaceSafetyPage() {
  const t = await getServerT()

  const PROMISES = ICONS.map((icon, i) => ({
    icon,
    title: t(`marketing.promise.controls.items.${i}.title`),
    desc: t(`marketing.promise.controls.items.${i}.desc`),
  }))

  return <><PageHeader eyebrow={t('marketing.promise.header.eyebrow')} title={t('marketing.promise.header.title')} lede={t('marketing.promise.header.lede')} actions={<><Button href="/cars">{t('marketing.promise.header.browse')}</Button><Button href="/legal/guarantee" variant="outline">{t('marketing.promise.header.notice')}</Button></>} />
    <Section tone="surface"><Container><SectionHeading eyebrow={t('marketing.promise.controls.eyebrow')} title={t('marketing.promise.controls.title')} description={t('marketing.promise.controls.description')} /><ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{PROMISES.map((item) => <li key={item.title}><Card className="h-full p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name={item.icon} size={21} /></span><h2 className="mt-5 text-title-sm font-extrabold text-content">{item.title}</h2><p className="mt-2 text-body leading-relaxed text-content-secondary">{item.desc}</p></Card></li>)}</ul></Container></Section>
    <Section tone="alt"><Container><div className="grid gap-8 lg:grid-cols-2"><Card className="p-6 sm:p-8"><h2 className="text-title font-extrabold text-content">{t('marketing.promise.sawaControls.title')}</h2><p className="mt-3 text-body leading-relaxed text-content-secondary">{t('marketing.promise.sawaControls.body')}</p></Card><Card className="p-6 sm:p-8"><h2 className="text-title font-extrabold text-content">{t('marketing.promise.usersControl.title')}</h2><p className="mt-3 text-body leading-relaxed text-content-secondary">{t('marketing.promise.usersControl.body')}</p></Card></div></Container></Section>
  </>
}
