import type { Metadata } from 'next'
import { Container, Section, SectionHeading } from '@/components/ui'
import { Hero } from '@/components/home/Hero'
import { BrowseEntry } from '@/components/home/BrowseEntry'
import { CompetitorComparison } from '@/components/home/CompetitorComparison'
import { TopDeals } from '@/components/home/TopDeals'
import { VinHeroDemo } from '@/components/home/VinHeroDemo'
import { InspectionShowcase } from '@/components/home/InspectionShowcase'
import { FeaturedCars } from '@/components/home/FeaturedCars'
import { HowItWorks } from '@/components/home/HowItWorks'
import { TrustBand } from '@/components/home/TrustBand'
import { FinalCta } from '@/components/home/FinalCta'
import { FaqAccordion } from '@/components/marketing/FaqAccordion'
import { cars } from '@/lib/api'
import { FAQS, SITE } from '@/lib/site'
import { graph, organizationNode, websiteNode } from '@/lib/seo'
import type { Car, FeaturedPlacement } from '@/lib/types'

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

/**
 * The cars an operator placed at the top of the marketplace.
 *
 * Separate from getFeatured above, and separately failure-tolerant: a placement
 * feed that cannot be read costs the page one section, never the page.
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
  // In parallel: neither read depends on the other, and the homepage should not
  // wait for two round trips in series.
  const [featured, placements] = await Promise.all([getFeatured(), getPlacements()])

  // Built from lib/seo so the homepage, every car page and every rental page
  // describe the same organisation with the same @id — one entity in Google's
  // graph rather than three that merely share a name.
  const organizationLd = graph(organizationNode(), websiteNode())

  return (
    <>
      {/* 1. Multi-Intent Hero Command Deck on Real-Camera Photographic Stage */}
      <Hero cars={featured} />

      {/* 2. Categorized Browse by Body Type & Budget Bands */}
      <BrowseEntry cars={featured} />

      {/* 3. The Sawa Advantage: Why We Beat Beforward & Auto24 */}
      <CompetitorComparison />

      {/* 4. Top Deals / Verified Placements */}
      <TopDeals placements={placements} />

      {/* 5. Proprietary VIN Intelligence & History Demonstration */}
      <VinHeroDemo />

      {/* 6. Physical 150-Point Inspection Standards & Diagnostic Lift Showcase */}
      <InspectionShowcase />

      {/* 7. Fresh Live Certified Inventory Grid */}
      <FeaturedCars cars={featured} />

      {/* 8. Verified Handover Pipeline */}
      <HowItWorks />

      {/* 9. Verified Marketplace Metrics & Guarantees */}
      <TrustBand />

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
