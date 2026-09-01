import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('marketing.guarantee.meta.title'),
    description: t('marketing.guarantee.meta.desc'),
    alternates: { canonical: '/legal/guarantee' },
  }
}

export default async function DirectDealNoticePage() {
  const t = await getServerT()

  const list = (base: string, count: number) => (
    <ul>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>{t(`${base}.${i}`)}</li>
      ))}
    </ul>
  )

  const SECTIONS: LegalSection[] = [
    { id: 'no-guarantee', heading: t('marketing.guarantee.noGuarantee.heading'), body: <><p>{t('marketing.guarantee.noGuarantee.p1')}</p><p>{t('marketing.guarantee.noGuarantee.p2')}</p></> },
    { id: 'platform-role', heading: t('marketing.guarantee.platformRole.heading'), body: list('marketing.guarantee.platformRole.items', 5) },
    { id: 'user-role', heading: t('marketing.guarantee.userRole.heading'), body: list('marketing.guarantee.userRole.items', 5) },
    { id: 'safety', heading: t('marketing.guarantee.safety.heading'), body: <><p>{t('marketing.guarantee.safety.p1')}</p><p>{t('marketing.guarantee.safety.p2')}</p></> },
    { id: 'law', heading: t('marketing.guarantee.law.heading'), body: <p>{t('marketing.guarantee.law.p')}</p> },
    { id: 'related', heading: t('marketing.guarantee.related.heading'), body: <ul><li><Link href="/legal/terms">{t('marketing.guarantee.related.terms')}</Link></li><li><Link href="/how-it-works">{t('marketing.guarantee.related.how')}</Link></li><li><Link href="/promise">{t('marketing.guarantee.related.promise')}</Link></li></ul> },
  ]

  return <LegalPage title={t('marketing.guarantee.page.title')} lede={t('marketing.guarantee.page.lede')} sections={SECTIONS} />
}
