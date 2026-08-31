'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { StoreButtons } from '@/components/app/StoreButtons'
import { usePlatform, useOpenInApp } from '@/components/app/useDeepLink'
import { Alert, Button, Icon } from '@/components/ui'
import { APP, SITE } from '@/lib/site'

// The interactive half of /download.
//
// Two jobs. First, when the page is opened as a deep-link target (?to=car/<id>),
// try to hand the visitor to the native app and let useOpenInApp fall back to
// the store if the scheme does not resolve. Second, lead with the store that
// matches the device while still showing the other one — a Rwandan buyer often
// opens a WhatsApp link on one phone and installs on another.
//
// usePlatform reports 'desktop' until mount, so the server render and the first
// client render agree; the platform-led variant appears on the next paint.

const STORES = {
  ios: {
    href: APP.appStoreUrl,
    icon: 'apple' as const,
    label: 'Download on the App Store',
    live: APP.iosLive,
  },
  android: {
    href: APP.playStoreUrl,
    icon: 'play-store' as const,
    label: 'Get it on Google Play',
    live: APP.androidLive,
  },
}

/** Whatever host this deployment actually answers on, so the instruction we
 *  print is one a visitor can type. */
function shortUrl(): string {
  try {
    return `${new URL(SITE.url).host}/download`
  } catch {
    return '/download'
  }
}

export function AppLaunch({
  to,
  webFallback,
}: {
  /** In-app path from ?to=, already validated server-side. */
  to: string | null
  /** The same destination on the website, when one exists. */
  webFallback: string | null
}) {
  const platform = usePlatform()
  const openInApp = useOpenInApp()
  const [handedOff, setHandedOff] = useState(false)

  // The hook's identity changes when the platform resolves, so the effect runs
  // again — the ref makes the hand-off happen exactly once per visit.
  const attempted = useRef(false)

  useEffect(() => {
    if (!to || attempted.current) return
    // On desktop useOpenInApp navigates to /download, which is this page.
    if (platform === 'desktop') return

    attempted.current = true
    setHandedOff(true)
    openInApp(to)
  }, [to, platform, openInApp])

  // Only ever point somebody at a store the app is actually published on. When
  // the visitor's own store is live we lead with it and offer the other store
  // (for a second phone) only if that one is live too; otherwise we fall through
  // to StoreButtons, which shows every live badge and names what is still coming.
  const mine = platform === 'ios' ? STORES.ios : platform === 'android' ? STORES.android : null
  const otherRaw = platform === 'ios' ? STORES.android : platform === 'android' ? STORES.ios : null
  const lead = mine && mine.live ? mine : null
  const other = otherRaw && otherRaw.live ? otherRaw : null

  return (
    <div className="mt-8">
      {to ? (
        <Alert
          tone="info"
          title={handedOff ? 'Opening the app…' : 'This link opens in the Sawa Cars app'}
          className="mb-6"
        >
          <p>
            {handedOff
              ? 'If nothing happened, the app isn’t installed yet — the store will open instead.'
              : 'Open this page on your phone to jump straight to it, or carry on here.'}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-5">
            {platform !== 'desktop' ? (
              <button
                type="button"
                onClick={() => openInApp(to)}
                className="inline-flex min-h-[44px] items-center text-caption font-bold text-brand underline underline-offset-4"
              >
                Try opening the app again
              </button>
            ) : null}
            {webFallback ? (
              <Link
                href={webFallback}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-caption font-bold text-brand underline underline-offset-4"
              >
                Continue on the web
                <Icon name="arrow-right" size={15} />
              </Link>
            ) : null}
          </div>
        </Alert>
      ) : null}

      {lead && other ? (
        <div className="flex flex-col items-start gap-4">
          <Button
            href={lead.href}
            size="lg"
            target="_blank"
            leadingIcon={<Icon name={lead.icon} size={22} />}
          >
            {lead.label}
          </Button>
          <a
            href={other.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 text-caption font-semibold text-content-secondary underline underline-offset-4 hover:text-content"
          >
            <Icon name={other.icon} size={18} className="text-content-muted" />
            Using another phone? {other.label}
          </a>
        </div>
      ) : (
        <div>
          <StoreButtons />
          <p className="mt-4 text-caption text-content-muted">
            Open <span className="font-semibold text-content-secondary">{shortUrl()}</span> on your
            phone to install it directly.
          </p>
        </div>
      )}
    </div>
  )
}

export default AppLaunch
