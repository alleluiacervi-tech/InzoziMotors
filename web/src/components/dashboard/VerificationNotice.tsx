import Link from 'next/link'
import { Alert } from '@/components/ui'
import type { IdVerificationStatus } from '@/lib/types'

// Identity verification is what makes every Sawa listing real, and it is the
// one thing the website genuinely cannot do — the ID and selfie capture lives
// in the app. So this explains rather than nags, and it never blocks the
// buying side of the account, which needs no verification at all.

const COPY: Record<
  Exclude<IdVerificationStatus, 'approved'>,
  { tone: 'info' | 'warning'; title: string; body: string }
> = {
  none: {
    tone: 'info',
    title: 'Complete your identity check before publication',
    body:
      'Buying, saving cars and making requests all work without it, and you may submit a car for inspection now. Before a listing or direct contact details become public, send a photo of your national ID and a selfie in the Sawa Cars app. Our team reviews them within 24 hours.',
  },
  pending: {
    tone: 'info',
    title: 'Your identity check is with our team',
    body:
      'Reviews are completed within 24 hours. You may continue tracking an existing submission while we review it; publication and direct contact stay locked until approval.',
  },
  rejected: {
    tone: 'warning',
    title: 'Your identity check needs another attempt',
    body:
      'Usually this means a photo was blurred or the ID was partly out of frame. Open the Sawa Cars app and resubmit — there is no limit on attempts, and nothing else on your account is affected.',
  },
}

export function VerificationNotice({ status }: { status: IdVerificationStatus }) {
  if (status === 'approved') return null
  const copy = COPY[status]

  return (
    <Alert tone={copy.tone} title={copy.title} className="mb-6">
      <p>{copy.body}</p>
      <p className="mt-2">
        <Link href="/download" className="font-bold underline underline-offset-2">
          Get the Sawa Cars app
        </Link>
      </p>
    </Alert>
  )
}

export default VerificationNotice
