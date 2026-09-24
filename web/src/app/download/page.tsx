import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Button, Card, Container, Eyebrow, Icon, Section, SectionHeading, type IconName } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'
import { AppLaunch } from './AppLaunch'

// The app landing page, and the target every universal / app link lands on when
// the app is not installed. It has to do two things at once: hand a phone over
// to the store, and reassure everyone else that the website is not a lesser
// version of the product.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('auth.download.metaTitle'),
    description: t('auth.download.metaDescription'),
    alternates: { canonical: '/download' },
    // The share card has to be named explicitly. Declaring `openGraph` here
    // replaces the root layout's object wholesale, and the root
    // opengraph-image.tsx file convention does not re-merge into it — without
    // this, a /download link shared in WhatsApp arrives with no image at all.
    openGraph: {
      title: t('auth.download.ogTitle'),
      description: t('auth.download.ogDescription'),
      url: '/download',
      images: ['/opengraph-image'],
    },
    twitter: {
      title: t('auth.download.ogTitle'),
      description: t('auth.download.ogDescription'),
      images: ['/opengraph-image'],
    },
  }
}

/** `to` is echoed into a custom-scheme URL, so it is validated as a plain
 *  relative app path — no scheme, no host, no query, nothing to smuggle. */
function safeAppPath(raw?: string | string[]): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return null
  const path = value.replace(/^\/+/, '')
  return /^[A-Za-z0-9][A-Za-z0-9/_-]{0,119}$/.test(path) ? path : null
}

/** The website equivalent of an in-app route, where one exists. Anything not
 *  listed here simply has no "continue on the web" offer. */
function webPathFor(appPath: string | null): string | null {
  if (!appPath) return null
  const [segment, id] = appPath.split('/')
  if (!id) return null
  if (segment === 'car') return `/cars/${id}`
  if (segment === 'rental') return `/rentals/${id}`
  return null
}

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string | string[] }>
}) {
  const params = await searchParams
  const to = safeAppPath(params.to)
  const webFallback = webPathFor(to)
  const t = await getServerT()

  const APP_ONLY: { icon: IconName; title: string; body: string }[] = [
    {
      icon: 'camera',
      title: t('auth.download.appOnly1Title'),
      body: t('auth.download.appOnly1Body'),
    },
    {
      icon: 'car',
      title: t('auth.download.appOnly2Title'),
      body: t('auth.download.appOnly2Body'),
    },
    {
      icon: 'bell',
      title: t('auth.download.appOnly3Title'),
      body: t('auth.download.appOnly3Body'),
    },
  ]

  const ON_THE_WEB: { icon: IconName; title: string; body: string }[] = [
    {
      icon: 'search',
      title: t('auth.download.web1Title'),
      body: t('auth.download.web1Body'),
    },
    {
      icon: 'document',
      title: t('auth.download.web2Title'),
      body: t('auth.download.web2Body'),
    },
    {
      icon: 'heart',
      title: t('auth.download.web3Title'),
      body: t('auth.download.web3Body'),
    },
    {
      icon: 'key',
      title: t('auth.download.web4Title'),
      body: t('auth.download.web4Body'),
    },
    {
      icon: 'user',
      title: t('auth.download.web5Title'),
      body: t('auth.download.web5Body'),
    },
  ]

  return (
    <>
      <Section tone="surface">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow>{t('auth.download.eyebrow')}</Eyebrow>

            {/* The store-listing lockup — the exact grammar the App Store and
                Play Store use for a product header (icon tile, name, developer,
                factual meta), so the app reads as a real shipped product. Every
                line is a fact: no invented star ratings, no fake review counts.
                The icon is the REAL app icon, CSS-masked to the same ~22%
                superellipse radius iOS applies. */}
            <div className="mt-6 flex items-start gap-5 sm:gap-7">
              <Image
                src="/brand/app-icon.png"
                alt="Sawa Cars app icon"
                width={128}
                height={128}
                priority
                className="h-24 w-24 shrink-0 rounded-[22.5%] shadow-float ring-1 ring-black/5 sm:h-32 sm:w-32"
              />
              <div className="min-w-0 pt-1">
                <h1 className="text-title font-extrabold tracking-[-0.02em] text-content sm:text-display">
                  Sawa Cars
                </h1>
                <p className="mt-1 text-body text-content-secondary">
                  {t('auth.download.subtitle')}
                </p>
                <p className="mt-0.5 text-caption text-content-muted">Sawa Cars Ltd</p>

                <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {[
                    { label: t('auth.download.metaPrice'), value: t('auth.download.metaPriceValue') },
                    { label: t('auth.download.metaCategory'), value: t('auth.download.metaCategoryValue') },
                    { label: t('auth.download.metaWorks'), value: 'iPhone & Android' },
                  ].map((m, i) => (
                    <li key={m.label} className="flex items-center gap-5">
                      {i > 0 ? <span aria-hidden className="h-7 w-px bg-line" /> : null}
                      <span>
                        <span className="block text-micro font-bold text-content-muted">
                          {m.label}
                        </span>
                        <span className="block text-label font-bold text-content">{m.value}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-7 text-body leading-relaxed text-content-secondary">
              {t('auth.download.lead')}
            </p>

            <AppLaunch to={to} webFallback={webFallback} />
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading
            eyebrow={t('auth.download.onlyEyebrow')}
            title={t('auth.download.onlyTitle')}
            description={t('auth.download.onlyDescription')}
          />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {APP_ONLY.map((item) => (
              <Card key={item.title} className="p-6">
                {/* Informational icons stay neutral — red is for actions only. */}
                <Icon name={item.icon} size={24} className="text-content-secondary" />
                <h3 className="mt-4 text-title-sm font-extrabold tracking-[-0.01em] text-content">
                  {item.title}
                </h3>
                <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                  {item.body}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="alt">
        <Container>
          <SectionHeading
            eyebrow={t('auth.download.webEyebrow')}
            title={t('auth.download.webTitle')}
            description={t('auth.download.webDescription')}
          />

          <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {ON_THE_WEB.map((item) => (
              <li key={item.title} className="flex gap-4">
                <Icon name={item.icon} size={22} className="mt-0.5 text-content-muted" />
                <div className="min-w-0">
                  <h3 className="text-body font-extrabold text-content">{item.title}</h3>
                  <p className="mt-1 text-caption leading-relaxed text-content-secondary">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Button href="/cars" variant="outline" trailingIcon={<Icon name="arrow-right" size={18} />}>
              {t('auth.download.browseCars')}
            </Button>
          </div>
        </Container>
      </Section>

      <Section tone="ink">
        <Container>
          <div className="max-w-2xl">
            <h2 className="text-headline font-extrabold tracking-[-0.025em] text-white">
              {t('auth.download.inkTitle')}
            </h2>
            <p className="mt-5 text-title-sm leading-relaxed text-white/70">
              {t('auth.download.inkBody')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="/promise">{t('auth.download.readSafety')}</Button>
              <Button href="/how-it-works" variant="inverse" trailingIcon={<Icon name="arrow-right" size={17} />}>
                {t('auth.download.howBuying')}
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}
