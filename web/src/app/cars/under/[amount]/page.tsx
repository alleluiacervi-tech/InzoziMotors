import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CarsPage, { generateMetadata as browseMetadata } from '../../page'
import { budgetFromSlug } from '@/components/marketplace/query'
import type { SearchParams } from '@/components/marketplace/query'

// /cars/under/30m — /cars up to a budget, for the homepage's three budget
// edges only (BUDGET_EDGES in lib/inventory.ts). Renders the browse page with
// the budget preset and is that view's canonical (browseIndexPolicy).

type Props = { params: Promise<{ amount: string }>; searchParams: Promise<SearchParams> }

async function presetParams({ params, searchParams }: Props): Promise<SearchParams> {
  const amount = budgetFromSlug((await params).amount)
  if (!amount) notFound()
  return { ...(await searchParams), max_price: String(amount) }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const preset = await presetParams(props)
  return browseMetadata({ searchParams: Promise.resolve(preset) })
}

export default async function BudgetLandingPage(props: Props) {
  const preset = await presetParams(props)
  return <CarsPage searchParams={Promise.resolve(preset)} />
}
