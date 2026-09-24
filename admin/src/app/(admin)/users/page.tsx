'use client'

import { ExportLink } from '@/components/ExportLink'
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, Pill } from '@/components/ui'
import ListingCap from '@/components/ListingCap'
import { useConfirm, useToast } from '@/components/feedback'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFocusRow } from '@/components/useFocusRow'
import { fmtDate } from '@/lib/format'
import { RowMenu } from '@/components/RowMenu'

type UserRow = {
  id: string
  name: string
  email: string
  phone?: string | null
  whatsapp_phone?: string | null
  phone_visible?: boolean
  whatsapp_visible?: boolean
  role: string
  id_verified: 'pending' | 'approved' | 'rejected' | string
  trust_score?: number
  completed_sales?: number
  created_at: string
  id_submitted_at?: string
  id_front_url?: string
  id_back_url?: string
  selfie_url?: string
  seller_type?: string | null
  max_active_listings?: number | null
  listing_cap_note?: string | null
  active_listings?: number
  business_name?: string | null
  business_verified?: boolean
  must_change_password?: boolean
  account_status?: 'active' | 'suspended'
  suspended_at?: string | null
  suspension_reason?: string | null
  id_verification_method?: string | null
  id_verification_note?: string | null
  id_verification_ref?: string | null
  id_verified_at?: string | null
  id_verified_by_name?: string | null
}

// How an identity can be established away from the dashboard. 'documents' is
// deliberately absent: that path is the queue below, where the uploaded files
// are the evidence. Each of these carries no file, so the written note IS the
// evidence — the server rejects a short one and so does a CHECK constraint.
const OFFLINE_METHODS = [
  { value: 'in_person', label: 'National ID or passport seen in person',
    hint: 'You or a colleague inspected the physical document.',
    placeholder: 'e.g. Seller brought their national ID to the Kicukiro office; photo and name match the account.' },
  { value: 'business_document', label: 'Business registration or TIN document seen',
    hint: 'For a showroom or company, verified against its registration.',
    placeholder: 'e.g. RDB certificate presented; company name and representative match the account.' },
  { value: 'known_client', label: 'Established client, documents held off-platform',
    hint: 'A relationship that predates the platform, with a file kept in the office.',
    placeholder: 'e.g. Trading with us since 2024; ID copy is in the office file under their account name.' },
] as const
const METHOD_LABELS: Record<string, string> = {
  documents: 'documents reviewed',
  ...Object.fromEntries(OFFLINE_METHODS.map((m) => [m.value, m.label.toLowerCase()])),
}
const MIN_ATTESTATION = 10

// What an admin can create. Only a showroom starts out verified — a buyer or
// an individual seller has to go through the ID check like anyone else, because
// id_verified gates seller eligibility and contact disclosure.
const ACCOUNT_KINDS = [
  { value: 'buyer' as const, noun: 'Buyer account', hint: 'Browses, saves and messages. No verification granted.' },
  { value: 'individual_seller' as const, noun: 'Seller account', hint: 'Can submit a vehicle. Still needs an ID check before anything publishes.' },
  { value: 'showroom' as const, noun: 'Verified showroom', hint: 'Business-verified on creation, and may hold rental inventory.' },
]

export default function UsersPage() {
  // The Action Center links straight to the identity queue with the person it
  // named, so the tab is part of the destination, not a thing to find again.
  const { focusProps } = useFocusRow()
  const router = useRouter()
  const requestedTab = useSearchParams().get('tab')
  const [tab, setTab] = useState<'directory' | 'verification'>(
    requestedTab === 'verification' ? 'verification' : 'directory'
  )
  const [items, setItems] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [actionId, setActionId] = useState<string | null>(null)
  const [showroomOpen, setShowroomOpen] = useState(false)
  const [manualInvite, setManualInvite] = useState<{ email: string; url: string | null } | null>(null)
  const [accountType, setAccountType] = useState<'buyer' | 'individual_seller' | 'showroom'>('showroom')
  const [showroom, setShowroom] = useState({ name: '', business_name: '', email: '', phone: '' })
  const [editing, setEditing] = useState<null | {
    id: string; name: string; role: 'buyer' | 'seller'; phone: string; whatsapp_phone: string;
    business_name: string; business_verified: boolean; phone_visible: boolean; whatsapp_visible: boolean
  }>(null)
  const [verifying, setVerifying] = useState<null | {
    user: UserRow; method: string; note: string; reference: string
  }>(null)
  const ask = useConfirm()
  const toast = useToast()

  // The edit modal keeps its own draft of the editable fields, but a cap is not
  // one of them — it is saved by its own route. Read it from the loaded row so
  // the panel always shows what is actually stored, not a stale draft.
  const rowFor = (id: string) => items.find((u) => u.id === id)
  const capFor = (id: string) => rowFor(id)?.max_active_listings ?? null
  const capNoteFor = (id: string) => rowFor(id)?.listing_cap_note ?? null
  const activeFor = (id: string) => rowFor(id)?.active_listings

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = tab === 'verification'
        ? await api.idVerificationQueue()
        : await api.searchUsers(search, 100)
      setItems(data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [tab, search])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 350)
    return () => clearTimeout(timer)
  }, [query])

  async function decide(userId: string, decision: 'approved' | 'rejected') {
    const approving = decision === 'approved'
    const ok = await ask({
      title: approving ? 'Approve this ID verification?' : 'Reject this ID verification?',
      message: approving
        ? 'The seller is verified, gains 30 trust-score points, and eligible inspected listings can proceed toward publication.'
        : 'The seller is notified and must re-submit documents before any listing or direct contact can become public.',
      confirmLabel: approving ? 'Approve seller' : 'Reject documents',
      tone: approving ? 'primary' : 'danger',
    })
    if (!ok) return
    setActionId(userId)
    try {
      await api.decideVerification(userId, decision)
      toast(approving ? 'Seller verified' : 'Documents rejected', 'success')
      await load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setActionId(null)
    }
  }

  async function createShowroom(event: React.FormEvent) {
    event.preventDefault()
    setActionId('new-showroom')
    try {
      const created = await api.createAccount({ ...showroom, account_type: accountType })
      const label = ACCOUNT_KINDS.find((k) => k.value === accountType)?.noun ?? 'Account'
      if (created.invitation_sent) {
        toast(`${label} created and activation email sent`, 'success')
        setManualInvite(null)
      } else {
        // The account exists, cannot be logged into, and its one-use link lived
        // only in an email that did not arrive. Show the link so this is
        // recoverable instead of a dead end.
        toast(`${label} created, but the email did not send — copy the link below`, 'error')
        setManualInvite({ email: showroom.email, url: created.activation_url ?? null })
      }
      setShowroom({ name: '', business_name: '', email: '', phone: '' })
      setShowroomOpen(false)
      await load()
    } catch (e: any) { toast(e.message, 'error') }
    finally { setActionId(null) }
  }

  // Revoking an approved identity was backend-only: the approve/reject buttons
  // live in the pending queue, so once a seller was verified there was no way
  // to undo it from the dashboard — only the blunter Suspend. The server does
  // the whole cascade (sessions ended, contact hidden, listings back to review,
  // rental inventory to maintenance); this just exposes it where it is needed.
  async function revokeIdentity(user: UserRow) {
    const ok = await ask({
      title: `Revoke ${user.name}'s identity approval?`,
      message: 'Their sessions end immediately, phone and WhatsApp visibility are switched off, live listings return to under review, and any rental inventory goes to maintenance. They must submit documents again.',
      confirmLabel: 'Revoke approval',
      tone: 'danger',
    })
    if (!ok) return
    setActionId(`revoke-${user.id}`)
    try {
      await api.decideVerification(user.id, 'rejected')
      toast('Identity approval revoked — listings and contact visibility were withdrawn', 'success')
      await load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setActionId(null)
    }
  }

  // The counterpart to revocation, and the fix for a genuine dead end: the
  // queue only ever listed people who had uploaded documents, so a seller
  // verified at the counter appeared nowhere and there was no button at all.
  // Approving them is a legitimate act; doing it without recording who checked
  // what is not, which is why the note below is required rather than optional.
  async function submitOfflineVerification(e: React.FormEvent) {
    e.preventDefault()
    if (!verifying) return
    const note = verifying.note.trim()
    if (note.length < MIN_ATTESTATION) {
      toast(`Describe what you checked, in at least ${MIN_ATTESTATION} characters.`, 'error')
      return
    }
    const ok = await ask({
      title: `Verify ${verifying.user.name}'s identity?`,
      message: 'This grants seller eligibility and public contact eligibility, and adds 30 trust-score points. Your name and your note are recorded permanently against this decision.',
      confirmLabel: 'Record verification',
    })
    if (!ok) return
    setActionId(`verify-${verifying.user.id}`)
    try {
      await api.verifyIdentityOffline(verifying.user.id, {
        method: verifying.method, note, reference: verifying.reference.trim() || undefined,
      })
      toast(`${verifying.user.name} is verified — the reason you gave is on the record`, 'success')
      setVerifying(null)
      await load()
    } catch (e: any) { toast(e.message, 'error') }
    finally { setActionId(null) }
  }

  async function resetPassword(user: UserRow) {
    const ok = await ask({
      title: `Send password reset to ${user.name}?`,
      message: 'This immediately signs the user out everywhere. Their current password is never shown or changed by an administrator.',
      confirmLabel: 'Send reset email', tone: 'danger',
    })
    if (!ok) return
    setActionId(`reset-${user.id}`)
    try {
      const result = await api.initiateUserPasswordReset(user.id)
      toast(result.delivery === 'email_sent' ? 'Password reset email sent and existing sessions ended' : 'Reset created, but email delivery is not configured', result.delivery === 'email_sent' ? 'success' : 'error')
    } catch (e: any) { toast(e.message, 'error') }
    finally { setActionId(null) }
  }

  async function changeAccess(user: UserRow) {
    const suspending = user.account_status !== 'suspended'
    let reason: string | undefined
    if (suspending) {
      reason = window.prompt(`Why are you suspending ${user.name}'s account? This reason is retained in the audit log.`)?.trim()
      if (!reason) return
    }
    const ok = await ask({
      title: suspending ? `Suspend ${user.name}?` : `Restore ${user.name}?`,
      message: suspending ? 'The account will be signed out on every device and cannot use the platform until restored.' : 'The account will be able to sign in again.',
      confirmLabel: suspending ? 'Suspend account' : 'Restore account', tone: suspending ? 'danger' : 'primary',
    })
    if (!ok) return
    setActionId(`access-${user.id}`)
    try {
      await api.setUserAccess(user.id, suspending ? 'suspend' : 'restore', reason)
      toast(suspending ? 'Account suspended and all sessions ended' : 'Account restored', 'success')
      await load()
    } catch (e: any) { toast(e.message, 'error') }
    finally { setActionId(null) }
  }

  function editUser(user: UserRow) {
    setEditing({
      id: user.id, name: user.name || '', role: user.role === 'seller' ? 'seller' : 'buyer',
      phone: user.phone || '', whatsapp_phone: user.whatsapp_phone || '', business_name: user.business_name || '',
      business_verified: !!user.business_verified, phone_visible: !!user.phone_visible, whatsapp_visible: !!user.whatsapp_visible,
    })
  }

  async function saveUser(event: React.FormEvent) {
    event.preventDefault()
    if (!editing || !editing.name.trim()) return
    if ((editing.phone_visible && !editing.phone.trim()) || (editing.whatsapp_visible && !editing.whatsapp_phone.trim())) {
      toast('A contact channel cannot be visible without a number.', 'error')
      return
    }
    setActionId(`edit-${editing.id}`)
    try {
      await api.updateUser(editing.id, {
        name: editing.name.trim(), role: editing.role, phone: editing.phone.trim() || null,
        whatsapp_phone: editing.whatsapp_phone.trim() || null, business_name: editing.business_name.trim() || null,
        business_verified: editing.business_verified, phone_visible: editing.phone_visible,
        whatsapp_visible: editing.whatsapp_visible,
      })
      toast('Account details updated', 'success')
      setEditing(null)
      await load()
    } catch (e: any) { toast(e.message, 'error') }
    finally { setActionId(null) }
  }

  const visible = role === 'all' ? items : items.filter((u) => u.role === role)
  const counts = items.reduce<Record<string, number>>((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <PageHeader
        title="Users & identity"
        description="Find accounts, understand trust at a glance, and review seller identity documents."
        action={<ExportLink dataset="users" />}
      />

      <div className="mb-5 flex justify-end">
        <button type="button" onClick={() => setShowroomOpen((v) => !v)}
          className="rounded-xl bg-brand px-4 py-2.5 text-label font-bold text-brand-on hover:bg-brand-bright">
          {showroomOpen ? 'Close form' : 'Create an account'}
        </button>
      </div>

      {/* Only appears when the invite email failed. The link is a one-use
          credential, so the API returns it in that case alone. */}
      {manualInvite ? (
        <Card className="mb-5 border-danger p-5">
          <h2 className="text-label font-bold text-danger-strong">Send this activation link by hand</h2>
          <p className="mt-1 text-label text-content-secondary">
            The account for {manualInvite.email} exists but no email went out, so this link is the
            only way in. It expires in 48 hours and works once. Send it over WhatsApp or read it out
            — and fix email under Platform settings.
          </p>
          {manualInvite.url ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-surface-alt px-3 py-2 text-caption text-content">
                {manualInvite.url}
              </code>
              <button type="button"
                onClick={() => { navigator.clipboard?.writeText(manualInvite.url as string); toast('Link copied.', 'success') }}
                className="rounded-lg bg-ink-900 px-3 py-2 text-caption font-bold text-white">
                Copy link
              </button>
            </div>
          ) : (
            <p className="mt-3 text-label font-semibold text-content">
              This build of the API did not return the link. Delete the account and recreate it once
              email is working.
            </p>
          )}
          <button type="button" onClick={() => setManualInvite(null)}
            className="mt-3 text-caption font-semibold text-content-muted hover:text-content">
            Dismiss
          </button>
        </Card>
      ) : null}

      {showroomOpen ? (
        <Card className="mb-5 p-5">
          <div className="mb-4"><h2 className="font-extrabold text-content">Create an account</h2><p className="mt-1 text-label text-content-muted">For someone who would rather we set it up — a walk-in, or a showroom being onboarded. They create their own password from a one-use 48-hour email link; no password is ever emailed.</p></div>
          <form onSubmit={createShowroom} className="grid gap-3 sm:grid-cols-2">
            <fieldset className="sm:col-span-2">
              <legend className="text-label font-semibold text-content">Account type</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {ACCOUNT_KINDS.map((kind) => (
                  <label key={kind.value} className={`cursor-pointer rounded-xl border p-3 ${accountType === kind.value ? 'border-brand bg-surface-alt' : 'border-line hover:border-content-muted'}`}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name="account_type" value={kind.value}
                        checked={accountType === kind.value}
                        onChange={() => setAccountType(kind.value)} />
                      <span className="text-label font-bold text-content">{kind.noun}</span>
                    </span>
                    <span className="mt-1 block text-caption text-content-muted">{kind.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {([
              ['business_name', 'Showroom name', 'Kigali Prime Motors'],
              ['name', 'Contact name', 'Jean Habimana'],
              ['email', 'Email address', 'sales@example.rw'],
              ['phone', 'Phone (optional)', '+250 7…'],
            ] as const)
              // A business name only means something for a showroom.
              .filter(([key]) => key !== 'business_name' || accountType === 'showroom')
              .map(([key, label, placeholder]) => (
              <label key={key} className="text-label font-semibold text-content">{label}
                <input required={key !== 'phone'} type={key === 'email' ? 'email' : 'text'} value={showroom[key]}
                  onChange={(e) => setShowroom({ ...showroom, [key]: e.target.value })} placeholder={placeholder}
                  className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none" />
              </label>
            ))}
            <button disabled={actionId === 'new-showroom'} className="rounded-xl bg-ink-900 px-4 py-3 text-label font-bold text-white disabled:opacity-50 sm:col-span-2">
              {actionId === 'new-showroom' ? 'Creating…' : 'Create account and send activation link'}
            </button>
          </form>
        </Card>
      ) : null}

      <div className="mb-5 flex gap-2 border-b border-line-soft" role="tablist" aria-label="User management views">
        {([
          ['directory', 'User directory'], ['verification', 'ID verification queue'],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key}
            onClick={() => { setTab(key); setRole('all') }}
            className={`border-b-2 px-3 py-3 text-label font-bold transition-colors ${
              tab === key ? 'border-brand text-brand' : 'border-transparent text-content-muted hover:text-content'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'directory' ? (
        <Card className="mb-5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search users</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"><Icon name="search" size={16} /></span>
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, or phone"
                className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-label text-content focus:border-content-muted focus:outline-none" />
            </label>
            <label>
              <span className="sr-only">Filter by role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-label font-semibold text-content focus:outline-none sm:w-44">
                <option value="all">All roles ({items.length})</option>
                <option value="buyer">Buyers ({counts.buyer || 0})</option>
                <option value="seller">Sellers ({counts.seller || 0})</option>
                <option value="admin">Admins ({counts.admin || 0})</option>
              </select>
            </label>
          </div>
        </Card>
      ) : (
        <div className="mb-5 rounded-xl border border-warning-border bg-warning-tint px-4 py-3 text-label text-warning-text">
          Approval unlocks publication and public contact eligibility and adds 30 trust-score points. Document links expire after 15 minutes.
        </div>
      )}

      {verifying ? (
        <Card className="mb-5 p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-content">Verify {verifying.user.name} without an upload</h2>
              <p className="mt-1 text-label text-content-muted">
                Use this when you checked the person&rsquo;s identity yourself — at the office, against a
                business document, or on an established relationship. Your name and your reason are stored
                against the decision, because &ldquo;verified by Sawa Cars&rdquo; has to mean something specific.
              </p>
            </div>
            <button type="button" onClick={() => setVerifying(null)} className="rounded-lg border border-line px-3 py-1.5 text-caption font-bold text-content">Cancel</button>
          </div>
          <form onSubmit={submitOfflineVerification} className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="text-label font-semibold text-content">How did you check?</legend>
              {OFFLINE_METHODS.map((m) => (
                <label key={m.value} className={`flex items-start gap-3 rounded-xl border p-3 ${verifying.method === m.value ? 'border-brand bg-surface-alt' : 'border-line-soft'}`}>
                  <input type="radio" name="offline-method" value={m.value} checked={verifying.method === m.value}
                    onChange={() => setVerifying({ ...verifying, method: m.value })} className="mt-1 h-4 w-4 accent-brand" />
                  <span>
                    <span className="block text-label font-bold text-content">{m.label}</span>
                    <span className="text-caption text-content-muted">{m.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="text-label font-semibold text-content">What did you see? <span className="font-normal text-content-muted">(required — this is the record)</span>
              <textarea value={verifying.note} onChange={(e) => setVerifying({ ...verifying, note: e.target.value })}
                rows={3} required minLength={MIN_ATTESTATION}
                placeholder={OFFLINE_METHODS.find((m) => m.value === verifying.method)?.placeholder}
                className="mt-1.5 w-full rounded-xl border border-line bg-surface p-3 font-normal focus:border-content-muted focus:outline-none" />
              <span className="mt-1 block text-caption text-content-muted">
                {verifying.note.trim().length < MIN_ATTESTATION
                  ? `At least ${MIN_ATTESTATION} characters — a sentence, not a tick.`
                  : 'Saved with your name and the time, and shown on this account from now on.'}
              </span>
            </label>
            <label className="text-label font-semibold text-content">Document number <span className="font-normal text-content-muted">(optional)</span>
              <input value={verifying.reference} onChange={(e) => setVerifying({ ...verifying, reference: e.target.value })}
                maxLength={120} placeholder="National ID, RDB registration or TIN"
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none" />
            </label>
            <button disabled={actionId === `verify-${verifying.user.id}` || verifying.note.trim().length < MIN_ATTESTATION}
              className="rounded-xl bg-brand px-4 py-3 text-label font-bold text-brand-on disabled:opacity-50">
              {actionId === `verify-${verifying.user.id}` ? 'Recording…' : 'Record verification'}
            </button>
          </form>
        </Card>
      ) : null}

      {editing ? (
        <Card className="mb-5 p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><h2 className="font-extrabold text-content">Edit account controls</h2><p className="mt-1 text-label text-content-muted">Manage identity, seller verification and consent-based public contact channels.</p></div>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-line px-3 py-1.5 text-caption font-bold text-content">Cancel</button>
          </div>
          <form onSubmit={saveUser} className="grid gap-4 sm:grid-cols-2">
            {([
              ['name', 'Account name', 'text'], ['business_name', 'Business name', 'text'],
              ['phone', 'Phone number', 'tel'], ['whatsapp_phone', 'WhatsApp number', 'tel'],
            ] as const).map(([key, label, type]) => (
              <label key={key} className="text-label font-semibold text-content">{label}
                <input type={type} value={editing[key]} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                  required={key === 'name'} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none" />
              </label>
            ))}
            <label className="text-label font-semibold text-content">Platform role
              <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as 'buyer' | 'seller' })}
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:outline-none">
                <option value="buyer">Buyer</option><option value="seller">Seller</option>
              </select>
            </label>
            <div className="rounded-xl border border-line-soft bg-surface-alt p-3 text-caption text-content-muted">Contact information is revealed only after a buyer acknowledges the direct-deal notice. Visibility also requires the relevant number.</div>
            {([
              ['business_verified', 'Verified business', 'Allow this seller to operate provider inventory.'],
              ['phone_visible', 'Share phone on request', 'Allow acknowledged buyers to request this phone number.'],
              ['whatsapp_visible', 'Share WhatsApp on request', 'Allow acknowledged buyers to request this WhatsApp number.'],
            ] as const).map(([key, label, sub]) => (
              <label key={key} className="flex items-start gap-3 rounded-xl border border-line-soft p-3">
                <input type="checkbox" checked={editing[key]} onChange={(e) => setEditing({ ...editing, [key]: e.target.checked })} className="mt-1 h-4 w-4 accent-brand" />
                <span><span className="block text-label font-bold text-content">{label}</span><span className="text-caption text-content-muted">{sub}</span></span>
              </label>
            ))}
            <button disabled={actionId === `edit-${editing.id}`} className="rounded-xl bg-brand px-4 py-3 text-label font-bold text-brand-on disabled:opacity-50 sm:col-span-2">
              {actionId === `edit-${editing.id}` ? 'Saving…' : 'Save account controls'}
            </button>
            {/* Outside the form's own submit: a cap is set by its own route,
                because it needs an author and a date recorded with it. */}
            {editing.role === 'seller' ? (
              <ListingCap
                userId={editing.id}
                name={editing.name}
                cap={capFor(editing.id)}
                note={capNoteFor(editing.id)}
                occupied={activeFor(editing.id)}
                onSaved={load}
                toast={toast}
              />
            ) : null}
          </form>
        </Card>
      ) : null}

      {error ? <ErrorState error={error} onRetry={load} /> : loading ? <LoadingState /> : visible.length === 0 ? (
        <EmptyState icon="user" title={tab === 'verification' ? 'Queue is empty' : 'No users found'}
          description={tab === 'verification' ? 'No sellers are waiting on an ID check.' : 'Try a different search or role filter.'} />
      ) : tab === 'directory' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-line-soft bg-surface-alt text-caption uppercase tracking-wide text-content-muted">
                <tr><th className="px-5 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Identity</th><th className="px-4 py-3">Trust</th><th className="px-4 py-3">Sales</th><th className="px-4 py-3">Access</th><th className="px-5 py-3">Joined</th></tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {visible.map((u) => <tr key={u.id} id={`row-${u.id}`} className={`hover:bg-surface-alt ${focusProps(u.id).className}`}>
                  <td className="px-5 py-4"><p className="font-bold text-content">{u.business_name || u.name}</p><p className="text-caption text-content-muted">{u.business_name ? `${u.name} · ` : ''}{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>{u.whatsapp_phone ? <p className="text-caption text-content-muted">WhatsApp: {u.whatsapp_phone}</p> : null}{u.must_change_password ? <p className="mt-1 text-micro font-bold text-warning-text">Invitation awaiting activation</p> : null}</td>
                  <td className="px-4 py-4"><div className="space-y-1"><Pill status={u.role} label={u.seller_type === 'showroom' ? 'showroom' : u.role} />{u.business_verified ? <Pill status="approved" label="business verified" /> : null}</div></td>
                  <td className="px-4 py-4">
                    <Pill status={u.id_verified} label={u.id_verified === 'none' || !u.id_verified ? 'not submitted' : u.id_verified} />
                    {u.id_verified === 'approved' && u.id_verification_method ? (
                      <span className="mt-1 block text-caption text-content-muted" title={u.id_verification_note || undefined}>
                        {METHOD_LABELS[u.id_verification_method] || u.id_verification_method}
                        {u.id_verified_by_name ? ` · ${u.id_verified_by_name}` : ''}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 font-bold text-content">{Number(u.trust_score || 0)}</td>
                  <td className="px-4 py-4 text-content-secondary">{Number(u.completed_sales || 0)}</td>
                  <td className="px-4 py-4"><div className="flex min-w-44 flex-col items-start gap-2"><Pill status={u.account_status === 'suspended' ? 'rejected' : 'approved'} label={u.account_status === 'suspended' ? 'suspended' : 'active'} />
                    {u.role !== 'admin' ? (
                      <div className="flex items-center gap-2">
                        {/* One primary action on the row; the rest, and the
                            destructive one last, behind the menu. */}
                        {u.id_verified === 'pending' ? (
                          <button type="button" onClick={() => { setTab('verification'); router.replace(`/users?tab=verification&focus=${u.id}`) }}
                            className="rounded-lg border border-line px-2.5 py-1.5 text-caption font-bold text-content hover:bg-surface-alt">Review ID documents</button>
                        ) : (
                          <button type="button" onClick={() => editUser(u)} disabled={actionId === `edit-${u.id}`}
                            className="rounded-lg border border-line px-2.5 py-1.5 text-caption font-bold text-content hover:bg-surface-alt disabled:opacity-50">{actionId === `edit-${u.id}` ? 'Saving…' : 'Edit'}</button>
                        )}
                        <RowMenu label={`More actions for ${u.business_name || u.name}`} items={[
                          ...(u.id_verified === 'pending' ? [{ label: 'Edit account', onSelect: () => editUser(u) }] : []),
                          { label: actionId === `reset-${u.id}` ? 'Sending…' : 'Send a password reset', onSelect: () => resetPassword(u), disabled: actionId === `reset-${u.id}` },
                          // Verifying in person is for sellers who came to an office without
                          // uploading documents; a buyer never needs it, and someone with
                          // documents waiting is reviewed from the queue instead.
                          ...(u.role === 'seller' && u.id_verified !== 'approved' && u.id_verified !== 'pending'
                            ? [{ label: 'Record an in-person ID check', hint: 'Documents seen at an office', onSelect: () => setVerifying({ user: u, method: OFFLINE_METHODS[0].value, note: '', reference: '' }) }]
                            : []),
                          ...(u.id_verified === 'approved'
                            ? [{ label: actionId === `revoke-${u.id}` ? 'Revoking…' : 'Revoke ID verification', hint: 'Unpublishes their listings', destructive: true, onSelect: () => revokeIdentity(u), disabled: actionId === `revoke-${u.id}` }]
                            : []),
                          u.account_status === 'suspended'
                            ? { label: actionId === `access-${u.id}` ? 'Updating…' : 'Restore access', onSelect: () => changeAccess(u), disabled: actionId === `access-${u.id}` }
                            : { label: actionId === `access-${u.id}` ? 'Updating…' : 'Suspend account', hint: 'Signs them out on their next request', destructive: true, onSelect: () => changeAccess(u), disabled: actionId === `access-${u.id}` },
                        ]} />
                      </div>
                    ) : <span className="text-caption text-content-muted">Protected</span>}</div></td>
                  <td className="px-5 py-4 text-label text-content-muted">{fmtDate(u.created_at)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {items.length >= 100 ? <p className="border-t border-line-soft px-5 py-3 text-caption text-content-muted">Showing the newest 100 matches. Refine the search to find older accounts.</p> : null}
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((u) => (
            <Card key={u.id} id={`row-${u.id}`} className={`p-5 ${focusProps(u.id).className}`}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-tint text-lg font-bold text-brand">{(u.name || 'U')[0].toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2"><span className="font-semibold text-content">{u.name}</span><Pill status="pending" label="Pending verification" /></div>
                  <p className="text-label text-content-muted">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                  <p className="mt-1 text-caption text-content-muted">Submitted {fmtDate(u.id_submitted_at || u.created_at)}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {[['ID front', u.id_front_url], ['ID back', u.id_back_url], ['Selfie', u.selfie_url]].map(([label, url]) => url ?
                      <a key={label} href={url} target="_blank" rel="noreferrer" className="text-caption font-bold text-brand underline hover:text-brand-bright">{label}</a> : null)}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => decide(u.id, 'approved')} disabled={actionId === u.id} className="flex-1 rounded-xl bg-brand py-2.5 text-label font-bold text-brand-on hover:bg-brand-bright disabled:opacity-50">Approve seller</button>
                <button onClick={() => decide(u.id, 'rejected')} disabled={actionId === u.id} className="flex-1 rounded-xl border border-danger-border bg-danger-tint py-2.5 text-label font-bold text-danger-strong hover:opacity-80 disabled:opacity-50">Reject documents</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
