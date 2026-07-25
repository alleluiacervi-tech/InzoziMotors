import Link from 'next/link'
import { Alert } from '@/components/ui'
import type { IdVerificationStatus } from '@/lib/types'

// Identity verification is what makes every Inzozi listing real, and it is the
// one thing the website genuinely cannot do — the ID and selfie capture lives
// in the app. So this explains rather than nags, and it never blocks the
// buying side of the account, which needs no verification at all.

const COPY: Record<
  Exclude<IdVerificationStatus, 'approved'>,
  { tone: 'info' | 'warning'; title: string; body: string }
> = {
  none: {
    tone: 'info',
    title: 'Selling starts with a one-time identity check',
    body:
      'Buying, saving cars and making requests all work without it. To submit a car for inspection we first confirm who you are — a photo of your national ID and a selfie in the Inzozi app. Our team reviews it within 24 hours.',
  },
  pending: {
    tone: 'info',
    title: 'Your identity check is with our team',
    body:
      'Reviews are completed within 24 hours. You will get a notification here the moment it is done, and your seller tools unlock automatically.',
  },
  rejected: {
    tone: 'warning',
    title: 'Your identity check needs another attempt',
    body:
      'Usually this means a photo was blurred or the ID was partly out of frame. Open the Inzozi app and resubmit — there is no limit on attempts, and nothing else on your account is affected.',
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
          Get the Inzozi app
        </Link>
      </p>
    </Alert>
  )
}

export default VerificationNotice
