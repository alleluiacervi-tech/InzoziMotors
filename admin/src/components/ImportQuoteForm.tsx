'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { useConfirm, useToast } from './feedback'
import { MoneyInput, amountInWords } from './MoneyInput'
import { fmtMoney } from './ui'

// ─────────────────────────────────────────────────────────────────────────────
// The itemized landed-price quotation for an import enquiry.
//
// It used to be three unlabeled number boxes inside each card of the import
// list, whose only label was the placeholder that vanished on the first digit.
// It lives on the order's own page now, each amount has a visible label and is
// read back in words, and the total is confirmed before the buyer can see it.
// ─────────────────────────────────────────────────────────────────────────────

const LINES = [
  { key: 'vehicle', label: 'Vehicle and supplier', item: 'Vehicle and supplier preparation' },
  { key: 'freight', label: 'Freight and insurance', item: 'Freight and insurance' },
  { key: 'landed', label: 'Import, customs and service', item: 'Import, customs and service costs' },
] as const

type Draft = { vehicle: string; freight: string; landed: string; expires: string; delivery: string }

const field = 'h-11 w-full rounded-xl border border-line bg-surface px-3 text-body text-content focus:border-content-muted focus:outline-none'

export function ImportQuoteForm({ orderId, orderRef, onIssued }: { orderId: string; orderRef: string; onIssued: () => void }) {
  const [draft, setDraft] = useState<Draft>({ vehicle: '', freight: '', landed: '', expires: '', delivery: '' })
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const confirm = useConfirm()
  const total = LINES.reduce((sum, line) => sum + Number(draft[line.key] || 0), 0)

  async function issue(e: React.FormEvent) {
    e.preventDefault()
    if (!Number.isSafeInteger(total) || total < 100000) {
      toast('Enter the complete landed price in RWF, at least RWF 100,000.', 'error')
      return
    }
    const ok = await confirm({
      title: `Send a quote of ${fmtMoney(total, 'RWF')}?`,
      message: `${orderRef}: the buyer sees this total (${amountInWords(total)}) split into two 50% payments. A new quote replaces it later; this one cannot be edited.`,
      confirmLabel: 'Send the quote',
    })
    if (!ok) return
    const line_items = LINES
      .map((line) => ({ label: line.item, amount_rwf: Number(draft[line.key] || 0) }))
      .filter((row) => row.amount_rwf > 0)
    setBusy(true)
    try {
      await api.quoteImport(orderId, {
        quoted_total_rwf: total,
        line_items,
        quote_expires_at: draft.expires || undefined,
        delivery_estimate: draft.delivery.trim() || undefined,
      })
      toast('Quotation sent with two 50% payments', 'success')
      onIssued()
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={issue} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {LINES.map((line) => (
          <div key={line.key}>
            <label htmlFor={`quote-${line.key}`} className="mb-1.5 block text-label font-semibold text-content">{line.label}</label>
            <MoneyInput
              id={`quote-${line.key}`}
              value={draft[line.key]}
              onChange={(digits) => setDraft({ ...draft, [line.key]: digits })}
              className={field}
            />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="quote-expires" className="mb-1.5 block text-label font-semibold text-content">Quote valid until <span className="font-normal text-content-muted">(optional)</span></label>
          <input id="quote-expires" type="date" value={draft.expires} onChange={(e) => setDraft({ ...draft, expires: e.target.value })} className={field} />
        </div>
        <div>
          <label htmlFor="quote-delivery" className="mb-1.5 block text-label font-semibold text-content">Delivery estimate <span className="font-normal text-content-muted">(optional)</span></label>
          <input id="quote-delivery" value={draft.delivery} onChange={(e) => setDraft({ ...draft, delivery: e.target.value })} placeholder="8–12 weeks" className={field} />
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-line-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-label text-content-secondary">
          Total <span className="tnum font-extrabold text-content">{fmtMoney(total, 'RWF')}</span>
          {total > 0 ? <span className="text-content-muted"> · {amountInWords(total)} · two payments of {fmtMoney(Math.round(total / 2), 'RWF')}</span> : null}
        </p>
        <button type="submit" disabled={busy || total <= 0} className="h-11 rounded-xl bg-brand px-5 text-label font-bold text-brand-on disabled:opacity-40">
          {busy ? 'Sending…' : 'Send the quote'}
        </button>
      </div>
    </form>
  )
}
