'use client'

import { useActionState } from 'react'
import { updateNotificationSettingsAction } from '@/app/(dashboard)/dashboard/profile/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, LiveRegion } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

type Props = { messageEmails: boolean; alertSearchMatches: boolean; alertPriceDrops: boolean }

export function NotificationSettingsForm({ messageEmails, alertSearchMatches, alertPriceDrops }: Props) {
  const t = useT()
  const [state, action] = useActionState(updateNotificationSettingsAction, null)

  return (
    <form action={action} className="space-y-4">
      <SettingCheckbox
        name="message_email_notifications"
        defaultChecked={messageEmails}
        label={t('dashboard.profile.form.messageEmails')}
        hint={t('dashboard.profile.form.messageEmailsHint')}
      />

      {/* The two alerts Sawa sends on its own. Saved on the account, so the
          app follows them too; each saved search keeps its own switch. */}
      <fieldset className="space-y-4 border-t border-line-soft pt-4">
        <legend className="mb-3 text-micro font-bold uppercase tracking-wide text-content-muted">
          {t('dashboard.profile.form.alerts')}
        </legend>
        <SettingCheckbox
          name="alert_search_matches"
          defaultChecked={alertSearchMatches}
          label={t('dashboard.profile.form.alertSearchMatches')}
          hint={t('dashboard.profile.form.alertSearchMatchesHint')}
        />
        <SettingCheckbox
          name="alert_price_drops"
          defaultChecked={alertPriceDrops}
          label={t('dashboard.profile.form.alertPriceDrops')}
          hint={t('dashboard.profile.form.alertPriceDropsHint')}
        />
      </fieldset>

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton pendingLabel={t('dashboard.profile.form.saving')}>{t('dashboard.profile.form.save')}</SubmitButton>
      <LiveRegion>{state?.ok ? state.message : state?.error ?? ''}</LiveRegion>
    </form>
  )
}

function SettingCheckbox({ name, defaultChecked, label, hint }: { name: string; defaultChecked: boolean; label: string; hint: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-caption font-semibold text-content">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 shrink-0 accent-brand" />
      <span>
        {label}
        <span className="mt-0.5 block text-micro font-normal text-content-muted">{hint}</span>
      </span>
    </label>
  )
}

export default NotificationSettingsForm
