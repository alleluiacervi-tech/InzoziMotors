import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, Icon, Section, type IconName } from '@/components/ui'
import { SITE } from '@/lib/site'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbNode, graph, serviceNode } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Free car valuation, finance and import-duty tools for Rwanda',
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
    body: 'The full RRA breakdown on an imported vehicle — CIF, customs, excise by engine size, VAT and the infrastructure levy — entirely in RWF.',
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
    <>
    <JsonLd data={graph(
      serviceNode({
        id: 'car-tools-rwanda',
        name: 'Free car tools for Rwanda',
        description: 'Free Rwandan car valuation, RRA import-duty and vehicle-finance calculators.',
        path: '/tools',
        serviceType: 'Vehicle valuation and cost calculators',
      }),
      breadcrumbNode([{ name: 'Home', path: '/' }, { name: 'Car tools', path: '/tools' }])
    )} />
    <Section tone="ink" className="relative isolate overflow-hidden pt-14 sm:pt-20">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_12%,rgba(204,5,15,0.28),transparent_32%),radial-gradient(circle_at_10%_90%,rgba(255,255,255,0.08),transparent_28%)]" />
      <Container>
        <div className="max-w-3xl">
          <p className="mb-4 text-eyebrow font-bold uppercase text-white/55">Tools</p>
          <h1 className="text-display-xl font-extrabold text-white">
            Work out the numbers before you commit
          </h1>
          <p className="mt-5 text-title-sm leading-relaxed text-white/70">
            Three calculators built for the Rwandan market. No account, no phone number, no
            follow-up call — they are here because a buyer or seller who understands the numbers
            makes a better decision.
          </p>
        </div>

        <div className="stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex flex-col rounded-3xl border border-white/10 bg-white p-7 text-content shadow-float
                         transition-all duration-500 ease-brand
                         hover:-translate-y-1.5 hover:border-white/30"
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
    </>
  )
}
