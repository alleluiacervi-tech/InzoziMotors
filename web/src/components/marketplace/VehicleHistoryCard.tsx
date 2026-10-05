import { Card, Icon, type IconName } from '@/components/ui'
import { formatDate, formatKm, formatMoney } from '@/lib/business'
import type { SawaRecord, SawaRecordEvent, VehicleHistory } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'
import type { TFunction } from '@/lib/i18n/dictionary'

// ─────────────────────────────────────────────────────────────────────────────
// The paperwork, reported exactly as it was found.
//
// The API returns 'pass' | 'flag' | 'fail' | 'unknown' for each document check.
// 'unknown' means nobody has verified it — so it renders as "Not verified", in
// muted grey, and never borrows the language or the colour of a pass. Dressing
// an unchecked box up as a tick is the single fastest way to lose a buyer.
// ─────────────────────────────────────────────────────────────────────────────

type Tone = 'pass' | 'flag' | 'fail' | 'unknown'

const TONES: Record<Tone, { icon: IconName; className: string; fallbackKey: string }> = {
  pass: { icon: 'check-circle', className: 'text-success-text', fallbackKey: 'cars.history.verified' },
  flag: { icon: 'alert', className: 'text-warning-text', fallbackKey: 'cars.history.needsAttention' },
  fail: { icon: 'close-circle', className: 'text-danger', fallbackKey: 'cars.history.failedCheck' },
  unknown: { icon: 'minus', className: 'text-content-muted', fallbackKey: 'cars.history.notVerified' },
}

function toneOf(verdict: string | null | undefined): Tone {
  if (verdict === 'pass' || verdict === 'flag' || verdict === 'fail') return verdict
  return 'unknown'
}

interface Row {
  label: string
  tone: Tone
  value: string
}

/** A document check. `whenPassed` lets a row say something more useful than
 *  "Verified" once it has actually passed. */
function documentRow(t: TFunction, label: string, verdict: string | null | undefined, whenPassed?: string): Row {
  const tone = toneOf(verdict)
  return {
    label,
    tone,
    value: tone === 'pass' && whenPassed ? whenPassed : t(TONES[tone].fallbackKey),
  }
}

function eventLabel(t: TFunction, event: SawaRecordEvent): { title: string; detail: string | null } {
  const km = event.km != null ? t('cars.record.kmRead', { km: formatKm(event.km) }) : null
  switch (event.type) {
    case 'submitted':
      return { title: t('cars.record.submitted'), detail: null }
    case 'inspected':
      return { title: t('cars.record.inspected'), detail: km }
    case 'earlier_inspection':
      return { title: t('cars.record.earlierInspection'), detail: km }
    case 'listed':
      return { title: t('cars.record.listed'), detail: null }
    case 'price_changed':
      return {
        title: t('cars.record.priceChanged', { price: formatMoney(event.price) }),
        detail: event.previous_price != null ? t('cars.record.priceWas', { price: formatMoney(event.previous_price) }) : null,
      }
    default:
      return { title: String(event.type), detail: null }
  }
}

/** What Sawa itself witnessed: dated steps and the odometer as our inspector
 *  read it. A drop is shown plainly, with both numbers, as a question to ask. */
function SawaRecordSection({ record, t }: { record: SawaRecord; t: TFunction }) {
  const { odometer, events } = record
  if (!events.length && !odometer.readings.length) return null
  const thisListing = [...odometer.readings].reverse().find((reading) => reading.this_listing)
  const mismatch = thisListing && odometer.declared_km != null
    && Math.abs(odometer.declared_km - thisListing.km) > Math.max(1000, Math.round(thisListing.km * 0.05))

  return (
    <section aria-labelledby="sawa-record" className="border-t border-line-soft p-5 sm:p-6">
      <h3 id="sawa-record" className="text-body font-extrabold text-content">{t('cars.record.title')}</h3>
      <p className="mt-1 text-caption leading-relaxed text-content-secondary">{t('cars.record.intro')}</p>

      {odometer.consistent === false && odometer.drops.length ? (
        <div role="status" className="mt-4 rounded-xl border border-warning/25 bg-warning-tint p-4">
          <p className="flex items-center gap-2 text-caption font-extrabold text-warning-text">
            <Icon name="alert" size={16} />
            {t('cars.record.dropTitle')}
          </p>
          {odometer.drops.map((drop) => (
            <p key={`${drop.earlier_on}-${drop.later_on}`} className="mt-2 text-caption leading-relaxed text-content">
              {t('cars.record.drop', {
                earlier: formatKm(drop.earlier_km),
                earlierDate: formatDate(drop.earlier_on),
                later: formatKm(drop.later_km),
                laterDate: formatDate(drop.later_on),
              })}
            </p>
          ))}
          <p className="mt-2 text-caption leading-relaxed text-content-secondary">{t('cars.record.dropAsk')}</p>
        </div>
      ) : odometer.consistent === true ? (
        <p className="mt-4 flex items-center gap-2 text-caption font-semibold text-success-text">
          <Icon name="check-circle" size={15} />
          {t('cars.record.consistent', { count: odometer.readings.length })}
        </p>
      ) : odometer.readings.length === 1 ? (
        <p className="mt-4 flex items-center gap-2 text-caption font-semibold text-content-secondary">
          <Icon name="gauge" size={15} />
          {t('cars.record.oneReading', {
            km: formatKm(odometer.readings[0].km),
            date: formatDate(odometer.readings[0].on),
          })}
        </p>
      ) : null}

      {mismatch && thisListing ? (
        <p className="mt-2 flex items-center gap-2 text-caption font-semibold text-warning-text">
          <Icon name="alert" size={15} />
          {t('cars.record.declared', { declared: formatKm(odometer.declared_km), read: formatKm(thisListing.km) })}
        </p>
      ) : null}

      {events.length ? (
        <ol className="mt-5 space-y-0">
          {events.map((event, index) => {
            const { title, detail } = eventLabel(t, event)
            const last = index === events.length - 1
            return (
              <li key={`${event.type}-${event.on}-${index}`} className="relative flex gap-4 pb-4 last:pb-0">
                {!last ? <span aria-hidden="true" className="absolute left-[5px] top-4 h-full w-px bg-line" /> : null}
                <span
                  aria-hidden="true"
                  className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 ${
                    event.type === 'earlier_inspection' ? 'border-content-muted bg-surface' : 'border-content bg-content'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-caption font-bold text-content">{title}</p>
                  <p className="text-micro text-content-muted">
                    <time dateTime={event.on}>{formatDate(event.on)}</time>
                    {detail ? <span> · {detail}</span> : null}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      ) : null}
    </section>
  )
}

export async function VehicleHistoryCard({ history }: { history: VehicleHistory | null }) {
  if (!history) return null
  const t = await getServerT()

  const rows: Row[] = [
    documentRow(t, t('cars.history.rraDuty'), history.rra_duty_paid, t('cars.history.dutyPaid')),
    documentRow(t, t('cars.history.registration'), history.registration),
    documentRow(t, t('cars.history.serviceHistory'), history.service_history),
    documentRow(t, t('cars.history.insurance'), history.insurance_valid, t('cars.history.validAtInspection')),
    {
      label: t('cars.history.odometer'),
      tone: history.mileage_verified ? 'pass' : 'unknown',
      value: history.mileage_verified
        ? t('cars.history.odoChecked', { km: formatKm(history.mileage) })
        : t('cars.history.odoNotVerified', { km: formatKm(history.mileage) }),
    },
    {
      label: t('cars.history.vin'),
      tone: history.vin_verified ? 'pass' : 'unknown',
      value: (history.vin_masked || history.vin)
        ? history.vin_verified
          ? t('cars.history.vinMatches', { vin: history.vin_masked || 'Verified' })
          : t('cars.history.vinNotVerified', { vin: history.vin_masked || 'Verified' })
        : t('cars.history.notRecorded'),
    },
    {
      label: t('cars.history.importOrigin'),
      tone: 'unknown',
      value:
        history.import_origin && history.import_origin !== 'Unknown'
          ? history.import_origin
          : t('cars.history.notRecorded'),
    },
    {
      label: t('cars.history.accidentHistory'),
      tone: 'unknown',
      value: history.accident_history || t('cars.history.noData'),
    },
  ]

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line-soft p-5 sm:p-6">
        <p className="text-caption font-bold text-content-muted">{t('cars.history.eyebrow')}</p>
        <h2 className="mt-2 text-title font-extrabold text-content">{t('cars.history.title')}</h2>
        <p className="mt-2 text-caption leading-relaxed text-content-secondary">
          {t('cars.history.intro')}
        </p>
      </div>

      <dl className="divide-y divide-line-soft">
        {rows.map((row) => {
          const tone = TONES[row.tone]
          return (
            <div
              key={row.label}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-3.5 sm:px-6"
            >
              <dt className="text-caption font-bold text-content-muted">
                {row.label}
              </dt>
              <dd className={`flex min-w-0 items-center gap-2 text-caption font-semibold ${tone.className}`}>
                <Icon name={tone.icon} size={15} />
                <span className="break-words">{row.value}</span>
              </dd>
            </div>
          )
        })}
      </dl>

      {history.sawa_record ? <SawaRecordSection record={history.sawa_record} t={t} /> : null}

      <div className="border-t border-line-soft bg-surface-alt/40 p-4 sm:p-5">
        <p className="text-caption leading-relaxed text-content-muted">
          <strong className="font-semibold text-content-secondary">{t('cars.history.coverageTitle')}:</strong>{' '}
          {t('cars.history.coverage')}
        </p>
      </div>
    </Card>
  )
}

export default VehicleHistoryCard
