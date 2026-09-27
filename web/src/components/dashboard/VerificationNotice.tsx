'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Alert } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import type { IdVerificationStatus } from '@/lib/types'

// Identity verification is what makes every Sawa listing real. The website can
// now do it too (G4 in docs/WEB-PARITY-PLAN.md), so this points at
// /dashboard/verify instead of the app, and stays out of the way on that page
// itself. It never blocks the buying side of the account, which needs no
// verification at all.

const TONE: Record<Exclude<IdVerificationStatus, 'approved'>, 'info' | 'warning'> = {
  none: 'info',
  pending: 'info',
  rejected: 'warning',
}

export function VerificationNotice({ status }: { status: IdVerificationStatus }) {
  const t = useT()
  const pathname = usePathname()
  if (status === 'approved' || pathname === '/dashboard/verify') return null

  return (
    <Alert tone={TONE[status]} title={t(`onboarding.notice.${status}Title`)} className="mb-6">
      <p>{t(`onboarding.notice.${status}Body`)}</p>
      {status !== 'pending' ? (
        <p className="mt-2">
          <Link href="/dashboard/verify" className="font-bold underline underline-offset-2">
            {t('onboarding.notice.cta')}
          </Link>
        </p>
      ) : null}
    </Alert>
  )
}

export default VerificationNotice
