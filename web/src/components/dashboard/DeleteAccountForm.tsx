'use client'

import { useActionState, useState } from 'react'
import { deleteAccountAction } from '@/app/(dashboard)/dashboard/profile/actions'
import { Button, Field, Input } from '@/components/ui'
import type { ActionState } from './types'
import { SubmitButton } from './SubmitButton'

// ─────────────────────────────────────────────────────────────────────────────
// Account deletion.
//
// Two deliberate pieces of friction before the form even appears: the panel is
// collapsed behind a button, and inside it the password and an explicit
// acknowledgement are both required. Deletion is irreversible and the server
// cannot undo it, so the cost of an accidental tap is total.
//
// What it does NOT do is hide the option or bury it — Apple requires deletion
// to be "easy to find", and a dark pattern here fails review as surely as
// having no deletion at all.
// ─────────────────────────────────────────────────────────────────────────────

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState<ActionState, FormData>(deleteAccountAction, null)

  if (!open) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-surface p-5 sm:p-6">
        <h2 className="text-title-sm font-extrabold text-content">Delete your account</h2>
        <p className="mt-2 text-caption text-content-secondary">
          Permanently removes your profile, saved cars, saved searches and identity documents.
          Records of cars you have already bought or sold are kept, as the law requires.
        </p>
        <Button
          type="button"
          variant="danger"
          size="compact"
          onClick={() => setOpen(true)}
          className="mt-4"
        >
          Delete my account
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-2xl border border-danger bg-surface p-5 sm:p-6">
      <h2 className="text-title-sm font-extrabold text-content">Confirm deletion</h2>
      <p className="mt-2 text-caption text-content-secondary">
        This cannot be undone. You will be signed out on every device.
      </p>

      {state?.error ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-caption font-semibold text-danger">
          {state.error}
        </p>
      ) : null}

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
          I understand this permanently deletes my account and cannot be undone.
        </label>
      </div>
      {state?.fieldErrors?.acknowledge ? (
        <p id="delete-acknowledge-error" className="mt-2 text-micro font-semibold text-danger">
          {state.fieldErrors.acknowledge}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Deleting…" variant="primary">
          Delete my account
        </SubmitButton>
        <Button type="button" variant="outline" size="compact" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
