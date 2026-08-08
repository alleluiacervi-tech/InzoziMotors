import type { Metadata } from 'next'
import { PageHeader, PanelHeading } from '@/components/dashboard/PageHeader'
import { RedeemForm } from '@/components/dashboard/RedeemForm'
import { ReferralCode } from '@/components/dashboard/ReferralCode'
import { describeError } from '@/components/dashboard/data'
import { Alert, Button, Card, Icon } from '@/components/ui'
import { referrals } from '@/lib/api'
import { getToken } from '@/lib/session'
import { SITE } from '@/lib/site'
import type { Referral } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Referrals',
  robots: { index: false, follow: false },
}

// ─────────────────────────────────────────────────────────────────────────────
// Referrals.
//
// What the backend actually does: redeeming a code discounts the redeemer's
// commission on their next completed sale (handovers.js consumes the unused
// redemption at completion). So the copy here credits the person who redeems —
// not an invented reward for the sharer — and the discount rate is never
// quoted, because it is set by an environment variable, not by this page.
// ─────────────────────────────────────────────────────────────────────────────

export default async function ReferralsPage() {
  const token = await getToken()
  if (!token) return null

  let referral: Referral | null = null
  let error: string | null = null
  try {
    referral = await referrals.mine(token)
  } catch (err) {
    error = describeError(err, 'We could not load your referral code.')
  }

  const shareText = referral
    ? `I sell and buy cars on Sawa — every car passes a 150-point inspection before it is listed. Use my code ${referral.code} when you sell yours and you get a discount on the seller commission. ${SITE.url}`
    : ''
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  return (
    <>
      <PageHeader
        title="Referrals"
        description="Share Sawa with someone selling a car. When they redeem your code, they get a discount on the commission for their first completed sale."
      />

      {error ? (
        <Alert tone="warning" title="We could not load your referral code" className="mb-6">
          {error}
        </Alert>
      ) : null}

      {referral ? (
        <>
          <section aria-labelledby="your-code">
            <PanelHeading id="your-code" title="Your code" />
            <Card className="p-5 sm:p-6">
              <ReferralCode code={referral.code} />

              <p className="mt-4 max-w-prose text-caption leading-relaxed text-content-secondary">
                Your code is issued by Sawa and never changes. It works for anyone with an
                account — the discount is applied automatically when their sale completes at a
                center.
              </p>

              <div className="mt-5">
                <Button
                  href={whatsappHref}
                  variant="outline"
                  leadingIcon={<Icon name="whatsapp" size={18} />}
                  target="_blank"
                >
                  Share on WhatsApp
                </Button>
              </div>
            </Card>
          </section>

          <section className="mt-8" aria-labelledby="code-usage">
            <PanelHeading id="code-usage" title="How your code is doing" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-5">
                <p className="text-caption font-bold uppercase tracking-wide text-content-muted">
                  People who redeemed it
                </p>
                <p className="mt-2 text-stat font-extrabold leading-none tracking-[-0.02em] text-content">
                  {referral.redemptions}
                </p>
                <p className="mt-2 text-caption leading-relaxed text-content-muted">
                  Accounts that have applied your code to their profile.
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-caption font-bold uppercase tracking-wide text-content-muted">
                  Times used
                </p>
                <p className="mt-2 text-stat font-extrabold leading-none tracking-[-0.02em] text-content">
                  {referral.uses}
                </p>
                <p className="mt-2 text-caption leading-relaxed text-content-muted">
                  Counted by our system each time the code is successfully redeemed.
                </p>
              </Card>
            </div>
          </section>
        </>
      ) : null}

      <section className="mt-8" aria-labelledby="redeem">
        <PanelHeading id="redeem" title="Redeem someone else’s code" />
        <Card className="p-5 sm:p-6">
          <p className="mb-5 max-w-prose text-caption leading-relaxed text-content-secondary">
            If someone gave you their code, apply it here. The discount comes off the commission on
            your next completed sale — nothing is charged now, and buyers never pay a commission at
            all.
          </p>
          <RedeemForm />
        </Card>
      </section>
    </>
  )
}
