'use client'

import { APP } from '@/lib/site'
import { Icon } from '@/components/ui'
import { useDeviceStoreUrl } from './useDeepLink'

/**
 * App Store / Play Store buttons.
 *
 * Both are always rendered (a desktop visitor may want to send the link to
 * their phone), but the one matching the visitor's platform is highlighted, so
 * the right target is obvious without hiding the other.
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
      : 'border-brand/35 shadow-brand'

  const stores = [
    {
      key: 'ios' as const,
      href: APP.appStoreUrl,
      icon: 'apple' as const,
      caption: 'Download on the',
      name: 'App Store',
    },
    {
      key: 'android' as const,
      href: APP.playStoreUrl,
      icon: 'play-store' as const,
      caption: 'Get it on',
      name: 'Google Play',
    },
  ]

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {stores.map((store) => (
        <a
          key={store.key}
          href={store.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} ${sizing} ${styles} ${platform === store.key ? highlight : ''}`}
        >
          <Icon name={store.icon} size={size === 'sm' ? 22 : 26} />
          <span className="text-left leading-tight">
            <span className={`block ${size === 'sm' ? 'text-[9px]' : 'text-[10px]'} opacity-60`}>
              {store.caption}
            </span>
            <span className={`block font-bold ${size === 'sm' ? 'text-[13px]' : 'text-[15px]'}`}>
              {store.name}
            </span>
          </span>
        </a>
      ))}
    </div>
  )
}

export default StoreButtons
