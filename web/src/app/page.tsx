import type { Metadata } from 'next'
import { Container, Section, SectionHeading } from '@/components/ui'
import { Hero } from '@/components/home/Hero'
import { FeaturedCars } from '@/components/home/FeaturedCars'
import { TopDeals } from '@/components/home/TopDeals'
import { BrowseEntry } from '@/components/home/BrowseEntry'
import { TrustGuarantees } from '@/components/home/TrustGuarantees'
import { InspectionShowcase } from '@/components/home/InspectionShowcase'
import { HowItWorks } from '@/components/home/HowItWorks'
import { FinalCta } from '@/components/home/FinalCta'
import { FaqAccordion } from '@/components/marketing/FaqAccordion'
import { cars } from '@/lib/api'
import { FAQS } from '@/lib/site'
import { graph, organizationNode, websiteNode } from '@/lib/seo'
import { getServerT } from '@/lib/i18n/server'
import type { Car, FeaturedPlacement } from '@/lib/types'

// The homepage is a Server Component so the live inventory below the fold is in
// the HTML a crawler receives, not fetched afterwards by the browser.

export const metadata: Metadata = {
  // Title and description come from the root layout defaults — this page is the
  // canonical expression of them. Only the canonical URL needs restating.
  alternates: { canonical: '/' },
}

/**
 * Newest live listings.
 */
async function getFeatured(): Promise<Car[]> {
  try {
    return await cars.list({ limit: 6, sort: 'listed_at', order: 'desc' })
  } catch (err) {
    console.error('homepage inventory unavailable:', (err as Error).message)
    return []
  }
}

/**
 * The cars an operator placed at the top of the marketplace.
 */
async function getPlacements(): Promise<FeaturedPlacement[]> {
  try {
    return await cars.featured(6)
  } catch (err) {
    console.error('placements unavailable:', (err as Error).message)
    return []
  }
}

export default async function HomePage() {
  const [featured, placements] = await Promise.all([getFeatured(), getPlacements()])
  const t = await getServerT()
  const organizationLd = graph(organizationNode(), websiteNode())

  return (
    <>
      {/* One statement, one search, and a photograph of an inspection. The
          hero is deliberately shorter than the viewport so the first scroll
          lands on stock rather than on more argument. */}
      <Hero />

      {/* Operator placements first, then the newest inspected cars. Inventory
          is the whole point of the page and it starts in the second section. */}
      <TopDeals placements={placements} />
      <FeaturedCars cars={featured} />

      {/* Then, and only then, the case for the inspection: four claims that
          are each enforced in code, and the checklist's real shape. These two
          used to be four sections — a pillar grid, a VIN banner, a showcase
          and a stat band — arguing the same point over three and a half phone
          screens. */}
      <TrustGuarantees />
      <InspectionShowcase />

      {/* Photographic entry by body type. Its budget chips moved out: the
          hero's search box and /cars' own filter panel already cover that, and
          three sets of price bands on one page disagreed with each other. */}
      <BrowseEntry cars={featured} />

      <HowItWorks />

      {/* Five of the eight; the full set lives on /how-it-works. These two
          strings were hardcoded English while the rest of the page translated,
          and the keys already existed in all six locales. */}
      <Section tone="page">
        <Container>
          <SectionHeading eyebrow={t('home.faq.eyebrow')} title={t('home.faq.title')} />
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
