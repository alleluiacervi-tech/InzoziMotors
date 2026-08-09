'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui'

export default function UsersPage() {
  const [items, setItems]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]             = useState<unknown>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.idVerificationQueue()
      setItems(data)
    } catch (e: any) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // The queue returns document URLs already signed with a short-lived token
  // scoped to one file, so nothing here appends a credential. Previously this
  // pasted the admin's own 30-day session JWT into every <a href>, putting it
  // into server access logs and browser history. Links expire in 15 minutes;
  // reloading the queue mints fresh ones.

  async function decide(userId: string, decision: 'approved' | 'rejected') {
    if (!window.confirm(`${decision === 'approved' ? 'Approve' : 'Reject'} this ID verification?`)) return
    setActionId(userId)
    try {
      await api.decideVerification(userId, decision)
      load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">ID Verification Queue</h1>
      <p className="text-sm text-gray-500 mb-6">
        Review seller identity documents. Approving grants 30 trust-score points and unlocks listing submission.
      </p>

      {error ? (
        <ErrorState error={error} onRetry={() => load()} />
      ) : loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState icon="user" title="Queue is empty" description="No sellers are waiting on an ID check." />
      ) : (
        <div className="space-y-4">
          {items.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-brand-tint flex items-center justify-center text-brand font-bold text-lg flex-shrink-0">
                  {(u.name || 'U')[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">{u.name}</span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      pending verification
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  {u.phone && <p className="text-sm text-gray-500">{u.phone}</p>}
                  <p className="text-xs text-gray-400 mt-1">Submitted: {new Date(u.id_submitted_at || u.created_at).toLocaleDateString()}</p>

                  {/* Document links */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {u.id_front_url && (
                      <a
                        href={u.id_front_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand underline hover:text-brand-light"
                      >
                        ID Front
                      </a>
                    )}
                    {u.id_back_url && (
                      <a
                        href={u.id_back_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand underline hover:text-brand-light"
                      >
                        ID Back
                      </a>
                    )}
                    {u.selfie_url && (
                      <a
                        href={u.selfie_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand underline hover:text-brand-light"
                      >
                        Selfie
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => decide(u.id, 'approved')}
                  disabled={actionId === u.id}
                  className="flex-1 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-light transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide(u.id, 'rejected')}
                  disabled={actionId === u.id}
                  className="flex-1 py-2.5 bg-red-50 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
