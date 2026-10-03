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
    {/* On the site's paper like every other page: a heading, then the four
        tools as plain columns divided by hairlines. */}
    <Section tone="page" className="!pt-10 sm:!pt-16">
      <Container>
        <div className="max-w-3xl">
          <p className="mb-4 text-caption font-bold text-content-muted">{t('tools.hub.eyebrow')}</p>
          <h1 className="text-display font-extrabold text-content">
            {t('tools.hub.title')}
          </h1>
          <p className="mt-5 text-title-sm leading-relaxed text-content-secondary">
            {t('tools.hub.lede')}
          </p>
        </div>

        <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <li key={tool.href} className="min-w-0 border-t border-line pt-6">
              <Link href={tool.href} className="group block">
                <p className="text-micro font-bold text-content-muted">{t(tool.metaKey)}</p>
                <h2 className="mt-1.5 text-title font-extrabold text-content group-hover:underline group-hover:decoration-2 group-hover:underline-offset-[6px]">
                  {t(tool.titleKey)}
                </h2>
                <p className="mt-2 max-w-prose text-body leading-relaxed text-content-secondary">{t(tool.bodyKey)}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-body font-bold text-content">
                  {t('tools.hub.open')}
                  <Icon
                    name="arrow-right"
                    size={16}
                    aria-hidden="true"
                    className="transition-transform duration-200 ease-brand group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
    </>
  )
}
