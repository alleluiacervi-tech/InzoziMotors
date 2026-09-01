import type { Metadata } from 'next'
import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage'
import { CONTACT, SITE } from '@/lib/site'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('marketing.privacy.meta.title'),
    description: t('marketing.privacy.meta.desc'),
    alternates: { canonical: '/legal/privacy' },
  }
}

export default async function PrivacyPage() {
  const t = await getServerT()

  const list = (base: string, count: number) => (
    <ul>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>{t(`${base}.${i}`)}</li>
      ))}
    </ul>
  )

  const SECTIONS: LegalSection[] = [
    {
      id: 'scope',
      heading: t('marketing.privacy.scope.heading'),
      body: <p>{t('marketing.privacy.scope.p1', { name: SITE.name })}</p>,
    },
    {
      id: 'what-we-collect',
      heading: t('marketing.privacy.collect.heading'),
      body: (
        <>
          <h3>{t('marketing.privacy.collect.h1')}</h3>
          {list('marketing.privacy.collect.list1', 2)}
          <h3>{t('marketing.privacy.collect.h2')}</h3>
          {list('marketing.privacy.collect.list2', 1)}
          <h3>{t('marketing.privacy.collect.h3')}</h3>
          {list('marketing.privacy.collect.list3', 4)}
          <h3>{t('marketing.privacy.collect.h4')}</h3>
          {list('marketing.privacy.collect.list4', 2)}
        </>
      ),
    },
    {
      id: 'why',
      heading: t('marketing.privacy.why.heading'),
      body: (
        <>
          {list('marketing.privacy.why.list', 6)}
          <p>{t('marketing.privacy.why.p')}</p>
        </>
      ),
    },
    {
      id: 'identity-documents',
      heading: t('marketing.privacy.identity.heading'),
      body: (
        <>
          <p>{t('marketing.privacy.identity.p')}</p>
          {list('marketing.privacy.identity.list', 4)}
        </>
      ),
    },
    {
      id: 'who-sees-what',
      heading: t('marketing.privacy.whoSees.heading'),
      body: (
        <ul>
          {[0, 1, 2, 3].map((i) => (
            <li key={i}>
              <strong>{t(`marketing.privacy.whoSees.items.${i}.lead`)}</strong>
              {t(`marketing.privacy.whoSees.items.${i}.rest`)}
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'sharing',
      heading: t('marketing.privacy.sharing.heading'),
      body: (
        <>
          <p>{t('marketing.privacy.sharing.p1')}</p>
          <p>{t('marketing.privacy.sharing.p2')}</p>
        </>
      ),
    },
    {
      id: 'cookies',
      heading: t('marketing.privacy.cookies.heading'),
      body: (
        <>
          <p>
            {t('marketing.privacy.cookies.p1before')}
            <strong>{t('marketing.privacy.cookies.p1strong')}</strong>
            {t('marketing.privacy.cookies.p1after')}
          </p>
          <p>{t('marketing.privacy.cookies.p2')}</p>
        </>
      ),
    },
    {
      id: 'security',
      heading: t('marketing.privacy.security.heading'),
      body: (
        <>
          {list('marketing.privacy.security.list', 4)}
          <p>
            {t('marketing.privacy.security.pbefore')}
            <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a>
            {t('marketing.privacy.security.pafter')}
          </p>
        </>
      ),
    },
    {
      id: 'your-rights',
      heading: t('marketing.privacy.rights.heading'),
      body: (
        <ul>
          <li>{t('marketing.privacy.rights.item1')}</li>
          <li>{t('marketing.privacy.rights.item2')}</li>
          <li>
            {t('marketing.privacy.rights.item3part1')}
            <a href="/dashboard/profile">{t('marketing.privacy.rights.item3link1')}</a>
            {t('marketing.privacy.rights.item3part2')}
            <a href="/account/delete">{t('marketing.privacy.rights.item3link2')}</a>
            {t('marketing.privacy.rights.item3part3')}
          </li>
          <li>{t('marketing.privacy.rights.item4')}</li>
          <li>
            {t('marketing.privacy.rights.item5before')}
            <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a>
            {t('marketing.privacy.rights.item5after')}
          </li>
        </ul>
      ),
    },
    {
      id: 'children',
      heading: t('marketing.privacy.children.heading'),
      body: <p>{t('marketing.privacy.children.p')}</p>,
    },
    {
      id: 'contact',
      heading: t('marketing.privacy.contact.heading'),
      body: (
        <>
          <p>{t('marketing.privacy.contact.p1')}</p>
          <p>
            {t('marketing.privacy.contact.p2before')}
            <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a>
            {t('marketing.privacy.contact.p2mid')}
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            {t('marketing.privacy.contact.p2after')}
          </p>
        </>
      ),
    },
  ]

  return (
    <LegalPage
      title={t('marketing.privacy.page.title')}
      lede={t('marketing.privacy.page.lede')}
      sections={SECTIONS}
    />
  )
}
