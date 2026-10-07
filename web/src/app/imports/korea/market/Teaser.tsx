import Link from 'next/link'
import { Button, Icon } from '@/components/ui'
import { BrandMark } from '@/components/marketplace/BrandMark'
import { koreaMarket } from '@/lib/api'
import { getLogoLookup } from '@/lib/brands'
import { getServerT } from '@/lib/i18n/server'
import { marketHref, markName } from './shared'

/**
 * The way into the Korea market guide from /imports and from the Korean
 * catalogue while it is off: the total, the biggest makes, one button.
 * Renders nothing when the guide is off or has no figures yet.
 */
export async function KoreaMarketTeaser({ className = '' }: { className?: string }) {
  const [data, logoFor, t] = await Promise.all([
    koreaMarket.overview().catch(() => null),
    getLogoLookup(),
    getServerT(),
  ])
  if (!data?.available || data.pending || !data.makes?.length) return null

  return (
    <div className={className}>
      <p className="text-caption font-bold uppercase tracking-wide text-brand">{t('imports.korea.market.eyebrow')}</p>
      <h2 className="mt-2 text-headline font-extrabold text-content">{t('imports.korea.market.teaserTitle')}</h2>
      <p className="mt-3 max-w-prose text-body text-content-secondary">
        {t('imports.korea.market.teaserBody')}{' '}
        <span className="font-bold tabular-nums text-content">{t('imports.korea.market.total', { count: (data.total ?? 0).toLocaleString('en-US') })}</span>
      </p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {data.makes.slice(0, 12).map((m) => (
          <li key={m.make}>
            <Link
              href={marketHref(m.make)}
              className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-soft bg-surface pl-1.5 pr-3.5 text-micro font-bold text-content-secondary transition-colors hover:border-content hover:text-content"
            >
              <BrandMark name={markName(m.label)} logoUrl={logoFor(markName(m.label))} size={26} />
              {m.label}
              <span className="tabular-nums font-semibold text-content-muted">{m.count.toLocaleString('en-US')}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-7">
        <Button href={marketHref()} size="lg" trailingIcon={<Icon name="arrow-right" size={18} />}>
          {t('imports.korea.market.teaserCta')}
        </Button>
      </div>
    </div>
  )
}
