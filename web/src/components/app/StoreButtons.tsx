'use client'

import { APP } from '@/lib/site'
import { Icon } from '@/components/ui'
import { useDeviceStoreUrl } from './useDeepLink'

/**
 * App Store / Play Store buttons.
 *
 * HONESTY GATE, per platform: a badge renders only for a store the app is
 * actually published on (APP.iosLive / APP.androidLive) — a store button that
 * 404s is exactly the scam signal this product exists to kill. With neither
 * live this falls back to a "coming soon" line; with one live it shows that one
 * badge and names the other as still coming, so the copy never over-promises.
 *
 * A live badge is highlighted when it matches the visitor's own platform — a
 * desktop visitor may want to send the link to their phone.
 */
export function StoreButtons({
  tone = 'light',
  size = 'md',
  className = '',
}: {
  tone?: 'light' | 'dark'
  size?: 'sm' | 'md'
  className?: string
}) {
  const platform = useDeviceStoreUrl()

  const stores = [
    {
      key: 'ios' as const,
      live: APP.iosLive,
      href: APP.appStoreUrl,
      icon: 'apple' as const,
      caption: 'Download on the',
      name: 'App Store',
    },
    {
      key: 'android' as const,
      live: APP.androidLive,
      href: APP.playStoreUrl,
      icon: 'play-store' as const,
      caption: 'Get it on',
      name: 'Google Play',
    },
  ]

  const liveStores = stores.filter((s) => s.live)
  const comingSoon = stores.filter((s) => !s.live).map((s) => s.name)

  const mutedText = tone === 'dark' ? 'text-white/55' : 'text-content-muted'

  if (liveStores.length === 0) {
    return (
      <p className={`text-caption font-semibold ${mutedText} ${className}`}>
        Coming to the App Store and Google Play.
      </p>
    )
  }

  const base =
    'inline-flex items-center gap-3 rounded-xl border transition-all duration-200 ease-brand active:scale-[0.99]'
  const sizing = size === 'sm' ? 'px-3.5 py-2.5' : 'px-5 py-3'

  const styles =
    tone === 'dark'
      ? 'border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25'
      : 'border-line bg-surface text-content shadow-card hover:-translate-y-0.5 hover:shadow-card-lg'

  const highlight =
    tone === 'dark'
      ? 'border-white/40 bg-white/12'
      : 'border-brand/35'

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        {liveStores.map((store) => (
          <a
            key={store.key}
            href={store.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${base} ${sizing} ${styles} ${platform === store.key ? highlight : ''}`}
          >
            <Icon name={store.icon} size={size === 'sm' ? 22 : 26} />
            <span className="text-left leading-tight">
              <span className="block text-micro opacity-60">{store.caption}</span>
              <span className={`block font-bold ${size === 'sm' ? 'text-caption' : 'text-body'}`}>
                {store.name}
              </span>
            </span>
          </a>
        ))}
      </div>
      {comingSoon.length > 0 ? (
        <p className={`mt-3 text-caption font-semibold ${mutedText}`}>
          {comingSoon.join(' and ')} coming soon.
        </p>
      ) : null}
    </div>
  )
}

export default StoreButtons
