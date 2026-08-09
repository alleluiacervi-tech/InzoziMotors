import type { Metadata } from 'next'
import { Container, Icon } from '@/components/ui'
import { CONTACT } from '@/lib/site'

// The browser lands here when Pesapal's hosted checkout finishes — this URL
// is the PESAPAL_CALLBACK_URL the backend registers with every order. The
// page deliberately claims nothing about the outcome: payment truth lives
// server-side (the app verifies against the gateway and shows the real
// status), so this is a hand-back, not a receipt.

export const metadata: Metadata = {
  title: 'Payment complete — return to the app',
  description:
    'Your rental payment has been submitted. Return to the Sawa Cars app to see your booking status.',
  robots: { index: false },
}

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ OrderMerchantReference?: string }>
}) {
  const params = await searchParams
  // Echo only our own reference format — this is a public URL and the query
  // string is attacker-controlled.
  const ref = /^SP-[A-F0-9]{12}$/.test(params.OrderMerchantReference ?? '')
    ? params.OrderMerchantReference
    : null

  return (
    <Container className="py-20">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-tint text-success-text">
          <Icon name="check-circle" size={30} />
        </div>
        <h1 className="text-headline font-extrabold text-content">
          Thanks — you can go back to the app
        </h1>
        <p className="mt-4 text-title-sm leading-relaxed text-content-secondary">
          Your payment has been submitted. Open the Sawa Cars app again and your
          booking will show its confirmed status within a few seconds — we verify
          every payment directly with the payment provider before confirming.
        </p>
        {ref && (
          <p className="mt-4 text-body text-content-muted">
            Payment reference: <span className="font-semibold text-content">{ref}</span>
          </p>
        )}
        <div className="mx-auto mt-8 max-w-md rounded-2xl bg-surface-alt p-5 text-left">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-content-secondary">
              <Icon name="shield-check" size={20} />
            </span>
            <p className="text-body leading-relaxed text-content-secondary">
              The refundable deposit is not part of this payment — it is handled at
              the Sawa center when you collect the car. Bring your driving licence
              and national ID.
            </p>
          </div>
        </div>
        <p className="mt-8 text-body text-content-muted">
          Didn&apos;t mean to pay, or something looks wrong?{' '}
          <a
            className="font-semibold text-content underline underline-offset-2"
            href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Message the team on WhatsApp
          </a>{' '}
          — nothing is final until the booking is confirmed in the app.
        </p>
      </div>
    </Container>
  )
}
