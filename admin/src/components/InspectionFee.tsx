'use client'

// ─────────────────────────────────────────────────────────────────────────────
// What the customer paid for this walk-in.
//
// Money is taken at the counter — cash, mobile money or a bank transfer — and
// only recorded here. Nothing on this screen moves a franc.
//
// The report is deliberately NOT gated on this being filled in: a customer who
// has already paid must never be left standing at the desk because a receipt
// has not been typed. So an unrecorded fee is a prominent banner, not a lock.
//
// A correction is a void plus a fresh record, never an edit. A receipt that can
// be quietly rewritten is not a record, and the reason it was wrong is the part
// worth keeping.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, fmtMoney, parseRwfInput, formatRwfInput } from '@/components/ui'
import { useToast, useConfirm } from '@/components/feedback'

const METHODS = [
  ['cash', 'Cash'],
  ['mobile_money', 'Mobile money'],
  ['bank_transfer', 'Bank transfer'],
] as const

export function InspectionFee({ inspectionId, fee, onChange }: {
  inspectionId: string
  fee: any | null
  onChange: () => void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<(typeof METHODS)[number][0]>('cash')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  // Prefill from the rate card so the common case is "confirm and record",
  // not "remember the number from memory" — still a plain text field, so a
  // one-off different amount is one edit away.
  useEffect(() => {
    if (fee) return
    api.rateCard().then((rates) => {
      setAmount((current) => current || formatRwfInput(String(rates.inspection_fee_rwf)))
    }).catch(() => {})
  }, [fee])

  async function record(event: React.FormEvent) {
    event.preventDefault()
    const rwf = parseRwfInput(amount)
    if (!rwf) { toast('Enter the amount collected, in Rwandan francs.', 'error'); return }
    setBusy(true)
    try {
      await api.recordInspectionFee(inspectionId, { amount: rwf, method, reference: reference.trim() || undefined })
      toast('Fee recorded.', 'success')
      setAmount(''); setReference('')
      onChange()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not record the fee.', 'error')
    } finally { setBusy(false) }
  }

  // The reason is typed inline rather than through window.prompt: this
  // dashboard replaced the native dialogs deliberately, and a reason that goes
  // permanently onto the record deserves a field you can see and correct.
  async function voidFee(event: React.FormEvent) {
    event.preventDefault()
    const why = voidReason.trim()
    if (why.length < 4) { toast('Say why in a few words — it stays on the record.', 'error'); return }
    const ok = await confirm({
      title: 'Void this fee?',
      message: 'The entry stays on the record with your reason, and you can then enter the correct amount. Nothing is deleted.',
      confirmLabel: 'Void it',
      cancelLabel: 'Keep it',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    try {
      await api.voidInspectionFee(inspectionId, why)
      toast('Fee voided. Record the correct amount now.', 'success')
      setVoiding(false); setVoidReason('')
      onChange()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not void the fee.', 'error')
    } finally { setBusy(false) }
  }

  if (fee) {
    return (
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-caption font-bold uppercase tracking-widest text-content-muted">Inspection fee</h2>
            <p className="mt-1 text-section font-extrabold text-content">{fmtMoney(Number(fee.amount), 'RWF')}</p>
            <p className="mt-0.5 text-label text-content-muted">
              {String(fee.method || '').replace('_', ' ')}
              {fee.reference ? ` · ${fee.reference}` : ''}
              {fee.collected_at ? ` · ${new Date(fee.collected_at).toLocaleDateString('en-RW', { dateStyle: 'medium' })}` : ''}
            </p>
          </div>
          <button type="button" onClick={() => setVoiding((open) => !open)} disabled={busy}
            className="rounded-lg border border-line px-3 py-1.5 text-caption font-bold text-content hover:bg-surface-alt disabled:opacity-50">
            {voiding ? 'Cancel' : 'Void and re-record'}
          </button>
        </div>
        {voiding ? (
          <form onSubmit={voidFee} className="mt-3 flex flex-wrap gap-2 border-t border-line-soft pt-3">
            <label className="min-w-[16rem] flex-1 text-label font-semibold text-content">
              Why is this being voided?
              <input autoFocus required value={voidReason} onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Entered 30,000 instead of 25,000"
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none" />
            </label>
            <button disabled={busy} className="self-end rounded-xl bg-ink-900 px-4 py-3 text-label font-bold text-white disabled:opacity-50">
              {busy ? 'Voiding…' : 'Void this fee'}
            </button>
          </form>
        ) : null}
      </Card>
    )
  }

  return (
    <Card className="mb-5 border-warning p-4">
      <h2 className="text-caption font-bold uppercase tracking-widest text-warning-text">No fee recorded</h2>
      <p className="mt-1 text-label text-content-secondary">
        The report can still be issued and collected — this is bookkeeping, not a gate.
        Record what was taken at the counter.
      </p>
      <form onSubmit={record} className="mt-3 grid gap-3 sm:grid-cols-4">
        <label className="text-label font-semibold text-content">Amount (RWF)
          <input required inputMode="numeric" value={amount} placeholder="30,000"
            onChange={(e) => setAmount(formatRwfInput(e.target.value))}
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal tabular-nums focus:border-content-muted focus:outline-none" />
        </label>
        <label className="text-label font-semibold text-content">Method
          <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none">
            {METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-label font-semibold text-content">Reference (optional)
          <input value={reference} placeholder="MOMO-88213"
            onChange={(e) => setReference(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal focus:border-content-muted focus:outline-none" />
        </label>
        <button disabled={busy} className="self-end rounded-xl bg-ink-900 px-4 py-3 text-label font-bold text-white disabled:opacity-50">
          {busy ? 'Recording…' : 'Record fee'}
        </button>
      </form>
    </Card>
  )
}
