'use client'

import { useActionState, useState } from 'react'
import { deleteAccountAction } from '@/app/(dashboard)/dashboard/profile/actions'
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 h-11 rounded-xl border border-danger px-5 text-caption font-bold text-danger transition-colors hover:bg-danger hover:text-white"
        >
          Delete my account
        </button>
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

      <div className="mt-5">
        <label htmlFor="delete-password" className="block text-caption font-bold text-content">
          Your password
        </label>
        <input
          id="delete-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state?.fieldErrors?.password)}
          aria-describedby={state?.fieldErrors?.password ? 'delete-password-error' : undefined}
          className="mt-2 h-12 w-full rounded-xl border border-line bg-surface px-4 text-body text-content outline-none focus:border-content"
        />
        {state?.fieldErrors?.password ? (
          <p id="delete-password-error" className="mt-2 text-micro font-semibold text-danger">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

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
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-11 rounded-xl border border-line px-5 text-caption font-bold text-content-secondary transition-colors hover:bg-surface-alt"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
