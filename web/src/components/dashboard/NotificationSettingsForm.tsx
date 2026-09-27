'use client'

import { useActionState } from 'react'
import { updateNotificationSettingsAction } from '@/app/(dashboard)/dashboard/profile/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, LiveRegion } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

export function NotificationSettingsForm({ messageEmails }: { messageEmails: boolean }) {
  const t = useT()
  const [state, action] = useActionState(updateNotificationSettingsAction, null)

  return (
    <form action={action} className="space-y-4">
      <label className="flex items-start gap-3 text-caption font-semibold text-content">
        <input
          type="checkbox"
          name="message_email_notifications"
          defaultChecked={messageEmails}
          className="mt-0.5 h-4 w-4 accent-brand"
        />
        <span>
          {t('dashboard.profile.form.messageEmails')}
          <span className="mt-0.5 block text-micro font-normal text-content-muted">
            {t('dashboard.profile.form.messageEmailsHint')}
          </span>
        </span>
      </label>

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton pendingLabel={t('dashboard.profile.form.saving')}>{t('dashboard.profile.form.save')}</SubmitButton>
      <LiveRegion>{state?.ok ? state.message : state?.error ?? ''}</LiveRegion>
    </form>
  )
}

export default NotificationSettingsForm
