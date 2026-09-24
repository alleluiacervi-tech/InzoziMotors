'use client'

import { APP } from '@/lib/site'
import { useT } from '@/lib/i18n/context'
import { Icon } from '@/components/ui'
import { useDeviceStoreUrl } from './useDeepLink'

/**
 * App Store / Play Store buttons.
 *
 * HONESTY GATE, per platform. A badge is only ever a LINK for a store the app
 * is actually published on (APP.iosLive / APP.androidLive) — a store button
 * that 404s is exactly the scam signal this product exists to kill.
 *
 * A store that is not live still gets a badge, but a visibly inactive one: it
 * renders as a <span>, not an <a>, carries no href, is greyed back, and is
 * captioned "coming soon". So an Android visitor learns the app is on its way
 * and can recognise the badge they are waiting for, while nobody is ever sent
 * to a Google error page. Previously an unpublished store got only a line of
 * text, which read as an afterthought next to a real badge.
 *
 * Going live is still one flag: set APP.androidLive = true the moment the Play
 * listing is published, and this same badge becomes a link. Nothing else here
 * has to change.
 *
 * Layout is a stack, not a row: the App Store badge sits above and Google Play
 * directly below it, which is how people expect to read a pair of store
 * badges and what was asked for. They sit side by side from `sm` up, where
 * there is width for both.
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
  const t = useT()

  const stores = [
    {
      key: 'ios' as const,
      live: APP.iosLive,
      href: APP.appStoreUrl,
      icon: 'apple' as const,
      caption: t('store.downloadOn'),
      name: 'App Store',
    },
    {
      key: 'android' as const,
      live: APP.androidLive,
      href: APP.playStoreUrl,
      icon: 'play-store' as const,
      caption: t('store.getItOn'),
      name: 'Google Play',
    },
  ]

  const mutedText = tone === 'dark' ? 'text-white/55' : 'text-content-muted'

  // Nothing published anywhere: one honest line, no badges at all. A greyed
  // badge for every store would be a wall of things that do not work.
  if (!stores.some((s) => s.live)) {
    return (
      <p className={`text-caption font-semibold ${mutedText} ${className}`}>
        {t('store.comingBoth')}
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

  // The not-yet-published treatment: same shape and same footprint as a live
  // badge so the pair still reads as a set, but dimmed, undecorated and
  // unclickable. `cursor-default` and the absent href are what actually make
  // it inert; the opacity is what makes that obvious at a glance.
  const pending =
    tone === 'dark'
      ? 'border-white/10 bg-white/[0.03] text-white/60 cursor-default'
      : 'border-line-soft bg-surface-alt text-content-muted cursor-default'

  return (
    <div className={`flex flex-col items-start gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 ${className}`}>
      {stores.map((store) => {
        const inner = (
          <>
            <Icon name={store.icon} size={size === 'sm' ? 22 : 26} />
            <span className="text-left leading-tight">
              <span className="block text-micro opacity-60">
                {store.live ? store.caption : t('store.comingCaption')}
              </span>
              <span className={`block font-bold ${size === 'sm' ? 'text-caption' : 'text-body'}`}>
                {store.name}
              </span>
            </span>
          </>
        )

        // A <span>, not a disabled <a>: an anchor without an href is still
        // read out as a link by a screen reader, and this is not one.
        return store.live ? (
          <a
            key={store.key}
            href={store.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${base} ${sizing} ${styles} ${platform === store.key ? highlight : ''}`}
          >
            {inner}
          </a>
        ) : (
          <span
            key={store.key}
            aria-disabled="true"
            className={`${base} ${sizing} ${pending}`}
          >
            {inner}
          </span>
        )
      })}
    </div>
  )
}

export default StoreButtons
