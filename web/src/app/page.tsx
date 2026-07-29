import type { Metadata } from 'next'
import { Container, Section, SectionHeading } from '@/components/ui'
import { Hero } from '@/components/home/Hero'
import { StatBand } from '@/components/home/StatBand'
import { BrowseEntry } from '@/components/home/BrowseEntry'
import { TrustPillars } from '@/components/home/TrustPillars'
import { FeaturedCars } from '@/components/home/FeaturedCars'
import { HowItWorks } from '@/components/home/HowItWorks'
import { PromiseGrid } from '@/components/home/PromiseGrid'
import { AppShowcase } from '@/components/home/AppShowcase'
import { FinalCta } from '@/components/home/FinalCta'
import { FaqAccordion } from '@/components/marketing/FaqAccordion'
import { cars } from '@/lib/api'
import { FAQS, SITE } from '@/lib/site'
import type { Car } from '@/lib/types'

// The homepage is a Server Component so the live inventory below the fold is in
// the HTML a crawler receives, not fetched afterwards by the browser.

export const metadata: Metadata = {
  // Title and description come from the root layout defaults — this page is the
  // canonical expression of them. Only the canonical URL needs restating.
  alternates: { canonical: '/' },
}

/**
 * Newest six live listings.
 *
 * The marketing page must survive a backend outage: if the VPS is down or slow,
 * the fetch throws and we return an empty list, which makes FeaturedCars render
 * nothing at all. A visitor sees a site with one fewer section — never an error
 * page, and never a placeholder car that does not exist.
 */
async function getFeatured(): Promise<Car[]> {
  try {
    return await cars.list({ limit: 6, sort: 'listed_at', order: 'desc' })
  } catch (err) {
    console.error('homepage inventory unavailable:', (err as Error).message)
    return []
  }
}

export default async function HomePage() {
  const featured = await getFeatured()

  const organizationLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: SITE.name,
        url: SITE.url,
        description: SITE.description,
        areaServed: { '@type': 'City', name: 'Kigali', addressCountry: 'RW' },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        publisher: { '@id': `${SITE.url}/#organization` },
        inLanguage: 'en',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE.url}/cars?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }

  return (
    <>
      {/* The newest live listing doubles as the hero image — a marketplace
          opens with a car, not an illustration. */}
      <Hero />
      <StatBand />
      <BrowseEntry cars={featured} />
      <FeaturedCars cars={featured} />
      <HowItWorks />
      <TrustPillars />
      <PromiseGrid />
      <AppShowcase />

      <Section tone="page">
        <Container>
          <SectionHeading
            eyebrow="Questions"
            title="Before you commit"
          />
          {/* Five, not all eight — the full set lives on /how-it-works. A
              homepage FAQ is a preview, not an archive. */}
          <div className="mt-12">
            <FaqAccordion items={FAQS.slice(0, 5)} structuredData />
          </div>
        </Container>
      </Section>

      <FinalCta />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationLd).replace(/</g, '\\u003c'),
        }}
      />
    </>
  )
}
