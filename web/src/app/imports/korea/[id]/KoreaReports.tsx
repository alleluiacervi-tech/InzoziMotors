'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/context'
import type { KoreaInspection, KoreaRecord, KoreaReportPart, KoreaReports } from '@/lib/api'

const won = (n: number) => `₩${Math.round(n).toLocaleString('en-US')}`

/** "bodyPanelStatus" → "Body panel status". The provider's own labels are all we have for its free-form parts. */
const humanise = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

/** A scrubbed provider object as label/value lines, a few levels deep. */
function lines(value: unknown, prefix = '', depth = 0): [string, string][] {
  if (value === null || value === undefined) return []
  if (typeof value !== 'object') return [[prefix, String(value)]]
  if (depth > 3) return []
  const entries = Array.isArray(value) ? value.map((v, i) => [String(i + 1), v] as const) : Object.entries(value as Record<string, unknown>)
  return entries.flatMap(([k, v]) => {
    const label = Array.isArray(value) ? prefix : prefix ? `${prefix} · ${humanise(k)}` : humanise(k)
    return lines(v, label, depth + 1)
  })
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-soft py-2 text-caption last:border-0">
      <dt className="text-content-secondary">{label}</dt>
      <dd className="text-right font-semibold text-content">{value}</dd>
    </div>
  )
}

function Inspection({ data }: { data: KoreaInspection }) {
  const t = useT()
  const yn = (v: boolean) => (v ? t('imports.korea.yes') : t('imports.korea.no'))
  const more = [
    ...lines(data.detail),
    ...lines(data.exterior, 'Exterior'),
    ...lines(data.structure, 'Structure'),
    ...lines(data.notes, 'Notes'),
  ].slice(0, 80)
  return (
    <div>
      <dl>
        {data.accident !== undefined ? <Row label={t('imports.korea.accidentFlag')} value={yn(data.accident)} /> : null}
        {data.simple_repair !== undefined ? <Row label={t('imports.korea.simpleRepair')} value={yn(data.simple_repair)} /> : null}
      </dl>
      {data.inspected_on ? <p className="mt-2 text-caption text-content-secondary">{t('imports.korea.inspectedOn', { date: data.inspected_on })}</p> : null}
      {more.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-caption font-bold text-brand">{t('imports.korea.moreDetails')}</summary>
          <dl className="mt-2">{more.map(([k, v], i) => <Row key={`${k}-${i}`} label={k} value={v} />)}</dl>
        </details>
      ) : null}
    </div>
  )
}

function Record({ data }: { data: KoreaRecord }) {
  const t = useT()
  const n = (v: number | undefined) => (v === undefined ? null : String(v))
  const rows: [string, string | null][] = [
    [t('imports.korea.recordAccidents'), n(data.accident_count)],
    [t('imports.korea.recordOwnDamage'), data.own_damage_count === undefined ? null : `${data.own_damage_count}${data.own_damage_cost_krw ? ` (${won(data.own_damage_cost_krw)})` : ''}`],
    [t('imports.korea.recordOtherDamage'), data.other_damage_count === undefined ? null : `${data.other_damage_count}${data.other_damage_cost_krw ? ` (${won(data.other_damage_cost_krw)})` : ''}`],
    [t('imports.korea.recordOwners'), n(data.owner_change_count)],
    [t('imports.korea.recordPlates'), n(data.plate_change_count)],
    [t('imports.korea.recordTotalLoss'), n(data.total_loss_count)],
    [t('imports.korea.recordFlood'), data.flood_total_loss_count === undefined && data.flood_partial_loss_count === undefined ? null : String((data.flood_total_loss_count ?? 0) + (data.flood_partial_loss_count ?? 0))],
    [t('imports.korea.recordTheft'), n(data.theft_count)],
    [t('imports.korea.recordCommercial'), data.commercial === undefined ? null : data.commercial ? t('imports.korea.yes') : t('imports.korea.no')],
    [t('imports.korea.recordFirst'), data.first_registered ?? null],
  ]
  return (
    <div>
      <dl>{rows.filter(([, v]) => v !== null).map(([k, v]) => <Row key={k} label={k} value={v as string} />)}</dl>
      {data.accidents?.length ? (
        <ul className="mt-3 space-y-1 text-caption text-content-secondary">
          {data.accidents.map((a, i) => (
            <li key={`${a.date}-${i}`}>{t('imports.korea.recordClaim', { date: a.date, amount: (a.insurance_benefit ?? 0).toLocaleString('en-US') })}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Part<T>({ title, part, children }: { title: string; part: KoreaReportPart<T>; children: (data: T) => React.ReactNode }) {
  const t = useT()
  return (
    <section className="min-w-0 rounded-2xl border border-line-soft bg-surface p-4 sm:p-5">
      <h3 className="text-body font-extrabold text-content">{title}</h3>
      <div className="mt-3">
        {part.status === 'ok' ? (
          <>
            {children(part.data)}
            <p className="mt-3 text-micro text-content-muted">{t('imports.korea.reportUpdated', { date: part.fetched_at.slice(0, 10) })}</p>
          </>
        ) : part.status === 'none' ? (
          <p className="text-caption text-content-secondary">{t('imports.korea.reportNone')}</p>
        ) : (
          <p className="text-caption text-content-secondary">{t('imports.korea.reportUnavailable')}</p>
        )}
      </div>
    </section>
  )
}

/** Fetched after the page has rendered: the provider's reports never delay the photos or the price. */
/** When the asking price last went down, from the provider's price history; null if it has not. */
function lastDrop(history: KoreaReports['price_history'], currentMan: number): string | null {
  let i = history.length - 1
  while (i >= 0 && history[i].price_man === currentMan) i -= 1
  if (i < 0 || history[i].price_man <= currentMan) return null
  return history[i + 1]?.observed_at ?? null
}

export function KoreaReportsPanel({ listingId, priceMan }: { listingId: string; priceMan: number }) {
  const t = useT()
  const [reports, setReports] = useState<KoreaReports | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/imports/korea/${encodeURIComponent(listingId)}/reports`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data: KoreaReports) => { if (!cancelled) setReports(data) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [listingId])

  return (
    <div>
      <h2 className="text-headline font-extrabold text-content">{t('imports.korea.reportsTitle')}</h2>
      <p className="mt-2 max-w-prose text-body text-content-secondary">{t('imports.korea.reportsLede')}</p>
      {reports && lastDrop(reports.price_history, priceMan) ? (
        <p className="mt-2 text-caption font-semibold text-success">{t('imports.korea.priceDropped', { date: lastDrop(reports.price_history, priceMan) as string })}</p>
      ) : null}
      <div className="mt-5 grid gap-4 md:grid-cols-2" aria-live="polite">
        {failed ? (
          <p className="text-caption text-content-secondary md:col-span-2">{t('imports.korea.reportUnavailable')}</p>
        ) : !reports ? (
          <p className="text-caption text-content-muted md:col-span-2">{t('imports.korea.reportLoading')}</p>
        ) : (
          <>
            <Part title={t('imports.korea.inspection')} part={reports.inspection}>{(d) => <Inspection data={d} />}</Part>
            <Part title={t('imports.korea.record')} part={reports.record}>{(d) => <Record data={d} />}</Part>
          </>
        )}
      </div>
    </div>
  )
}
