import type { Metadata } from 'next'
import { Container, Section, SectionHeading } from '@/components/ui'
import { Hero } from '@/components/home/Hero'
import { StockBand } from '@/components/home/StockBand'
import { FeaturedCars } from '@/components/home/FeaturedCars'
import { TopDeals } from '@/components/home/TopDeals'
import { ThreeWays } from '@/components/home/ThreeWays'
import { InspectionStory } from '@/components/home/InspectionStory'
import { FinalCta } from '@/components/home/FinalCta'
import { FaqAccordion } from '@/components/marketing/FaqAccordion'
import { cars, rentals } from '@/lib/api'
import { FAQS } from '@/lib/site'
import { graph, organizationNode, websiteNode } from '@/lib/seo'
import { getServerT } from '@/lib/i18n/server'
import { summarizeInventory } from '@/lib/inventory'
import type { Car, FeaturedPlacement, InspectionReport, RentalCar } from '@/lib/types'

// The homepage is a Server Component so the live inventory below the fold is in
// the HTML a crawler receives, not fetched afterwards by the browser.

export const metadata: Metadata = {
  // Title and description come from the root layout defaults — this page is the
  // canonical expression of them. Only the canonical URL needs restating.
  alternates: { canonical: '/' },
}

/**
 * One page of live stock, newest first. The API clamps at 100 rows, which at
 * Sawa's inventory size is the whole yard: the hero's search options, the
 * stock band's counts, the certificate's car and the newest-six grid are all
 * cut from this one list, so they cannot disagree.
 */
async function getStock(): Promise<Car[]> {
  try {
    return await cars.list({ limit: 100, sort: 'listed_at', order: 'desc' })
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

async function getRentals(): Promise<RentalCar[]> {
  try {
    return await rentals.list()
  } catch {
    return []
  }
}

/** The certificate's evidence. A missing or invalid report is not an error:
 *  the card falls back to the listing's own score. */
async function getReport(carId: string | undefined): Promise<InspectionReport | null> {
  if (!carId) return null
  try {
    return await cars.inspectionReport(carId)
  } catch {
    return null
  }
}

export default async function HomePage() {
  const [stock, placements, rentalFleet] = await Promise.all([getStock(), getPlacements(), getRentals()])
  const inventory = summarizeInventory(stock)
  const report = await getReport(inventory.best?.id)
  const t = await getServerT()
  const organizationLd = graph(organizationNode(), websiteNode())

  return (
    <>
      {/* One claim, one search across the three businesses, and one real
          inspection report. */}
      <Hero inventory={inventory} rentalCount={rentalFleet.length} report={report} />

      {/* The yard's shape — makes, budgets, body types — each with its count. */}
      <StockBand inventory={inventory} />

      {/* Operator placements, then the newest inspected cars. */}
      <TopDeals placements={placements} />
      <FeaturedCars cars={stock.slice(0, 6)} />

      <ThreeWays saleCount={inventory.total} rentalCount={rentalFleet.length} />

      {/* The case for the inspection, made once. */}
      <InspectionStory />

      {/* Five of the eight; the full set lives on /how-it-works. */}
      <Section tone="page">
        <Container>
          <SectionHeading title={t('home.faq.title')} />
          <div className="mt-10">
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
