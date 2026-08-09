import type { Metadata } from 'next'
import { Container, Section } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { ValuationTool } from '@/components/tools/ValuationTool'
import { cars } from '@/lib/api'

// The valuation as a standalone tool — the tools hub links here rather than
// leaking into /sell's funnel. /sell keeps its own instance as its hero; both
// render the same component against the same endpoint, so the number a seller
// sees can never depend on which door they came through.

export const metadata: Metadata = {
  title: 'Free car valuation',
  description:
    'What is your car worth in Kigali today? A free market valuation priced from cars actually listed and sold on Sawa Cars — never a lookup table. No account needed.',
  alternates: { canonical: '/tools/valuation' },
  openGraph: {
    title: 'Free car valuation — Sawa Cars',
    url: '/tools/valuation',
    images: ['/opengraph-image'],
  },
}

async function catalogueMakes(): Promise<string[]> {
  try {
    const live = await cars.list({ limit: 100 })
    return [...new Set(live.map((car) => car.make).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    )
  } catch {
    return []
  }
}

export default async function ValuationPage() {
  const makes = await catalogueMakes()

  return (
    <>
      <PageHeader
        eyebrow="Free tool"
        title="What is your car worth today?"
        lede="Priced from cars actually listed and sold on Sawa Cars — never a lookup table. Where we do not have enough comparable cars to be sure, we say so instead of inventing a figure."
      />
      <Section tone="page">
        <Container>
          <ValuationTool makes={makes} currentYear={new Date().getFullYear()} />
        </Container>
      </Section>
    </>
  )
}
