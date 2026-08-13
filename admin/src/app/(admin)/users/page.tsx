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
  role: string
  id_verified: 'pending' | 'approved' | 'rejected' | string
  trust_score?: number
  completed_sales?: number
  created_at: string
  id_submitted_at?: string
  id_front_url?: string
  id_back_url?: string
  selfie_url?: string
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
        ? 'The seller is verified, gains 30 trust-score points, and can submit cars for inspection.'
        : 'The seller is notified and must re-submit their documents before they can list a car.',
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
          Approval unlocks listing submission and adds 30 trust-score points. Document links expire after 15 minutes.
        </div>
      )}

      {error ? <ErrorState error={error} onRetry={load} /> : loading ? <LoadingState /> : visible.length === 0 ? (
        <EmptyState icon="user" title={tab === 'verification' ? 'Queue is empty' : 'No users found'}
          description={tab === 'verification' ? 'No sellers are waiting on an ID check.' : 'Try a different search or role filter.'} />
      ) : tab === 'directory' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-line-soft bg-surface-alt text-caption uppercase tracking-wide text-content-muted">
                <tr><th className="px-5 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Identity</th><th className="px-4 py-3">Trust</th><th className="px-4 py-3">Sales</th><th className="px-5 py-3">Joined</th></tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {visible.map((u) => <tr key={u.id} className="hover:bg-surface-alt">
                  <td className="px-5 py-4"><p className="font-bold text-content">{u.name}</p><p className="text-caption text-content-muted">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p></td>
                  <td className="px-4 py-4"><Pill status={u.role} label={u.role} /></td>
                  <td className="px-4 py-4"><Pill status={u.id_verified} label={u.id_verified || 'not submitted'} /></td>
                  <td className="px-4 py-4 font-bold text-content">{Number(u.trust_score || 0)}</td>
                  <td className="px-4 py-4 text-content-secondary">{Number(u.completed_sales || 0)}</td>
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
