import type { Metadata } from 'next'
import { Container, Section, SectionHeading } from '@/components/ui'
import { Hero } from '@/components/home/Hero'
import { FeaturedCars } from '@/components/home/FeaturedCars'
import { TopDeals } from '@/components/home/TopDeals'
import { BrowseEntry } from '@/components/home/BrowseEntry'
import { TrustGuarantees } from '@/components/home/TrustGuarantees'
import { VinAuditBanner } from '@/components/home/VinAuditBanner'
import { InspectionShowcase } from '@/components/home/InspectionShowcase'
import { HowItWorks } from '@/components/home/HowItWorks'
import { FinalCta } from '@/components/home/FinalCta'
import { FaqAccordion } from '@/components/marketing/FaqAccordion'
import { cars } from '@/lib/api'
import { FAQS } from '@/lib/site'
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
  const organizationLd = graph(organizationNode(), websiteNode())

  return (
    <>
      {/* 1. Multi-Intent Hero Command Deck on Real-Camera Photographic Stage */}
      <Hero cars={featured} />

      {/* 2. Top Deals / Operator Placements (if active) */}
      <TopDeals placements={placements} />

      {/* 3. Live Certified Inventory Grid — CARS DIRECTLY UNDER HERO */}
      <FeaturedCars cars={featured} />

      {/* 4. Categorized Browse by Body Type & Budget Bands */}
      <BrowseEntry cars={featured} />

      {/* 5. Sawa Certified Guarantees — 4-Pillar Trust Grid (No Competitor Mentions) */}
      <TrustGuarantees />

      {/* 6. Instant Free VIN & Chassis Audit Banner */}
      <VinAuditBanner />

      {/* 7. Physical 150-Point Diagnostic Inspection Showcase */}
      <InspectionShowcase />

      {/* 8. Verified Handover Pipeline */}
      <HowItWorks />

      {/* 9. Frequently Asked Questions */}
      <Section tone="page">
        <Container>
          <SectionHeading
            eyebrow="Questions"
            title="Before you commit"
          />
          <div className="mt-12">
            <FaqAccordion items={FAQS.slice(0, 5)} structuredData />
          </div>
        </Container>
      </Section>

      {/* 10. Final Call to Action */}
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
