import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, Icon, Section, type IconName } from '@/components/ui'
import { SITE } from '@/lib/site'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbNode, graph, serviceNode } from '@/lib/seo'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('tools.hub.metaTitle'),
    description: t('tools.hub.metaDescription'),
    alternates: { canonical: '/tools' },
    openGraph: {
      title: t('tools.hub.ogTitle', { site: SITE.name }),
      description: t('tools.hub.ogDescription'),
      url: `${SITE.url}/tools`,
      type: 'website',
    },
  }
}

const TOOLS: { href: string; icon: IconName; titleKey: string; bodyKey: string; metaKey: string }[] = [
  {
    href: '/tools/valuation',
    icon: 'chart',
    titleKey: 'tools.hub.valuationTitle',
    bodyKey: 'tools.hub.valuationBody',
    metaKey: 'tools.hub.valuationMeta',
  },
  {
    href: '/tools/import-duty',
    icon: 'document',
    titleKey: 'tools.hub.dutyTitle',
    bodyKey: 'tools.hub.dutyBody',
    metaKey: 'tools.hub.dutyMeta',
  },
  {
    href: '/tools/finance',
    icon: 'cash',
    titleKey: 'tools.hub.financeTitle',
    bodyKey: 'tools.hub.financeBody',
    metaKey: 'tools.hub.financeMeta',
  },
  {
    href: '/tools/pricing',
    icon: 'document',
    titleKey: 'tools.hub.pricingTitle',
    bodyKey: 'tools.hub.pricingBody',
    metaKey: 'tools.hub.pricingMeta',
  },
]

export default async function ToolsPage() {
  const t = await getServerT()
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
          <p className="mb-4 text-eyebrow font-bold uppercase text-white/55">{t('tools.hub.eyebrow')}</p>
          <h1 className="text-display-xl font-extrabold text-white">
            {t('tools.hub.title')}
          </h1>
          <p className="mt-5 text-title-sm leading-relaxed text-white/70">
            {t('tools.hub.lede')}
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
                {t(tool.metaKey)}
              </p>
              <h2 className="mt-1.5 text-title-sm font-extrabold text-content">{t(tool.titleKey)}</h2>
              <p className="mt-2 flex-1 text-caption leading-relaxed text-content-secondary">
                {t(tool.bodyKey)}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-caption font-bold text-brand">
                {t('tools.hub.open')}
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
