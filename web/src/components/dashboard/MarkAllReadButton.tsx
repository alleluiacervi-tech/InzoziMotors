'use client'

import { useActionState } from 'react'
import { markAllReadAction } from '@/app/(dashboard)/dashboard/notifications/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { LiveRegion } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

export function MarkAllReadButton({ unread }: { unread: number }) {
  const t = useT()
  const [state, action] = useActionState(markAllReadAction, null)

  return (
    <form action={action}>
      <SubmitButton variant="outline" size="sm" pendingLabel={t('dashboard.notifications.marking')}>
        {t('dashboard.notifications.markAllRead')}
        <span className="sr-only"> {t('dashboard.notifications.markAllReadCount', { count: unread })}</span>
      </SubmitButton>
      {state?.error ? (
        <p role="alert" className="mt-2 text-micro font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <LiveRegion>{state?.ok ? state.message : ''}</LiveRegion>
    </form>
  )
}

export default MarkAllReadButton
