'use client'

import { useCallback, useEffect, useState } from 'react'
import { APP } from '@/lib/site'

export type Platform = 'ios' | 'android' | 'desktop'

/**
 * Platform detection, client-side only.
 *
 * This must never run during SSR: rendering a platform-specific UI on the
 * server and a different one on the client is a hydration mismatch. Returning
 * 'desktop' until mount means the first paint is the neutral one.
 */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>('desktop')

  useEffect(() => {
    const ua = navigator.userAgent || ''
    // iPadOS 13+ reports as Macintosh; the touch-point check catches it.
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && typeof document !== 'undefined' && navigator.maxTouchPoints > 1)
    if (isIOS) setPlatform('ios')
    else if (/Android/.test(ua)) setPlatform('android')
    else setPlatform('desktop')
  }, [])

  return platform
}

export function useDeviceStoreUrl(): Platform {
  return usePlatform()
}

export function storeUrlFor(platform: Platform): string {
  if (platform === 'ios') return APP.appStoreUrl
  if (platform === 'android') return APP.playStoreUrl
  return '/download'
}

/**
 * Open a screen in the native app, falling back to the store.
 *
 * There is no reliable API that answers "is the app installed?", so this uses
 * the standard race: fire the custom scheme, then send the browser to the store
 * after a short delay. If the app DID open, the page is backgrounded and the
 * timer either never fires or fires while hidden — hence the visibility check,
 * without which a user who successfully opened the app returns to the browser
 * later and finds the App Store loaded behind it.
 *
 * `path` maps to the app's linking config, e.g. `cars/<uuid>` →
 * sawa://cars/<uuid>. The scheme is declared in app.config.js, and the paths
 * are deliberately identical to this site's own URLs so one string serves both
 * the https universal link and the custom-scheme fallback — see
 * src/navigation/linking.js in the Expo project.
 */
export function useOpenInApp() {
  const platform = usePlatform()

  return useCallback(
    (path = '') => {
      if (platform === 'desktop') {
        window.location.href = '/download'
        return
      }

      const store = storeUrlFor(platform)
      const deepLink = `${APP.scheme}://${path.replace(/^\//, '')}`

      let settled = false
      const giveUp = window.setTimeout(() => {
        if (settled) return
        // Page still visible ⇒ the scheme did not resolve ⇒ app not installed.
        if (document.visibilityState === 'visible') {
          window.location.href = store
        }
      }, 1400)

      const onHide = () => {
        settled = true
        window.clearTimeout(giveUp)
      }
      document.addEventListener('visibilitychange', onHide, { once: true })
      window.addEventListener('pagehide', onHide, { once: true })

      window.location.href = deepLink
    },
    [platform]
  )
}
