'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  disableWebPushAction, enableWebPushAction, sendTestPushAction, webPushStatusAction,
} from '@/app/actions/web-push'
import { Alert, Button, Icon, LiveRegion } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import {
  base64UrlToBytes, isIos, isStandalone, pushSupported, registerServiceWorker, sameKey,
} from '@/lib/pwa'
import { APP } from '@/lib/site'

// Browser notifications (G13 in docs/WEB-PARITY-PLAN.md): the website's half of
// what the app's Settings → Notifications does, including its test button.
//
// Renders nothing while the API has no VAPID key (publicKey null), so nothing
// is promised before it can be delivered. Every other state says what is true
// for THIS browser: unsupported, blocked, iPhone not yet on the home screen,
// off, or on. The permission prompt only ever follows a tap on "Turn on".

type Status = 'checking' | 'unsupported' | 'ios' | 'denied' | 'off' | 'on'
type Note = { tone: 'success' | 'danger' | 'info'; text: string } | null

export function WebPushToggle({ publicKey }: { publicKey: string | null }) {
  const t = useT()
  const [status, setStatus] = useState<Status>('checking')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note>(null)

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setStatus(isIos() && !isStandalone() ? 'ios' : 'unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration('/')
      const subscription = await registration?.pushManager.getSubscription()
      if (!subscription || Notification.permission !== 'granted') {
        setStatus('off')
        return
      }
      // The browser may hold a subscription another account turned on, or
      // one the API has since pruned: only the API knows if it is ours.
      const result = await webPushStatusAction(subscription.endpoint)
      setStatus(result.ok && result.subscribed ? 'on' : 'off')
    } catch {
      setStatus('off')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!publicKey) return null

  async function turnOn() {
    if (!publicKey) return
    setBusy(true)
    setNote(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off')
        return
      }
      const registration = await registerServiceWorker()
      const key = base64UrlToBytes(publicKey)
      let subscription = await registration.pushManager.getSubscription()
      // Made with an older key pair: it can never receive from the API again.
      if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
        await subscription.unsubscribe()
        subscription = null
      }
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
      const result = await enableWebPushAction(subscription.toJSON())
      if (result.ok) setStatus('on')
      else setNote({ tone: 'danger', text: result.error })
    } catch {
      setNote({ tone: 'danger', text: t('dashboard.push.error') })
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    setNote(null)
    try {
      const registration = await navigator.serviceWorker.getRegistration('/')
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        const result = await disableWebPushAction(subscription.endpoint)
        if (!result.ok) {
          setNote({ tone: 'danger', text: result.error })
          return
        }
        await subscription.unsubscribe().catch(() => false)
      }
      setStatus('off')
    } catch {
      setNote({ tone: 'danger', text: t('dashboard.push.error') })
    } finally {
      setBusy(false)
    }
  }

  async function sendTest() {
    setBusy(true)
    setNote(null)
    try {
      const result = await sendTestPushAction()
      if (!result.ok) setNote({ tone: 'danger', text: result.error })
      else if (!result.result.devices.length) setNote({ tone: 'info', text: t('dashboard.push.testNone') })
      else if (result.result.devices.some((d) => d.platform === 'browser' && d.ok)) setNote({ tone: 'success', text: t('dashboard.push.testSent') })
      else setNote({ tone: 'danger', text: t('dashboard.push.testFailed') })
    } catch {
      setNote({ tone: 'danger', text: t('dashboard.push.error') })
    } finally {
      setBusy(false)
    }
  }

  const on = status === 'on'
  const actionable = status === 'on' || status === 'off'

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            on ? 'bg-success-tint text-success' : 'bg-surface-alt text-content-muted'
          }`}
        >
          <Icon name="bell" size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-extrabold text-content">{t('dashboard.push.title')}</p>
          <p className="mt-0.5 text-micro leading-relaxed text-content-muted">
            {actionable ? (on ? t('dashboard.push.on') : t('dashboard.push.off')) : t('dashboard.push.body')}
          </p>
        </div>
        {actionable ? (
          <Button
            type="button"
            size="compact"
            variant={on ? 'outline' : 'primary'}
            onClick={on ? turnOff : turnOn}
            disabled={busy}
            aria-pressed={on}
            className="shrink-0"
          >
            {busy ? t('dashboard.push.working') : on ? t('dashboard.push.turnOff') : t('dashboard.push.turnOn')}
          </Button>
        ) : null}
      </div>

      {status === 'checking' ? (
        <div aria-hidden="true" className="h-4 w-2/3 animate-pulse rounded bg-surface-alt" />
      ) : null}
      {status === 'off' ? (
        <p className="text-micro leading-relaxed text-content-secondary">{t('dashboard.push.body')}</p>
      ) : null}
      {status === 'denied' ? <Alert tone="warning">{t('dashboard.push.denied')}</Alert> : null}
      {status === 'unsupported' ? (
        <p className="text-micro leading-relaxed text-content-secondary">{t('dashboard.push.unsupported')}</p>
      ) : null}
      {status === 'ios' ? (
        APP.iosLive ? (
          <p className="text-micro leading-relaxed text-content-secondary">
            {t('dashboard.push.iosApp')}{' '}
            <a href={APP.appStoreUrl} className="font-bold text-brand underline-offset-2 hover:underline">
              {t('dashboard.push.getApp')}
            </a>
          </p>
        ) : (
          <p className="text-micro leading-relaxed text-content-secondary">{t('dashboard.push.iosInstall')}</p>
        )
      ) : null}

      {on ? (
        <Button type="button" variant="ghost" size="compact" onClick={sendTest} disabled={busy}>
          {t('dashboard.push.sendTest')}
        </Button>
      ) : null}

      {note ? <Alert tone={note.tone}>{note.text}</Alert> : null}
      <LiveRegion>{note?.text ?? ''}</LiveRegion>
    </div>
  )
}

export default WebPushToggle
