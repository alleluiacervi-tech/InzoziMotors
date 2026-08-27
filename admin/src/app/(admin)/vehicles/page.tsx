'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle history.
//
// The compounding asset, made visible. Any classifieds site can list a car;
// what accumulates value is a condition record spanning years and owners — and
// a full-stack retailer cannot build one, because they only ever see the cars
// they are selling.
//
// The mileage column is the point. A reading that goes down is odometer
// tampering, and it is invisible to anyone who sees the car once.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Card, ErrorState, PageHeader } from '@/components/ui'
import { useToast } from '@/components/feedback'

type History = Awaited<ReturnType<typeof api.vehicleHistory>>

const KIND_NOTE: Record<string, string> = {
  iso: 'Standard 17-character VIN',
  chassis: 'Chassis number — normal for a Japanese import',
  short: 'Too short to identify a vehicle',
  none: 'Nothing recorded',
}

export default function VehicleHistoryPage() {
  const toast = useToast()
  const [vin, setVin] = useState('')
  const [history, setHistory] = useState<History | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  async function search(event: React.FormEvent) {
    event.preventDefault()
    if (!vin.trim()) return
    setLoading(true); setError(null); setHistory(null)
    try {
      setHistory(await api.vehicleHistory(vin.trim()))
    } catch (e: any) {
      // A refused identifier is guidance, not a failure — say what is wrong
      // with it rather than showing an error panel.
      if (e?.code === 'VIN_NOT_USABLE') toast(e.message, 'error')
      else setError(e)
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Vehicle history"
        description="Every inspection Sawa has recorded against one vehicle. Spacing, case and hyphens do not matter — the same car matches itself however its VIN was written."
      />

      <Card className="mb-6 p-5">
        <form onSubmit={search} className="flex flex-wrap gap-3">
          <label className="min-w-[16rem] flex-1 text-label font-semibold text-content">
            VIN or chassis number
            <input
              value={vin} onChange={(e) => setVin(e.target.value)}
              placeholder="JTDBZ293401234567  ·  NZE121-1234567"
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal uppercase focus:border-content-muted focus:outline-none"
            />
          </label>
          <button disabled={loading} className="self-end rounded-xl bg-brand px-5 py-3 text-label font-bold text-white hover:bg-brand-bright disabled:opacity-50">
            {loading ? 'Searching…' : 'Look up'}
          </button>
        </form>
      </Card>

      {error ? <ErrorState error={error} onRetry={() => setError(null)} /> : null}

      {history ? (
        <>
          <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <code className="rounded-lg bg-surface-alt px-3 py-1.5 text-body font-bold tracking-wider text-content">
              {history.vin.key}
            </code>
            <span className="text-label text-content-muted">{KIND_NOTE[history.vin.kind]}</span>
            <span className="ml-auto text-label font-semibold text-content">
              {history.summary.inspections} inspection{history.summary.inspections === 1 ? '' : 's'} on record
            </span>
          </div>

          {history.summary.odometer_inconsistent ? (
            <Card className="mb-5 border-danger p-4">
              <p className="text-label font-bold text-danger-strong">The odometer reading has gone down</p>
              <p className="mt-1 text-label text-content-secondary">
                A later inspection recorded fewer kilometres than an earlier one. That has innocent
                explanations — a replaced instrument cluster, a mistyped digit — and it is also what
                tampering looks like. Worth asking about before this car is published.
              </p>
            </Card>
          ) : null}

          {history.summary.inspections === 0 ? (
            <Card className="p-8 text-center">
              <p className="font-bold text-content">Sawa has never inspected this vehicle</p>
              <p className="mt-1 text-label text-content-muted">
                Nothing on record for that identifier. Every inspection from now on will build one.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-label">
                <thead>
                  <tr className="border-b border-line text-caption uppercase tracking-widest text-content-muted">
                    <th className="py-2 pr-4 text-left font-bold">Date</th>
                    <th className="py-2 pr-4 text-left font-bold">Kind</th>
                    <th className="py-2 pr-4 text-right font-bold">Mileage</th>
                    <th className="py-2 pr-4 text-right font-bold">Score</th>
                    <th className="py-2 pr-4 text-left font-bold">Centre</th>
                    <th className="py-2 pr-4 text-left font-bold">Inspector</th>
                    <th className="py-2 text-right font-bold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.inspections.map((entry, index) => {
                    const previous = history.inspections[index - 1]
                    const wentDown = previous
                      && Number.isInteger(entry.mileage) && Number.isInteger(previous.mileage)
                      && entry.mileage < previous.mileage
                    return (
                      <tr key={entry.inspection_id} className="border-b border-line-soft">
                        <td className="py-2.5 pr-4 tabular-nums">
                          {entry.on ? new Date(entry.on).toLocaleDateString('en-RW', { dateStyle: 'medium' }) : '—'}
                        </td>
                        <td className="py-2.5 pr-4 text-content-muted">
                          {entry.kind === 'standalone' ? 'Walk-in' : 'Listing'}
                        </td>
                        <td className={`py-2.5 pr-4 text-right tabular-nums ${wentDown ? 'font-bold text-danger-strong' : ''}`}>
                          {Number.isInteger(entry.mileage) ? `${entry.mileage.toLocaleString('en-RW')} km` : '—'}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          {entry.score === null ? '—' : (
                            <span className={entry.passed ? 'font-bold text-success-text' : 'font-bold text-danger-strong'}>
                              {entry.score}/150
                            </span>
                          )}
                          {entry.critical_failures > 0 ? (
                            <span className="ml-1 text-caption text-danger-strong">
                              · {entry.critical_failures} critical
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-4 text-content-muted">{entry.center || '—'}</td>
                        <td className="py-2.5 pr-4 text-content-muted">{entry.inspector_name || '—'}</td>
                        <td className="py-2.5 text-right tabular-nums text-content-muted">
                          {entry.elapsed_minutes === null ? '—' : `${entry.elapsed_minutes} min`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {history.listings.length ? (
            <Card className="mt-5 p-5">
              <h2 className="mb-3 text-caption font-bold uppercase tracking-widest text-content-muted">
                Listed on Sawa
              </h2>
              <ul className="grid gap-2">
                {history.listings.map((car: any) => (
                  <li key={car.id} className="flex flex-wrap items-baseline gap-x-3 text-label">
                    <Link href={`/listings/${car.id}/edit`} className="font-semibold text-brand hover:underline">
                      {car.title}
                    </Link>
                    <span className="text-content-muted">{car.status}</span>
                    {car.listed_at ? (
                      <span className="text-caption text-content-muted">
                        listed {new Date(car.listed_at).toLocaleDateString('en-RW', { dateStyle: 'medium' })}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
