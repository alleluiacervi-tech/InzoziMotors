'use client'

import { useActionState, useState } from 'react'
import { deleteAccountAction } from '@/app/(dashboard)/dashboard/profile/actions'
import { Button, Field, Input } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import type { ActionState } from './types'
import { SubmitButton } from './SubmitButton'

// ─────────────────────────────────────────────────────────────────────────────
// Closing an account.
//
// Deliberate friction before the form appears — the panel is collapsed, and
// inside it a reason, the password and an explicit acknowledgement are all
// required. What it does NOT do is hide the option or bury it: Apple requires
// deletion to be "easy to find", and a dark pattern here fails review as surely
// as having no deletion at all.
//
// The copy changed with the behaviour. This used to say "permanently" and "this
// cannot be undone", which was true of the old one-shot delete. Closing is
// immediate but reversible for thirty days, and saying so is not softening the
// message — a person who closes by mistake, or in anger, or on somebody else's
// laptop, needs to know the way back exists while they can still use it.
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_REASONS = [
  { value: 'found_a_car', label: 'I found a car' },
  { value: 'sold_my_car', label: 'I sold my car' },
  { value: 'not_useful', label: "I didn't find what I was looking for" },
  { value: 'too_many_messages', label: 'Too many messages or notifications' },
  { value: 'privacy', label: "I don't want my details on the platform" },
  { value: 'bad_experience', label: 'I had a bad experience' },
  { value: 'duplicate_account', label: 'I have another account' },
  { value: 'other', label: 'Something else' },
]

export function DeleteAccountForm({
  reasons = FALLBACK_REASONS,
  recoveryDays = 30,
}: {
  /** Fetched server-side from /auth/closure-reasons so the options here are the
   *  ones the server's CHECK constraint will actually accept. */
  reasons?: { value: string; label: string }[]
  recoveryDays?: number
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState<ActionState, FormData>(deleteAccountAction, null)

  // Translate a reason by its stable value when we have a matching key; fall
  // back to the server-provided label (which may be a value the CHECK
  // constraint added after this build shipped).
  const reasonLabel = (value: string, fallback: string) => {
    const key = `dashboard.profile.delete.reasons.${value}`
    const translated = t(key)
    return translated === key ? fallback : translated
  }

  if (!open) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-surface p-5 sm:p-6">
        <h2 className="text-title-sm font-extrabold text-content">{t('dashboard.profile.delete.collapsedTitle')}</h2>
        <p className="mt-2 text-caption text-content-secondary">
          {t('dashboard.profile.delete.collapsedBody', { days: recoveryDays })}
        </p>
        <Button
          type="button"
          variant="danger"
          size="compact"
          onClick={() => setOpen(true)}
          className="mt-4"
        >
          {t('dashboard.profile.delete.openButton')}
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-2xl border border-danger bg-surface p-5 sm:p-6">
      <h2 className="text-title-sm font-extrabold text-content">{t('dashboard.profile.delete.beforeTitle')}</h2>
      <p className="mt-2 text-caption text-content-secondary">
        {t('dashboard.profile.delete.beforeBody')}
      </p>

      {state?.error ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-caption font-semibold text-danger">
          {state.error}
        </p>
      ) : null}

      <fieldset className="mt-5">
        <legend className="text-caption font-bold text-content">{t('dashboard.profile.delete.reasonLegend')}</legend>
        <div className="mt-2 space-y-1">
          {reasons.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-caption text-content-secondary hover:bg-surface-alt"
            >
              <input type="radio" name="reason" value={option.value} className="h-4 w-4 accent-brand" />
              {reasonLabel(option.value, option.label)}
            </label>
          ))}
        </div>
        {state?.fieldErrors?.reason ? (
          <p className="mt-2 text-micro font-semibold text-danger">{state.fieldErrors.reason}</p>
        ) : null}
      </fieldset>

      <Field label={t('dashboard.profile.delete.noteLabel')} htmlFor="delete-note" className="mt-4">
        <textarea
          id="delete-note"
          name="note"
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-line bg-surface p-3 text-caption focus:outline-none"
        />
      </Field>

      <Field
        label={t('dashboard.profile.delete.passwordLabel')}
        htmlFor="delete-password"
        error={state?.fieldErrors?.password}
        className="mt-5"
      >
        <Input
          id="delete-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={Boolean(state?.fieldErrors?.password)}
          aria-describedby={state?.fieldErrors?.password ? 'delete-password-error' : undefined}
        />
      </Field>

      <div className="mt-4 flex items-start gap-3">
        <input
          id="delete-acknowledge"
          name="acknowledge"
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-danger"
          aria-describedby={state?.fieldErrors?.acknowledge ? 'delete-acknowledge-error' : undefined}
        />
        <label htmlFor="delete-acknowledge" className="text-caption text-content-secondary">
          {t('dashboard.profile.delete.acknowledge', { days: recoveryDays })}
        </label>
      </div>
      {state?.fieldErrors?.acknowledge ? (
        <p id="delete-acknowledge-error" className="mt-2 text-micro font-semibold text-danger">
          {state.fieldErrors.acknowledge}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton pendingLabel={t('dashboard.profile.delete.closing')} variant="primary">
          {t('dashboard.profile.delete.confirmButton')}
        </SubmitButton>
        <Button type="button" variant="outline" size="compact" onClick={() => setOpen(false)}>
          {t('dashboard.profile.delete.cancel')}
        </Button>
      </div>
    </form>
  )
}
