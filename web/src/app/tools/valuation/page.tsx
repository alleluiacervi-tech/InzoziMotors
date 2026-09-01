import type { Metadata } from 'next'
import { Container, Section } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { ValuationTool } from '@/components/tools/ValuationTool'
import { cars } from '@/lib/api'
import { getServerT } from '@/lib/i18n/server'

// The valuation as a standalone tool — the tools hub links here rather than
// leaking into /sell's funnel. /sell keeps its own instance as its hero; both
// render the same component against the same endpoint, so the number a seller
// sees can never depend on which door they came through.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('tools.valuationPage.metaTitle'),
    description: t('tools.valuationPage.metaDescription'),
    alternates: { canonical: '/tools/valuation' },
    openGraph: {
      title: t('tools.valuationPage.ogTitle'),
      url: '/tools/valuation',
      images: ['/opengraph-image'],
    },
  }
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
  const t = await getServerT()

  return (
    <>
      <PageHeader
        eyebrow={t('tools.valuationPage.heroEyebrow')}
        title={t('tools.valuationPage.heroTitle')}
        lede={t('tools.valuationPage.heroLede')}
      />
      <Section tone="page">
        <Container>
          <ValuationTool makes={makes} currentYear={new Date().getFullYear()} />
        </Container>
      </Section>
    </>
  )
}
