import type { Metadata } from 'next'
import { Hero } from '@/components/home/Hero'
import { FeaturedCars } from '@/components/home/FeaturedCars'
import { Standard } from '@/components/home/Standard'
import { Proof } from '@/components/home/Proof'
import { SellStrip } from '@/components/home/SellStrip'
import { cars, rentals } from '@/lib/api'
import { graph, organizationNode, websiteNode } from '@/lib/seo'
import { summarizeInventory } from '@/lib/inventory'
import type { Car, FeaturedPlacement, InspectionReport, RentalCar, SoldCar } from '@/lib/types'

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
 * stock band's counts, the certificate's car and the newest-eight grid are all
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

/** Sold in the last 90 days, for the row under the stock grid. */
async function getRecentlySold(): Promise<SoldCar[]> {
  try {
    return await cars.recentlySold(6)
  } catch {
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
  const [stock, placements, rentalFleet, sold] = await Promise.all([
    getStock(),
    getPlacements(),
    getRentals(),
    getRecentlySold(),
  ])
  const inventory = summarizeInventory(stock)
  const report = await getReport(inventory.best?.id)
  const organizationLd = graph(organizationNode(), websiteNode())

  return (
    <>
      {/* Five sections, each a screen or less on a phone, each showing a car
          or moving someone toward one (docs/WEBSITE-REDESIGN-TODO.md, 2.2).
          1. The promise, one search, and the evidence: the best-scoring car
             in stock with its 150-point result. */}
      <Hero inventory={inventory} rentalCount={rentalFleet.length} report={report} />

      {/* 2. The yard. Operator placements lead the grid with their labels;
             the hero's car is not repeated. */}
      <FeaturedCars
        cars={stock}
        placements={placements}
        excludeId={inventory.best?.id}
        inventory={inventory}
        sold={sold}
      />

      {/* 3. The standard every car is measured against: the one dark band. */}
      <Standard />

      {/* 4. Who inspects, and where you can find them. */}
      <Proof />

      {/* 5. The only ask of sellers on this page. */}
      <SellStrip makes={inventory.makes.map((m) => m.value)} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationLd).replace(/</g, '\\u003c'),
        }}
      />
    </>
  )
}
