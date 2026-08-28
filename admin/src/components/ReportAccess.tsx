'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Who may read this inspection report.
//
// The report used to be readable by exactly one person forever — whoever
// commissioned the inspection. That made the thing Sawa sells sellable once.
// This panel is the second sale: a buyer looking at the same car next week can
// buy the report that already exists instead of paying for a duplicate
// inspection of a vehicle that has already been inspected.
//
// A sale records its payment in the same request as the access, because selling
// a report and billing for it as two separate acts is how a report gets handed
// over and never billed.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useConfirm, useToast } from '@/components/feedback'
import { fmtMoney, formatRwfInput, parseRwfInput } from '@/components/ui'

type Entitlement = {
  id: string
  source: 'paid_customer' | 'purchased' | 'seller_copy' | 'admin_grant'
  note: string | null
  granted_at: string
  user_id: string
  user_name: string
  user_email: string
  amount_rwf: number | null
  method: string | null
  reference: string | null
  granted_by_name: string | null
}

const SOURCE_LABEL: Record<string, string> = {
  paid_customer: 'Commissioned the inspection',
  purchased: 'Bought a copy',
  seller_copy: "The vehicle's seller",
  admin_grant: 'Granted by the team',
}
// 'paid_customer' is absent on purpose: it is earned by booking a walk-in, not
// handed out from here.
const GRANT_OPTIONS = [
  { value: 'purchased', label: 'Sold a copy', hint: 'Records the payment and the access together.' },
  { value: 'seller_copy', label: "Seller's copy", hint: 'For the seller of the inspected vehicle.' },
  { value: 'admin_grant', label: 'Give it free', hint: 'Needs a written reason — it is the only record of the decision.' },
] as const
const METHODS = ['cash', 'mobile_money', 'bank_transfer'] as const
const MIN_REASON = 10

export function ReportAccess({ inspectionId, complete }: { inspectionId: string; complete: boolean }) {
  const [rows, setRows] = useState<Entitlement[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [personQuery, setPersonQuery] = useState('')
  const [people, setPeople] = useState<any[]>([])
  const [form, setForm] = useState({
    user_id: '', user_label: '', source: 'purchased' as typeof GRANT_OPTIONS[number]['value'],
    amount: '', method: 'cash' as typeof METHODS[number], reference: '', note: '',
  })
  const toast = useToast()
  const ask = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await api.reportEntitlements(inspectionId)) }
    catch { /* the panel is additive; a failure must not break the page */ }
    finally { setLoading(false) }
  }, [inspectionId])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const q = personQuery.trim()
    if (q.length < 2 || form.user_id) { setPeople([]); return }
    const timer = window.setTimeout(() => {
      api.searchUsers(q, 15).then((r) => setPeople(r.filter((u: any) => u.role !== 'admin'))).catch(() => setPeople([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [personQuery, form.user_id])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.user_id) { toast('Choose who this report is for.', 'error'); return }
    const amount = parseRwfInput(form.amount)
    if (form.source === 'purchased' && (!amount || amount <= 0)) {
      toast('Enter the amount collected.', 'error'); return
    }
    if (form.source === 'admin_grant' && form.note.trim().length < MIN_REASON) {
      toast(`Say why it is being given away, in at least ${MIN_REASON} characters.`, 'error'); return
    }
    const ok = await ask({
      title: form.source === 'purchased'
        ? `Sell this report to ${form.user_label}?`
        : `Give ${form.user_label} access to this report?`,
      message: form.source === 'purchased'
        ? 'The payment is recorded at the same time. Correcting it later means voiding the access and re-recording it.'
        : 'They will be able to download the full 150-point report from their account.',
      confirmLabel: form.source === 'purchased' ? 'Record the sale' : 'Grant access',
    })
    if (!ok) return
    setBusy(true)
    try {
      await api.grantReportAccess(inspectionId, {
        user_id: form.user_id,
        source: form.source,
        ...(form.source === 'purchased'
          ? { amount, method: form.method, reference: form.reference.trim() || undefined }
          : {}),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      })
      toast(form.source === 'purchased' ? 'Sale recorded and access granted.' : 'Access granted.', 'success')
      setOpen(false)
      setForm({ user_id: '', user_label: '', source: 'purchased', amount: '', method: 'cash', reference: '', note: '' })
      setPersonQuery('')
      await load()
    } catch (e: any) { toast(e.message, 'error') }
    finally { setBusy(false) }
  }

  async function revoke(row: Entitlement) {
    const reason = window.prompt(`Why is ${row.user_name}'s access being withdrawn?`)
    if (!reason?.trim() || reason.trim().length < 4) return
    setBusy(true)
    try {
      await api.revokeReportAccess(inspectionId, row.id, reason.trim())
      toast('Access withdrawn. The record stays.', 'success')
      await load()
    } catch (e: any) { toast(e.message, 'error') }
    finally { setBusy(false) }
  }

  const sold = rows.filter((r) => r.source === 'purchased')
  const revenue = sold.reduce((sum, r) => sum + Number(r.amount_rwf || 0), 0)

  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Who can read this report</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {complete
              ? 'The same report can go to more than one person. A second buyer looking at this vehicle can buy the report that already exists rather than pay for a duplicate inspection.'
              : 'Access can be given once the inspection is complete and the report has been issued.'}
          </p>
        </div>
        {complete ? (
          <button type="button" onClick={() => setOpen(!open)}
            className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-light">
            {open ? 'Cancel' : 'Give or sell a copy'}
          </button>
        ) : null}
      </div>

      {sold.length ? (
        <p className="mt-3 text-xs font-semibold text-success-text">
          {sold.length} cop{sold.length === 1 ? 'y' : 'ies'} sold · {fmtMoney(revenue, 'RWF')} on work already done
        </p>
      ) : null}

      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-lg border border-line-soft bg-surface-alt p-4">
          <div>
            <label className="text-xs font-semibold text-gray-700">Who is it for?</label>
            <input value={personQuery}
              onChange={(e) => { setPersonQuery(e.target.value); setForm({ ...form, user_id: '', user_label: '' }) }}
              placeholder="Search by name or email"
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" />
            {form.user_id ? <p className="mt-1 text-xs font-semibold text-success-text">{form.user_label} selected</p> : null}
            {people.length && !form.user_id ? (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                {people.map((p) => (
                  <button key={p.id} type="button"
                    onClick={() => { setForm({ ...form, user_id: p.id, user_label: p.name }); setPersonQuery(p.name); setPeople([]) }}
                    className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-gray-50">
                    <span className="font-semibold">{p.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{p.email}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {GRANT_OPTIONS.map((o) => (
              <label key={o.value} className={`cursor-pointer rounded-lg border p-2.5 ${form.source === o.value ? 'border-brand bg-white' : 'border-gray-200'}`}>
                <input type="radio" name="grant-source" className="sr-only" checked={form.source === o.value}
                  onChange={() => setForm({ ...form, source: o.value })} />
                <span className="block text-xs font-bold text-gray-900">{o.label}</span>
                <span className="text-[11px] text-gray-500">{o.hint}</span>
              </label>
            ))}
          </div>

          {form.source === 'purchased' ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="text-xs font-semibold text-gray-700">Amount (RWF)
                <input value={form.amount} inputMode="numeric"
                  onChange={(e) => setForm({ ...form, amount: formatRwfInput(e.target.value) })}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-gray-700">Method
                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as typeof METHODS[number] })}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm font-normal capitalize">
                  {METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-700">Reference
                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="Optional" className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm font-normal" />
              </label>
            </div>
          ) : null}

          {form.source === 'admin_grant' ? (
            <label className="text-xs font-semibold text-gray-700">Why is it being given away? <span className="font-normal text-gray-500">(required)</span>
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2}
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm font-normal" />
            </label>
          ) : null}

          <button disabled={busy || !form.user_id}
            className="rounded-lg bg-brand px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
            {busy ? 'Saving…' : form.source === 'purchased' ? 'Record the sale' : 'Grant access'}
          </button>
        </form>
      ) : null}

      <div className="mt-4 space-y-2">
        {loading ? <p className="text-xs text-gray-400">Loading…</p>
          : !rows.length ? <p className="text-xs text-gray-400">Nobody has access to this report yet.</p>
          : rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{row.user_name}
                  <span className="ml-2 text-xs font-normal text-gray-500">{row.user_email}</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  {SOURCE_LABEL[row.source] || row.source}
                  {row.amount_rwf ? ` · ${fmtMoney(Number(row.amount_rwf), 'RWF')}${row.method ? ` ${row.method.replace('_', ' ')}` : ''}` : ''}
                  {row.granted_by_name ? ` · by ${row.granted_by_name}` : ''}
                </p>
                {row.note ? <p className="mt-0.5 text-[11px] italic text-gray-500">{row.note}</p> : null}
              </div>
              <button type="button" onClick={() => revoke(row)} disabled={busy}
                className="rounded-lg border border-danger-border px-2.5 py-1.5 text-[11px] font-bold text-danger-strong hover:bg-danger-tint disabled:opacity-50">
                Withdraw
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}

export default ReportAccess
