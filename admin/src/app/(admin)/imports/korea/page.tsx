'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Korean catalogue — the operator's window onto the Encar mirror
// (docs/ENCAR-IMPORT-PLAN.md).
//
//   · two switches: whether the sync runs, and whether the catalogue is public
//   · what the sync has done, how big the mirror is, how much of the provider's
//     monthly allowance is spent
//   · the rules for which cars are kept
//   · the exporter's costs, which turn the landed-cost estimate on
//   · a way to ask the provider to re-collect one car before quoting it
//
// Nothing here can spend money by itself: the provider plan is bought outside
// this console, and the key lives on the server.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api, type EncarStatus } from '@/lib/api'
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'
import { fmtDateTime } from '@/lib/format'

const mb = (bytes: number) => `${(bytes / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })} MB`
const gb = (bytes: number) => `${(bytes / 1_000_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })} GB`
const input = 'h-10 w-full rounded-xl border border-line bg-surface px-3 text-body tabular-nums focus:border-content-muted focus:outline-none'
const heading = 'mb-3 text-caption font-bold uppercase tracking-widest text-content-muted'

function Switch({ on, disabled, onClick, label }: { on: boolean; disabled?: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} disabled={disabled} onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'bg-success text-white' : 'bg-gray-200 text-gray-700'}`}>
      {on ? 'On' : 'Off'}
    </button>
  )
}

export default function KoreanCatalogPage() {
  const toast = useToast()
  const ask = useConfirm()
  const [status, setStatus] = useState<EncarStatus | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [rules, setRules] = useState<any>(null)
  const [costs, setCosts] = useState<any>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [refreshId, setRefreshId] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      const s = await api.encarStatus()
      setStatus(s)
      setRules(structuredClone(s.rules))
      setCosts(structuredClone(s.costs))
    } catch (e) { setError(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function save(key: string, value: unknown, done: string) {
    setBusy(key); setProblems([])
    try {
      await api.updateSetting(key, value)
      toast(done, 'success')
      await load()
    } catch (e: any) {
      setProblems(Array.isArray(e?.problems) ? e.problems : [e?.message || 'Could not save.'])
      toast(e?.message || 'Could not save.', 'error')
    } finally { setBusy('') }
  }

  async function toggleSync() {
    if (!status) return
    const next = !status.flags.sync_enabled
    if (next && !(await ask({
      title: 'Start syncing from the provider?',
      message: 'The worker will start downloading the Korean catalogue and keep it current. This uses the provider plan\'s allowance.',
      confirmLabel: 'Start syncing',
    }))) return
    await save('encar_flags', { ...status.flags, sync_enabled: next }, next ? 'Sync switched on' : 'Sync switched off')
  }

  async function togglePublic() {
    if (!status) return
    const next = !status.flags.catalog_public
    if (next && !(await ask({
      title: 'Open the Korean catalogue to the public?',
      message: status.listings === 0
        ? 'There are no cars in the mirror yet, so customers would see an empty catalogue. Wait for the first sync to finish.'
        : `${status.listings.toLocaleString('en-US')} cars become visible on the website and in the app, and the old model catalogue is replaced by them.`,
      confirmLabel: 'Open to the public',
    }))) return
    await save('encar_flags', { ...status.flags, catalog_public: next }, next ? 'The Korean catalogue is public' : 'The Korean catalogue is hidden')
  }

  async function refresh(e: React.FormEvent) {
    e.preventDefault()
    const id = refreshId.trim()
    if (!id) return
    setBusy('refresh')
    try {
      const r = await api.encarRefresh(id)
      toast(r.note, 'success')
      setRefreshId('')
      await load()
    } catch (err: any) { toast(err?.message || 'Could not refresh.', 'error') } finally { setBusy('') }
  }

  if (loading) return <LoadingState />
  if (error || !status) return <ErrorState error={error} onRetry={load} />

  const s = status.state
  const pct = (n: number, d: number) => (d > 0 ? Math.min(100, Math.round((n / d) * 100)) : 0)
  const trafficPct = pct(status.usage.month.bytes, status.usage.monthly_bytes_allowance)
  const baselineDone = Boolean(s.baseline_completed_at)

  return (
    <div className="max-w-5xl">
      <Link href="/imports" className="mb-4 inline-block text-label font-bold text-content underline decoration-line underline-offset-4 hover:decoration-content">← Import pipeline</Link>
      <PageHeader title="Korean catalogue" description="Every used car for sale in South Korea, mirrored from the Encar data provider so customers can search them on the website and in the app." />

      {status.stale ? (
        <Card className="mb-5 border-danger p-4">
          <p className="text-label font-bold text-danger-strong">The sync is behind</p>
          <p className="mt-1 text-label text-content">It has not succeeded for over an hour{s.last_error ? `: ${s.last_error}` : '.'}</p>
        </Card>
      ) : null}
      {problems.length ? (
        <Card className="mb-5 border-danger p-4">
          <p className="text-label font-bold text-danger-strong">Not saved</p>
          <ul className="mt-1.5 grid gap-1 text-label text-content">{problems.map((p) => <li key={p}>· {p}</li>)}</ul>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className={heading}>Switches</h2>
          <div className="grid gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label font-semibold text-content">Sync from the provider</p>
                <p className="text-caption text-content-muted">
                  {status.configured.api_key ? 'The worker downloads and updates the catalogue.' : 'The provider key is not set on the server (ENCAR_API_KEY), so this cannot be turned on yet.'}
                </p>
              </div>
              <Switch on={status.flags.sync_enabled} label="Sync from the provider" disabled={busy === 'encar_flags' || !status.configured.api_key} onClick={toggleSync} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label font-semibold text-content">Catalogue is public</p>
                <p className="text-caption text-content-muted">When on, customers see these cars instead of the old model catalogue.</p>
              </div>
              <Switch on={status.flags.catalog_public} label="Catalogue is public" disabled={busy === 'encar_flags'} onClick={togglePublic} />
            </div>
            {!status.configured.photo_prefix ? (
              <p className="rounded-xl bg-warning-tint px-3 py-2 text-caption text-warning-text">
                ENCAR_PHOTO_PREFIX is not set. Photos are stored whole, which uses more space; set it once the photo host is confirmed.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className={heading}>Mirror</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-label">
            <div><dt className="text-content-muted">Cars held</dt><dd className="font-extrabold text-content tabular-nums">{status.listings.toLocaleString('en-US')} <span className="font-normal text-content-muted">of {status.row_ceiling.toLocaleString('en-US')} allowed</span></dd></div>
            <div><dt className="text-content-muted">Database size</dt><dd className="font-extrabold text-content tabular-nums">{mb(status.size_bytes)}</dd></div>
            <div><dt className="text-content-muted">First load</dt><dd className="font-semibold text-content">{baselineDone ? `Done ${fmtDateTime(s.baseline_completed_at!)}` : s.baseline_started_at ? `Running, page ${s.baseline_page}` : 'Not started'}</dd></div>
            <div><dt className="text-content-muted">Last success</dt><dd className="font-semibold text-content">{s.last_success_at ? fmtDateTime(s.last_success_at) : '—'}</dd></div>
            <div><dt className="text-content-muted">Weekly cross-check</dt><dd className="font-semibold text-content">{s.last_repair_at ? fmtDateTime(s.last_repair_at) : '—'}</dd></div>
            <div><dt className="text-content-muted">Report cache</dt><dd className="font-semibold text-content tabular-nums">{status.cache_rows.toLocaleString('en-US')} cars</dd></div>
          </dl>
          {s.last_error ? <p className="mt-3 text-caption text-danger-strong">Last error{s.last_error_at ? ` (${fmtDateTime(s.last_error_at)})` : ''}: {s.last_error}</p> : null}
        </Card>

        <Card className="p-5">
          <h2 className={heading}>Provider allowance</h2>
          <p className="text-label text-content">
            <span className="font-extrabold tabular-nums">{gb(status.usage.month.bytes)}</span> of {gb(status.usage.monthly_bytes_allowance)} this month · {status.usage.month.requests.toLocaleString('en-US')} requests
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200" role="img" aria-label={`${trafficPct}% of the monthly traffic used`}>
            <div className={`h-full ${trafficPct >= 70 ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${trafficPct}%` }} />
          </div>
          <p className="mt-3 text-caption text-content-muted">Refreshes today: {status.refresh.used_today} of {status.refresh.daily_limit}</p>
          <form onSubmit={refresh} className="mt-3 flex gap-2">
            <input value={refreshId} onChange={(e) => setRefreshId(e.target.value)} placeholder="Korean listing id" aria-label="Korean listing id" className={input} />
            <button disabled={busy === 'refresh' || !refreshId.trim()} className="rounded-xl bg-ink-900 px-4 text-label font-bold text-white disabled:opacity-40">Refresh</button>
          </form>
          <p className="mt-2 text-caption text-content-muted">Asks the provider to re-collect a car before you quote it. They do it within about two hours.</p>
        </Card>

        <Card className="p-5">
          <h2 className={heading}>Recent runs</h2>
          {status.recent_runs.length ? (
            <ul className="divide-y divide-line-soft text-caption">
              {status.recent_runs.map((r) => (
                <li key={r.id} className="py-2">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold capitalize text-content">{r.kind}</span>
                    <span className={r.ok === false ? 'font-bold text-danger-strong' : r.ok ? 'text-success-text' : 'text-content-muted'}>{r.ok === false ? 'Failed' : r.ok ? 'OK' : 'Running'}</span>
                  </div>
                  <p className="text-content-muted">{fmtDateTime(r.started_at)} · +{r.added} · ~{r.updated} · −{r.removed} · skipped {r.skipped}</p>
                  {r.error ? <p className="text-danger-strong">{r.error}</p> : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-label text-content-muted">Nothing has run yet.</p>}
        </Card>

        {rules ? (
          <Card className="p-5">
            <h2 className={heading}>Which cars are kept</h2>
            <div className="grid gap-3 text-label">
              {([['exclude_duplicates', 'Skip cross-posted duplicates'], ['require_photos', 'Only cars with photos']] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-content">
                  <input type="checkbox" checked={Boolean(rules[k])} onChange={(e) => setRules({ ...rules, [k]: e.target.checked })} />{label}
                </label>
              ))}
              {([['min_price_man', 'Minimum price (만원, 10,000 KRW)', 100], ['max_age_years', 'Oldest model, in years (empty = any)', null], ['max_mileage_km', 'Highest mileage, km (empty = any)', null], ['row_ceiling', 'Row ceiling (safety stop)', 250000]] as const).map(([k, label]) => (
                <label key={k} className="text-caption font-bold text-content">{label}
                  <input type="number" min="0" className={`${input} mt-1 font-normal`} value={rules[k] ?? ''}
                    onChange={(e) => setRules({ ...rules, [k]: e.target.value === '' ? null : Number(e.target.value) })} />
                </label>
              ))}
              <label className="text-caption font-bold text-content">Fuels left out (comma separated)
                <input className={`${input} mt-1 font-normal`} value={(rules.exclude_fuel_tokens || []).join(', ')}
                  onChange={(e) => setRules({ ...rules, exclude_fuel_tokens: e.target.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) })} />
              </label>
              <p className="text-caption text-content-muted">Applied to the next sync pass; cars that no longer qualify are removed as they change.</p>
              <button disabled={busy === 'encar_ingest_rules'} onClick={() => save('encar_ingest_rules', rules, 'Rules saved')}
                className="rounded-xl bg-brand px-4 py-2.5 text-label font-bold text-brand-on hover:bg-brand-bright disabled:opacity-50">Save rules</button>
            </div>
          </Card>
        ) : null}

        {costs ? (
          <Card className="p-5">
            <h2 className={heading}>Exporter costs</h2>
            <p className="mb-3 text-caption text-content-muted">
              From the Korean exporter&apos;s real cost sheet, in US dollars per car. Until this is switched on, customers see no landed-cost estimate, only the Korean price.
            </p>
            <div className="grid gap-3 text-label">
              {([['export_fee_usd', 'Export and deregistration fee'], ['inland_transport_usd', 'Inland transport to the port']] as const).map(([k, label]) => (
                <label key={k} className="text-caption font-bold text-content">{label} (US$)
                  <input type="number" min="0" className={`${input} mt-1 font-normal`} value={costs[k] ?? 0} onChange={(e) => setCosts({ ...costs, [k]: Number(e.target.value) })} />
                </label>
              ))}
              {(['default', 'sedan', 'suv', 'van'] as const).map((k) => (
                <label key={k} className="text-caption font-bold text-content">Sea freight, {k} (US$){k !== 'default' ? ' — empty uses the default' : ''}
                  <input type="number" min="0" className={`${input} mt-1 font-normal`} value={costs.freight_usd?.[k] ?? ''}
                    onChange={(e) => setCosts({ ...costs, freight_usd: { ...costs.freight_usd, [k]: e.target.value === '' ? (k === 'default' ? 0 : null) : Number(e.target.value) } })} />
                </label>
              ))}
              <label className="text-caption font-bold text-content">Insurance (% of the car&apos;s price)
                <input type="number" min="0" max="10" step="0.1" className={`${input} mt-1 font-normal`} value={costs.insurance_pct ?? 0} onChange={(e) => setCosts({ ...costs, insurance_pct: Number(e.target.value) })} />
              </label>
              <label className="text-caption font-bold text-content">Costs reviewed on
                <input type="date" className={`${input} mt-1 font-normal`} value={costs.reviewed_on || ''} onChange={(e) => setCosts({ ...costs, reviewed_on: e.target.value || null })} />
              </label>
              <label className="flex items-center gap-2 text-content">
                <input type="checkbox" checked={Boolean(costs.configured)} onChange={(e) => setCosts({ ...costs, configured: e.target.checked })} />
                Show the landed-cost estimate to customers
              </label>
              <button disabled={busy === 'encar_cost_inputs'} onClick={() => save('encar_cost_inputs', costs, 'Exporter costs saved')}
                className="rounded-xl bg-brand px-4 py-2.5 text-label font-bold text-brand-on hover:bg-brand-bright disabled:opacity-50">Save costs</button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
