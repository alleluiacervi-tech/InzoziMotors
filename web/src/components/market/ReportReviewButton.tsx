'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { reportReviewAction } from '@/app/sellers/[id]/actions'
import { Icon } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

// G10 in docs/WEB-PARITY-PLAN.md — the app's flag on each review: the same
// four reasons and the same promise that the author isn't told.
const REASONS = ['scam', 'harassment', 'spam', 'other'] as const

export function ReportReviewButton({ reviewId, author }: { reviewId: string; author: string }) {
  const t = useT()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<'sent' | 'failed' | 'signIn' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (outcome === 'sent') {
    return <p className="mt-3 text-micro font-bold text-success-text">{t('market.report.sent')}</p>
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('market.report.button', { name: author })}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-content-muted hover:bg-surface-alt hover:text-content"
      >
        <Icon name="alert" size={16} />
      </button>
    )
  }

  async function submit() {
    if (!reason || busy) return
    setBusy(true)
    const result = await reportReviewAction(reviewId, reason)
    setBusy(false)
    if (result.ok) setOutcome('sent')
    else if (result.signIn) setOutcome('signIn')
    else {
      setError(result.error ?? null)
      setOutcome('failed')
    }
  }

  return (
    <div className="mt-3 w-full rounded-xl border border-line-soft bg-surface-alt p-4">
      <p className="text-caption font-bold text-content">{t('market.report.title')}</p>
      <p className="mt-1 text-micro text-content-muted">{t('market.report.body')}</p>
      {outcome === 'signIn' ? (
        <p className="mt-3 text-caption">
          <Link href={`/signin?next=${encodeURIComponent(pathname)}`} className="font-bold text-content underline underline-offset-2">
            {t('market.report.signIn')}
          </Link>
        </p>
      ) : (
        <>
          <div className="mt-3 space-y-1.5">
            {REASONS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-caption text-content">
                <input
                  type="radio"
                  name={`reason-${reviewId}`}
                  checked={reason === key}
                  onChange={() => setReason(key)}
                  className="h-4 w-4 accent-brand"
                />
                {t(`market.report.reasons.${key}`)}
              </label>
            ))}
          </div>
          {outcome === 'failed' ? (
            <p role="alert" className="mt-2 text-micro text-danger">{error || t('market.report.failed')}</p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!reason || busy}
              className="h-9 rounded-lg bg-brand px-3 text-caption font-bold text-brand-on disabled:opacity-50"
            >
              {t('market.report.submit')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-lg px-3 text-caption font-bold text-content-secondary hover:bg-surface"
            >
              {t('market.report.cancel')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ReportReviewButton
