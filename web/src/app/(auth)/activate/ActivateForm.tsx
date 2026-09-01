'use client'

import { useActionState } from 'react'
import { activateAccount } from './actions'
import { Alert, Button } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { PasswordField } from '../_components/PasswordField'

export function ActivateForm({ token }: { token: string }) {
  const t = useT()
  const [state, action, pending] = useActionState(activateAccount, null)
  return <form action={action} className="space-y-5">
    <input type="hidden" name="token" value={token} />
    {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
    <PasswordField id="password" name="password" label={t('auth.activate.createPassword')} required autoComplete="new-password" hint={t('auth.activate.createHint')} />
    <PasswordField id="confirm" name="confirm" label={t('auth.activate.confirmPassword')} required autoComplete="new-password" />
    <Button type="submit" fullWidth size="lg" disabled={pending}>{pending ? t('auth.activate.submitting') : t('auth.activate.submit')}</Button>
  </form>
}
