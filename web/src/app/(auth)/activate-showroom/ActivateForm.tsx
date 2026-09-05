'use client'

import { useActionState } from 'react'
import { activateShowroom } from './actions'
import { Alert, Button } from '@/components/ui'
import { PasswordField } from '../_components/PasswordField'

export function ActivateForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(activateShowroom, null)
  return <form action={action} className="space-y-5">
    <input type="hidden" name="token" value={token} />
    {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
    <PasswordField id="password" name="password" label="Create password" required autoComplete="new-password" hint="At least 8 characters; use a password you do not use elsewhere." />
    <PasswordField id="confirm" name="confirm" label="Confirm password" required autoComplete="new-password" />
    <Button type="submit" fullWidth size="lg" disabled={pending}>{pending ? 'Activating…' : 'Activate showroom account'}</Button>
  </form>
}
