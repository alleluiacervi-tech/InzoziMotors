import type { Metadata } from 'next'
import Link from 'next/link'
import { Button, Card, Container, Eyebrow, Icon, Section, SectionHeading, type IconName } from '@/components/ui'
import { AppLaunch } from './AppLaunch'

// The app landing page, and the target every universal / app link lands on when
// the app is not installed. It has to do two things at once: hand a phone over
// to the store, and reassure everyone else that the website is not a lesser
// version of the product.

export const metadata: Metadata = {
  title: 'Get the app',
  description:
    'The Inzozi Motors app for iPhone and Android. Browse certified cars, read full inspection reports, and get price-drop alerts. Everything except the camera work also runs on the website.',
  alternates: { canonical: '/download' },
  // The share card has to be named explicitly. Declaring `openGraph` here
  // replaces the root layout's object wholesale, and the root
  // opengraph-image.tsx file convention does not re-merge into it — without
  // this, a /download link shared in WhatsApp arrives with no image at all.
  openGraph: {
    title: 'Get the Inzozi Motors app',
    description:
      'Browse certified cars, read full inspection reports, and get price-drop alerts on your phone.',
    url: '/download',
    images: ['/opengraph-image'],
  },
  twitter: {
    title: 'Get the Inzozi Motors app',
    description:
      'Browse certified cars, read full inspection reports, and get price-drop alerts on your phone.',
    images: ['/opengraph-image'],
  },
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

const APP_ONLY: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'camera',
    title: 'ID verification in one sitting',
    body: 'Photograph your national ID and take the verification selfie without leaving the screen. That check is what keeps every listing on Inzozi real, and a phone camera is the only sensible way to do it.',
  },
  {
    icon: 'car',
    title: 'Photos with your submission',
    body: 'Shoot your car where it stands and attach the reference photos as you submit it. The 36 standard angles buyers see are still shot by our photographers at the center.',
  },
  {
    icon: 'bell',
    title: 'Push notifications',
    body: 'A price drop on a car you saved, a reply from the Inzozi team, your inspection slot and your handover time — on your lock screen instead of buried in email.',
  },
]

const ON_THE_WEB: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'search',
    title: 'The full catalogue',
    body: 'Every live listing, with the same filters and the same photos.',
  },
  {
    icon: 'document',
    title: 'Complete inspection reports',
    body: 'All 150 points, category by category, including anything flagged.',
  },
  {
    icon: 'heart',
    title: 'Saved cars and search alerts',
    body: 'Save a car or a search once and it follows you to the app.',
  },
  {
    icon: 'key',
    title: 'Requests and handovers',
    body: 'Request a car, then track it through to the handover date.',
  },
  {
    icon: 'user',
    title: 'Your whole account',
    body: 'Profile, verification status, messages and purchase history.',
  },
]

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string | string[] }>
}) {
  const params = await searchParams
  const to = safeAppPath(params.to)
  const webFallback = webPathFor(to)

  return (
    <>
      <Section tone="surface">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow>The Inzozi app</Eyebrow>
            <h1 className="mt-3 text-display font-extrabold tracking-[-0.03em] text-content">
              Inzozi Motors on your phone
            </h1>
            <p className="mt-5 text-title-sm leading-relaxed text-content-secondary">
              The same certified marketplace and the same account, with the parts that only make
              sense on a phone: the camera work for verification, and alerts the moment a price
              moves. Free, on iPhone and Android.
            </p>

            <AppLaunch to={to} webFallback={webFallback} />
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading
            eyebrow="Only in the app"
            title="What the app adds"
            description="Three things the browser cannot do well. Everything else on this page works either way."
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
            eyebrow="No app required"
            title="What the website does just as well"
            description="You are never blocked by not having installed anything. Sign in here and the app picks up exactly where you left off."
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
              Browse certified cars
            </Button>
          </div>
        </Container>
      </Section>

      <Section tone="ink">
        <Container>
          <div className="max-w-2xl">
            <h2 className="text-headline font-extrabold tracking-[-0.025em] text-white">
              No payment, anywhere
            </h2>
            <p className="mt-5 text-title-sm leading-relaxed text-white/70">
              There is no payment feature in the app or on this site, and there is not going to be
              one. Money changes hands in person at an Inzozi center on the day of handover, with
              our team checking the documents alongside you. That is exactly what makes the 7-day
              drive-it guarantee something we can honour.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="/promise">Read the Inzozi Promise</Button>
              <Button href="/how-it-works" variant="inverse" trailingIcon={<Icon name="arrow-right" size={17} />}>
                How buying works
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}
