'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, Pill } from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'

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
  business_name?: string | null
  business_verified?: boolean
  must_change_password?: boolean
  account_status?: 'active' | 'suspended'
  suspended_at?: string | null
  suspension_reason?: string | null
}

export default function UsersPage() {
  const [tab, setTab] = useState<'directory' | 'verification'>('directory')
  const [items, setItems] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [actionId, setActionId] = useState<string | null>(null)
  const [showroomOpen, setShowroomOpen] = useState(false)
  const [showroom, setShowroom] = useState({ name: '', business_name: '', email: '', phone: '' })
  const [editing, setEditing] = useState<null | {
    id: string; name: string; role: 'buyer' | 'seller'; phone: string; whatsapp_phone: string;
    business_name: string; business_verified: boolean; phone_visible: boolean; whatsapp_visible: boolean
  }>(null)
  const ask = useConfirm()
  const toast = useToast()

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
      const created = await api.createShowroom(showroom)
      toast(created.invitation_sent
        ? 'Verified showroom created and activation email sent'
        : 'Showroom created, but email delivery is not configured', created.invitation_sent ? 'success' : 'error')
      setShowroom({ name: '', business_name: '', email: '', phone: '' })
      setShowroomOpen(false)
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
      />

      <div className="mb-5 flex justify-end">
        <button type="button" onClick={() => setShowroomOpen((v) => !v)}
          className="rounded-xl bg-brand px-4 py-2.5 text-label font-bold text-white hover:bg-brand-bright">
          {showroomOpen ? 'Close form' : 'Create showroom account'}
        </button>
      </div>

      {showroomOpen ? (
        <Card className="mb-5 p-5">
          <div className="mb-4"><h2 className="font-extrabold text-content">Invite a verified showroom</h2><p className="mt-1 text-label text-content-muted">The account is verified by Sawa. The recipient creates their own password from a one-use 48-hour email link.</p></div>
          <form onSubmit={createShowroom} className="grid gap-3 sm:grid-cols-2">
            {([
              ['business_name', 'Showroom name', 'Kigali Prime Motors'],
              ['name', 'Account contact', 'Jean Habimana'],
              ['email', 'Business email', 'sales@example.rw'],
              ['phone', 'Phone (optional)', '+250 7…'],
            ] as const).map(([key, label, placeholder]) => (
              <label key={key} className="text-label font-semibold text-content">{label}
                <input required={key !== 'phone'} type={key === 'email' ? 'email' : 'text'} value={showroom[key]}
                  onChange={(e) => setShowroom({ ...showroom, [key]: e.target.value })} placeholder={placeholder}
                  className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none" />
              </label>
            ))}
            <button disabled={actionId === 'new-showroom'} className="rounded-xl bg-ink-900 px-4 py-3 text-label font-bold text-white disabled:opacity-50 sm:col-span-2">
              {actionId === 'new-showroom' ? 'Creating…' : 'Create verified account and send activation'}
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
            <button disabled={actionId === `edit-${editing.id}`} className="rounded-xl bg-brand px-4 py-3 text-label font-bold text-white disabled:opacity-50 sm:col-span-2">
              {actionId === `edit-${editing.id}` ? 'Saving…' : 'Save account controls'}
            </button>
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
                {visible.map((u) => <tr key={u.id} className="hover:bg-surface-alt">
                  <td className="px-5 py-4"><p className="font-bold text-content">{u.business_name || u.name}</p><p className="text-caption text-content-muted">{u.business_name ? `${u.name} · ` : ''}{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>{u.whatsapp_phone ? <p className="text-caption text-content-muted">WhatsApp: {u.whatsapp_phone}</p> : null}{u.must_change_password ? <p className="mt-1 text-micro font-bold text-warning-text">Invitation awaiting activation</p> : null}</td>
                  <td className="px-4 py-4"><div className="space-y-1"><Pill status={u.role} label={u.seller_type === 'showroom' ? 'showroom' : u.role} />{u.business_verified ? <Pill status="approved" label="business verified" /> : null}</div></td>
                  <td className="px-4 py-4"><Pill status={u.id_verified} label={u.id_verified || 'not submitted'} /></td>
                  <td className="px-4 py-4 font-bold text-content">{Number(u.trust_score || 0)}</td>
                  <td className="px-4 py-4 text-content-secondary">{Number(u.completed_sales || 0)}</td>
                  <td className="px-4 py-4"><div className="flex min-w-44 flex-col items-start gap-2"><Pill status={u.account_status === 'suspended' ? 'rejected' : 'approved'} label={u.account_status === 'suspended' ? 'suspended' : 'active'} />
                    {u.role !== 'admin' ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => editUser(u)} disabled={actionId === `edit-${u.id}`} className="rounded-lg border border-line px-2.5 py-1.5 text-caption font-bold text-content hover:bg-surface-alt disabled:opacity-50">{actionId === `edit-${u.id}` ? 'Saving…' : 'Edit'}</button><button type="button" onClick={() => resetPassword(u)} disabled={actionId === `reset-${u.id}`} className="rounded-lg border border-line px-2.5 py-1.5 text-caption font-bold text-content hover:bg-surface-alt disabled:opacity-50">{actionId === `reset-${u.id}` ? 'Sending…' : 'Reset password'}</button><button type="button" onClick={() => changeAccess(u)} disabled={actionId === `access-${u.id}`} className={`rounded-lg px-2.5 py-1.5 text-caption font-bold disabled:opacity-50 ${u.account_status === 'suspended' ? 'bg-brand text-white hover:bg-brand-bright' : 'border border-danger-border bg-danger-tint text-danger-strong hover:opacity-80'}`}>{actionId === `access-${u.id}` ? 'Updating…' : u.account_status === 'suspended' ? 'Restore' : 'Suspend'}</button></div> : <span className="text-caption text-content-muted">Protected</span>}</div></td>
                  <td className="px-5 py-4 text-label text-content-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {items.length >= 100 ? <p className="border-t border-line-soft px-5 py-3 text-caption text-content-muted">Showing the newest 100 matches. Refine the search to find older accounts.</p> : null}
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((u) => (
            <Card key={u.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-tint text-lg font-bold text-brand">{(u.name || 'U')[0].toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2"><span className="font-semibold text-content">{u.name}</span><Pill status="pending" label="Pending verification" /></div>
                  <p className="text-label text-content-muted">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                  <p className="mt-1 text-caption text-content-muted">Submitted {new Date(u.id_submitted_at || u.created_at).toLocaleDateString()}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {[['ID front', u.id_front_url], ['ID back', u.id_back_url], ['Selfie', u.selfie_url]].map(([label, url]) => url ?
                      <a key={label} href={url} target="_blank" rel="noreferrer" className="text-caption font-bold text-brand underline hover:text-brand-bright">{label}</a> : null)}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => decide(u.id, 'approved')} disabled={actionId === u.id} className="flex-1 rounded-xl bg-brand py-2.5 text-label font-bold text-white hover:bg-brand-bright disabled:opacity-50">Approve seller</button>
                <button onClick={() => decide(u.id, 'rejected')} disabled={actionId === u.id} className="flex-1 rounded-xl border border-danger-border bg-danger-tint py-2.5 text-label font-bold text-danger-strong hover:opacity-80 disabled:opacity-50">Reject documents</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
