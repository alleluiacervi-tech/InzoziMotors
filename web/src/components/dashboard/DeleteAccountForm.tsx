'use client'

import { useActionState, useState } from 'react'
import { deleteAccountAction } from '@/app/(dashboard)/dashboard/profile/actions'
import { Button, Field, Input } from '@/components/ui'
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
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState<ActionState, FormData>(deleteAccountAction, null)

  if (!open) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-surface p-5 sm:p-6">
        <h2 className="text-title-sm font-extrabold text-content">Close your account</h2>
        <p className="mt-2 text-caption text-content-secondary">
          Your listings come down and you are signed out everywhere straight away. Nothing is
          erased for {recoveryDays} days — until then you can sign back in and reopen it. After
          that your profile, saved cars, saved searches and identity documents are deleted for
          good. Records of cars you have already bought or sold are kept, as the law requires.
        </p>
        <Button
          type="button"
          variant="danger"
          size="compact"
          onClick={() => setOpen(true)}
          className="mt-4"
        >
          Close my account
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-2xl border border-danger bg-surface p-5 sm:p-6">
      <h2 className="text-title-sm font-extrabold text-content">Before you go</h2>
      <p className="mt-2 text-caption text-content-secondary">
        Why are you closing your account? It genuinely changes what we fix next.
      </p>

      {state?.error ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-caption font-semibold text-danger">
          {state.error}
        </p>
      ) : null}

      <fieldset className="mt-5">
        <legend className="text-caption font-bold text-content">Reason</legend>
        <div className="mt-2 space-y-1">
          {reasons.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-caption text-content-secondary hover:bg-surface-alt"
            >
              <input type="radio" name="reason" value={option.value} className="h-4 w-4 accent-brand" />
              {option.label}
            </label>
          ))}
        </div>
        {state?.fieldErrors?.reason ? (
          <p className="mt-2 text-micro font-semibold text-danger">{state.fieldErrors.reason}</p>
        ) : null}
      </fieldset>

      <Field label="Anything else? (optional)" htmlFor="delete-note" className="mt-4">
        <textarea
          id="delete-note"
          name="note"
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-line bg-surface p-3 text-caption focus:outline-none"
        />
      </Field>

      <Field
        label="Your password"
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
          I understand my account closes now, and is deleted for good after {recoveryDays} days.
        </label>
      </div>
      {state?.fieldErrors?.acknowledge ? (
        <p id="delete-acknowledge-error" className="mt-2 text-micro font-semibold text-danger">
          {state.fieldErrors.acknowledge}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Closing…" variant="primary">
          Close my account
        </SubmitButton>
        <Button type="button" variant="outline" size="compact" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
