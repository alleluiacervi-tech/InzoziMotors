'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { useConfirm, useToast } from '@/components/feedback'

// Every move an import order can make from where it is, and a way to stop it.
//
// The pipeline page used to offer one "Advance" button along a fixed path and
// no way to cancel at all, so an enquiry nobody would ever quote, or a buyer
// who walked away before paying, stayed in the pipeline for good. The moves
// come from the server (`allowed_transitions`, the same table PATCH
// /imports/:id/status enforces), so this can never offer one it will refuse.

const label = (status: string) => status.replaceAll('_', ' ')

export function ImportStatusControls({ orderId, status, allowed = [], onChanged }: {
  orderId: string
  status: string
  allowed?: string[]
  onChanged: () => void | Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const ask = useConfirm()
  const toast = useToast()
  const forward = allowed.filter((s) => s !== 'cancelled')
  const cancellable = allowed.includes('cancelled')

  async function move(next: string, summary?: string) {
    setBusy(true)
    try {
      await api.updateImportStatus(orderId, next, summary)
      toast(`Order moved to ${label(next)}`, 'success')
      await onChanged()
    } catch (e: any) { toast(e.message, 'error') } finally { setBusy(false) }
  }

  async function cancel() {
    const ok = await ask({
      title: 'Cancel this import order?',
      message: 'It leaves the pipeline and the buyer is told. Any verified payment stays on record — refunds are arranged outside the platform.',
      confirmLabel: 'Cancel order',
      tone: 'danger',
    })
    if (!ok) return
    const reason = window.prompt('Why is the order being cancelled? (the buyer sees this)')
    if (!reason?.trim()) return
    await move('cancelled', `Order cancelled: ${reason.trim()}`)
  }

  if (!forward.length && !cancellable) return null
  return (
    <div className="flex flex-wrap gap-2">
      {forward.map((next, index) => (
        <button key={next} type="button" disabled={busy} onClick={() => move(next)}
          className={`rounded-xl px-4 py-2 text-label font-bold disabled:opacity-50 ${index === 0
            ? 'bg-ink-900 text-white'
            : 'border border-line text-content hover:bg-surface-alt'}`}>
          {index === 0 ? `Advance to ${label(next)}` : `Skip to ${label(next)}`}
        </button>
      ))}
      {cancellable ? (
        <button type="button" disabled={busy} onClick={cancel}
          className="rounded-xl border border-danger-border px-4 py-2 text-label font-bold text-danger-strong hover:bg-danger-tint disabled:opacity-50">
          Cancel order
        </button>
      ) : null}
    </div>
  )
}

export default ImportStatusControls
