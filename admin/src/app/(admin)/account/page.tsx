'use client'

// ─────────────────────────────────────────────────────────────────────────────
// The operator's own account.
//
// POST /auth/change-password has existed the whole time; nothing in this
// dashboard could reach it. That is how a weak admin password survives: not
// because anyone chose to keep it, but because changing it meant an SSH session
// and a hand-built HTTP request, so it never got done.
//
// The rules here are STRICTER than the API's six-character floor. This account
// can publish listings and read national identity documents, and its username
// is predictable on a public domain — six characters is not a credential for
// that. The server stays permissive for ordinary users; this screen does not
// have to be.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, PageHeader } from '@/components/ui'
import { useToast } from '@/components/feedback'

const MIN_LENGTH = 12

/** Problems worth naming, in the order a person would fix them. */
function problemsWith(next: string, confirmation: string, current: string): string[] {
  const problems: string[] = []
  if (next.length < MIN_LENGTH) problems.push(`Use at least ${MIN_LENGTH} characters — this account can read identity documents.`)
  if (next && next === current) problems.push('That is the password you already have.')
  if (confirmation && next !== confirmation) problems.push('The two new passwords do not match.')
  // Named patterns rather than a score: a strength meter tells someone their
  // password is "good", which is a claim nobody can honestly make.
  if (/^[A-Za-z]+\d{2,4}[.!]?$/.test(next)) {
    problems.push('A word followed by a year is the first thing anyone guesses against a known address.')
  }
  return problems
}

export default function AccountPage() {
  const toast = useToast()
  const [me, setMe] = useState<any>(null)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.me().then(setMe).catch(() => setMe(null)) }, [])

  const problems = problemsWith(next, confirmation, current)
  const ready = current.length > 0 && next.length > 0 && confirmation.length > 0 && problems.length === 0

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready) return
    setSaving(true)
    try {
      await api.changeOwnPassword(current, next)
      toast('Password changed. Every other session has been signed out.', 'success')
      setCurrent(''); setNext(''); setConfirmation('')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not change the password.', 'error')
    } finally { setSaving(false) }
  }

  const field = 'mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none'

  return (
    <div className="max-w-xl">
      <PageHeader
        title="My account"
        description="Change the password for the account you are signed in with."
      />

      {me ? (
        <Card className="mb-5 p-4">
          <p className="text-label font-semibold text-content">{me.name}</p>
          <p className="text-label text-content-muted">{me.email}</p>
        </Card>
      ) : null}

      <Card className="p-5">
        <form onSubmit={submit} className="grid gap-4">
          <label className="text-label font-semibold text-content">
            Current password
            <input type="password" autoComplete="current-password" required
              value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
          </label>
          <label className="text-label font-semibold text-content">
            New password
            <input type="password" autoComplete="new-password" required
              value={next} onChange={(e) => setNext(e.target.value)} className={field} />
            <span className="mt-1 block text-caption font-normal text-content-muted">
              At least {MIN_LENGTH} characters. Long and unusual beats short and clever — and it must
              not be a password you use anywhere else.
            </span>
          </label>
          <label className="text-label font-semibold text-content">
            Confirm the new password
            <input type="password" autoComplete="new-password" required
              value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={field} />
          </label>

          {/* Shown only once there is something to say, so the form does not
              open by telling the operator they are already wrong. */}
          {next && problems.length ? (
            <ul className="grid gap-1 rounded-xl bg-warning-tint px-4 py-3">
              {problems.map((problem) => (
                <li key={problem} className="text-label text-warning-text">· {problem}</li>
              ))}
            </ul>
          ) : null}

          <p className="text-caption text-content-muted">
            Changing this signs out every other session — phone, another browser, anyone who
            should not have it. This one stays signed in.
          </p>

          <button disabled={!ready || saving}
            className="rounded-xl bg-brand px-5 py-3 text-label font-bold text-brand-on hover:bg-brand-bright disabled:opacity-50">
            {saving ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </Card>
    </div>
  )
}
