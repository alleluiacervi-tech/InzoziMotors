import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage'
import { CONTACT } from '@/lib/site'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('marketing.terms.meta.title'),
    description: t('marketing.terms.meta.desc'),
    alternates: { canonical: '/legal/terms' },
  }
}

export default async function TermsPage() {
  const t = await getServerT()

  const list = (base: string, count: number) => (
    <ul>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>{t(`${base}.${i}`)}</li>
      ))}
    </ul>
  )

  const SECTIONS: LegalSection[] = [
    { id: 'scope', heading: t('marketing.terms.scope.heading'), body: <><p>{t('marketing.terms.scope.p1before')}<Link href="/legal/privacy">{t('marketing.terms.scope.p1link')}</Link>{t('marketing.terms.scope.p1after')}</p><p>{t('marketing.terms.scope.p2')}</p></> },
    { id: 'role', heading: t('marketing.terms.role.heading'), body: <><p><strong>{t('marketing.terms.role.p1strong')}</strong>{t('marketing.terms.role.p1rest')}</p><p>{t('marketing.terms.role.p2')}</p></> },
    { id: 'accounts', heading: t('marketing.terms.accounts.heading'), body: list('marketing.terms.accounts.items', 5) },
    { id: 'listings', heading: t('marketing.terms.listings.heading'), body: <><p>{t('marketing.terms.listings.p1')}</p><p>{t('marketing.terms.listings.p2')}</p></> },
    { id: 'inspection', heading: t('marketing.terms.inspection.heading'), body: <><p>{t('marketing.terms.inspection.p1')}</p><p>{t('marketing.terms.inspection.p2')}</p></> },
    { id: 'contact', heading: t('marketing.terms.contact.heading'), body: <><p>{t('marketing.terms.contact.p1')}</p><p>{t('marketing.terms.contact.p2')}</p></> },
    { id: 'transactions', heading: t('marketing.terms.transactions.heading'), body: <><p>{t('marketing.terms.transactions.p1')}</p><p>{t('marketing.terms.transactions.p2')}</p></> },
    { id: 'prohibited', heading: t('marketing.terms.prohibited.heading'), body: list('marketing.terms.prohibited.items', 5) },
    { id: 'reports', heading: t('marketing.terms.reports.heading'), body: <><p>{t('marketing.terms.reports.p1')}</p><p>{t('marketing.terms.reports.p2')}</p></> },
    { id: 'liability', heading: t('marketing.terms.liability.heading'), body: <><p>{t('marketing.terms.liability.p1')}</p><p>{t('marketing.terms.liability.p2')}</p></> },
    { id: 'changes', heading: t('marketing.terms.changes.heading'), body: <><p>{t('marketing.terms.changes.p1')}</p><p>{t('marketing.terms.changes.p2')}</p></> },
    { id: 'law-contact', heading: t('marketing.terms.lawContact.heading'), body: <><p>{t('marketing.terms.lawContact.p1')}</p><p>{t('marketing.terms.lawContact.p2before')}<a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a>{t('marketing.terms.lawContact.p2after')}</p><p>{t('marketing.terms.lawContact.lastUpdated')}</p></> },
  ]

  return <LegalPage title={t('marketing.terms.page.title')} lede={t('marketing.terms.page.lede')} sections={SECTIONS} />
}
