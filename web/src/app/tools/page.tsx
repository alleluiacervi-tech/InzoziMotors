import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, Icon, Section, type IconName } from '@/components/ui'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Free car tools for Rwanda',
  description:
    'Free calculators for anyone buying, selling or importing a car in Rwanda: a market valuation from real Sawa Cars sales, the full RRA import duty breakdown, and a monthly finance estimate.',
  alternates: { canonical: '/tools' },
  openGraph: {
    title: `Free car tools · ${SITE.name}`,
    description:
      'Valuation, RRA import duty and finance calculators for the Rwandan market. No account needed.',
    url: `${SITE.url}/tools`,
    type: 'website',
  },
}

const TOOLS: { href: string; icon: IconName; title: string; body: string; meta: string }[] = [
  {
    href: '/tools/valuation',
    icon: 'chart',
    title: 'Free valuation',
    body: 'What your car is worth today, priced against cars actually listed and sold on Sawa Cars. If there are not enough comparable cars, we say so rather than guess.',
    meta: 'For sellers',
  },
  {
    href: '/tools/import-duty',
    icon: 'document',
    title: 'Import duty calculator',
    body: 'The full RRA breakdown on an imported vehicle — CIF, customs, excise by engine size, VAT and the infrastructure levy — in both USD and RWF.',
    meta: 'For importers',
  },
  {
    href: '/tools/finance',
    icon: 'cash',
    title: 'Finance calculator',
    body: 'A monthly repayment from a car price, or the car price your monthly budget supports. Deposit, term and total interest included.',
    meta: 'For buyers',
  },
]

export default function ToolsPage() {
  return (
    <Section tone="surface" className="pt-12 sm:pt-20">
      <Container>
        <div className="max-w-3xl">
          <p className="mb-4 text-eyebrow font-bold uppercase text-brand">Tools</p>
          <h1 className="text-display font-extrabold text-content">
            Work out the numbers before you commit
          </h1>
          <p className="mt-5 text-title-sm leading-relaxed text-content-secondary">
            Three calculators built for the Rwandan market. No account, no phone number, no
            follow-up call — they are here because a buyer or seller who understands the numbers
            makes a better decision.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex flex-col rounded-2xl border border-line-soft bg-surface p-6 shadow-card
                         transition-all duration-300 ease-brand
                         hover:-translate-y-1 hover:border-line hover:shadow-card-lg"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-content-secondary">
                <Icon name={tool.icon} size={22} />
              </span>
              <p className="mt-4 text-micro font-bold uppercase tracking-wide text-content-muted">
                {tool.meta}
              </p>
              <h2 className="mt-1.5 text-title-sm font-extrabold text-content">{tool.title}</h2>
              <p className="mt-2 flex-1 text-caption leading-relaxed text-content-secondary">
                {tool.body}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-caption font-bold text-brand">
                Open
                <Icon
                  name="arrow-right"
                  size={16}
                  className="transition-transform duration-200 ease-brand group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  )
}
