import Image from 'next/image'
import Link from 'next/link'
import { CancelRequestButton } from '@/components/dashboard/CancelRequestButton'
import { Alert, Card, Icon, StatusPill } from '@/components/ui'
import {
  HANDOVER_STATUS_LABEL,
  RETURN_WINDOW_DAYS,
  daysLeftInReturnWindow,
  formatDate,
  formatRWF,
  formatUSD,
} from '@/lib/business'
import type { Handover } from '@/lib/types'

// One purchase request, with the thing that happens next spelled out. The
// status vocabulary is the backend's own — pending, confirmed, complete,
// cancelled — so what a buyer reads here matches what the admin sees.

/** What Sawa does next, per status. No payment step exists anywhere. */
function nextStep(handover: Handover): { title: string; body: string } {
  switch (handover.status) {
    case 'pending':
      return {
        title: 'We are confirming your request',
        body:
          'The car is reserved for you and has been taken off the marketplace. Our team contacts you and the seller on WhatsApp — usually within 24 hours — to agree a handover time at a center.',
      }
    case 'confirmed':
      return {
        title: 'Your handover is booked',
        body:
          handover.center && handover.handover_date
            ? `Meet us at ${handover.center} on ${handover.handover_date}${handover.handover_time ? ` at ${handover.handover_time}` : ''}. Bring your national ID and payment — payment happens in person at the center, never in the app. We check the car against its inspection report with both of you, then start the RRA transfer.`
            : 'Our team is finalising the exact time and center with you and the seller. Bring your national ID and payment on the day — payment happens in person, never in the app.',
      }
    case 'complete':
      return {
        title: 'The car is yours',
        body:
          'The handover is confirmed by our team and the RRA transfer is under way — new registration documents usually complete within 2–3 working days. Third-party insurance is required before you drive.',
      }
    case 'cancelled':
      return {
        title: 'This request was cancelled',
        body:
          'The reservation ended and the car went back on the marketplace. Nothing was paid, and there is no charge for cancelling.',
      }
    default:
      return { title: 'Request received', body: 'Our team will be in touch.' }
  }
}

function DetailRow({ icon, label, value }: { icon: 'location' | 'calendar' | 'clock' | 'phone'; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon name={icon} size={15} className="mt-0.5 text-content-muted" />
      <div className="min-w-0">
        <dt className="text-micro font-bold uppercase tracking-wide text-content-muted">{label}</dt>
        <dd className="truncate text-caption font-semibold text-content">{value}</dd>
      </div>
    </div>
  )
}

export function RequestCard({ handover }: { handover: Handover }) {
  const image = handover.car_images?.[0]
  const step = nextStep(handover)
  const price = handover.agreed_price ?? handover.price ?? null
  const canCancel = handover.status === 'pending' || handover.status === 'confirmed'
  const daysLeft =
    handover.status === 'complete' ? daysLeftInReturnWindow(handover.confirmed_at) : 0

  return (
    <Card className="overflow-hidden">
      <div className="sm:flex">
        <div className="relative aspect-[4/3] bg-surface-alt sm:aspect-auto sm:w-56 sm:shrink-0">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 224px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-content-muted">
              <Icon name="car" size={32} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-title-sm font-extrabold text-content">
                <Link href={`/cars/${handover.car_id}`} className="hover:text-brand">
                  {handover.car_title ?? 'Your request'}
                </Link>
              </h3>
              <p className="mt-1 text-caption text-content-muted">
                Reference {handover.booking_id} · requested {formatDate(handover.booked_at)}
              </p>
            </div>
            <StatusPill
              status={handover.status}
              label={HANDOVER_STATUS_LABEL[handover.status] ?? handover.status}
            />
          </div>

          {price != null ? (
            <p className="mt-3">
              {/* Price is one of the few places brand red is allowed. */}
              <span className="text-[21px] font-extrabold tracking-[-0.02em] text-brand">
                {formatUSD(price)}
              </span>
              <span className="ml-2 text-caption text-content-muted">{formatRWF(price)}</span>
            </p>
          ) : null}

          {handover.center || handover.handover_date || handover.contact_phone ? (
            <dl className="mt-4 grid gap-3 border-t border-line-soft pt-4 sm:grid-cols-3">
              {handover.center ? (
                <DetailRow icon="location" label="Center" value={handover.center} />
              ) : null}
              {handover.handover_date ? (
                <DetailRow
                  icon="calendar"
                  label="Date"
                  value={`${handover.handover_date}${handover.handover_time ? ` · ${handover.handover_time}` : ''}`}
                />
              ) : null}
              {handover.contact_phone ? (
                <DetailRow icon="phone" label="Your number" value={handover.contact_phone} />
              ) : null}
            </dl>
          ) : null}

          <div className="mt-4 rounded-xl bg-surface-alt p-4">
            <p className="text-caption font-extrabold text-content">{step.title}</p>
            <p className="mt-1 text-caption leading-relaxed text-content-secondary">{step.body}</p>
          </div>

          {handover.status === 'complete' ? (
            daysLeft > 0 ? (
              <Alert
                tone="success"
                title={`${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left in your ${RETURN_WINDOW_DAYS}-day guarantee`}
                className="mt-4"
              >
                <p>
                  Drive it and live with it. If the car does not match its published inspection
                  report, return it to any Sawa center for a full refund. Change-of-mind returns
                  are accepted with a reconditioning fee, and a per-km charge applies beyond 300 km.
                </p>
                <p className="mt-2">
                  <Link
                    href="/dashboard/disputes"
                    className="font-bold underline underline-offset-2"
                  >
                    Raise it with our team
                  </Link>
                </p>
              </Alert>
            ) : (
              <p className="mt-4 text-caption leading-relaxed text-content-muted">
                The {RETURN_WINDOW_DAYS}-day return window has closed and the sale is final.
                Warranty questions still go through our support team.
              </p>
            )
          ) : null}

          {canCancel ? (
            <div className="mt-4">
              <CancelRequestButton
                id={handover.id}
                carTitle={handover.car_title ?? 'car'}
              />
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

export default RequestCard
