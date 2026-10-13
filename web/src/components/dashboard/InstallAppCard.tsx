'use client'

import { useEffect, useState } from 'react'
import { LogoMark } from '@/components/brand/Logo'
import { Button, Icon } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { isAndroid, isIos, isStandalone } from '@/lib/pwa'
import { APP } from '@/lib/site'

// "Add Sawa Cars to your home screen", on the dashboard overview only: the
// people who come back are the ones worth asking (docs/WEB-PARITY-PLAN.md,
// Phase 4). Shown only where it can work:
//   · Chrome, Edge, Samsung Internet: the browser's own install prompt, kept
//     from `beforeinstallprompt` and fired from the button;
//   · never once installed, never on a platform whose store app is live (the
//     native app is the better offer there), and not for 30 days after
//     "Not now".

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'sawa_install_dismissed_at'
const DISMISS_DAYS = 30

// The browser fires this once, often before React has hydrated, so it is
// caught at module load and kept for whichever card mounts.
let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallPromptEvent
    listeners.forEach((notify) => notify())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((notify) => notify())
  })
}

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return Date.now() - at < DISMISS_DAYS * 86_400_000
  } catch {
    return false
  }
}

function nativeAppPreferred(): boolean {
  return (isIos() && APP.iosLive) || (isAndroid() && APP.androidLive)
}

export function InstallAppCard() {
  const t = useT()
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (isStandalone() || nativeAppPreferred()) return
    const sync = () => setAvailable(deferred !== null && !dismissedRecently())
    sync()
    listeners.add(sync)
    return () => {
      listeners.delete(sync)
    }
  }, [])

  if (!available) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* private mode: hiding for this visit is enough */
    }
    setAvailable(false)
  }

  async function install() {
    const event = deferred
    if (!event) return
    deferred = null
    await event.prompt().catch(() => {})
    const choice = await event.userChoice.catch(() => null)
    if (choice?.outcome === 'accepted') setAvailable(false)
    else dismiss()
  }

  return (
    <section
      aria-labelledby="install-app"
      className="mb-6 flex flex-col gap-4 rounded-2xl border border-line-soft bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span aria-hidden="true" className="shrink-0">
          <LogoMark size={40} />
        </span>
        <div className="min-w-0">
          <h2 id="install-app" className="text-caption font-extrabold text-content">
            {t('dashboard.install.title')}
          </h2>
          <p className="mt-0.5 text-micro leading-relaxed text-content-secondary">
            {t('dashboard.install.body')}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="ghost" size="compact" onClick={dismiss} className="flex-1 sm:flex-none">
          {t('dashboard.install.dismiss')}
        </Button>
        <Button type="button" size="compact" onClick={install} className="flex-1 sm:flex-none">
          <Icon name="plus" size={16} />
          {t('dashboard.install.button')}
        </Button>
      </div>
    </section>
  )
}

export default InstallAppCard
