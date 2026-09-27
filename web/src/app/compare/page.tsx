import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CompareClear, CompareRemove } from '@/components/market/CompareControls'
import { Badge, Button, Card, Container, EmptyState } from '@/components/ui'
import { ApiError, cars } from '@/lib/api'
import { formatKm, formatMoney } from '@/lib/business'
import { getServerT } from '@/lib/i18n/server'
import type { Car } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Compare cars side by side (G8 / P3-D4 in docs/WEB-PARITY-PLAN.md).
//
// Driven by the URL (/compare?ids=a,b,c), so a comparison can be shared, and
// rendered from the public car endpoint, so only cars that are public right
// now appear — a sold or paused car simply drops out of the table.
//
// Rows follow the app's ComparisonScreen, minus its "Return Policy" row:
// Sawa Cars makes no guarantee and offers no returns (CLAUDE.md §4), so that
// row was a contradiction the website never repeats (B6).
//
// noindex: every combination of ids is its own thin, duplicate page.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = { robots: { index: false, follow: true } }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX = 3

type Better = 'lowest' | 'highest' | null
interface Row {
  label: string
  better: Better
  /** The number compared for the highlight; null when not comparable. */
  value: (car: Car) => number | null
  show: (car: Car) => string
}

/** The app's rule: highlight only when two or more cars are compared, every
 *  value is a number, and exactly one car holds the best. Ties highlight none. */
function winner(row: Row, list: Car[]): string | null {
  if (!row.better || list.length < 2) return null
  const values = list.map((car) => row.value(car))
  if (values.some((v) => v === null || Number.isNaN(v))) return null
  const best = row.better === 'lowest' ? Math.min(...(values as number[])) : Math.max(...(values as number[]))
  const holders = list.filter((_, i) => values[i] === best)
  return holders.length === 1 ? holders[0].id : null
}

async function load(id: string): Promise<Car | null> {
  try {
    return await cars.get(id)
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null
    return null
  }
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const t = await getServerT()
  const { ids: raw } = await searchParams
  const ids = [...new Set(String(raw || '').split(',').filter((id) => UUID.test(id)))].slice(0, MAX)
  const list = (await Promise.all(ids.map(load))).filter((car): car is Car => Boolean(car))

  const rows: Row[] = [
    { label: t('market.compare.rows.price'), better: 'lowest', value: (c) => c.price, show: (c) => formatMoney(c.price) },
    { label: t('market.compare.rows.year'), better: 'highest', value: (c) => c.year, show: (c) => String(c.year) },
    { label: t('market.compare.rows.mileage'), better: 'lowest', value: (c) => c.mileage, show: (c) => formatKm(c.mileage) },
    { label: t('market.compare.rows.fuel'), better: null, value: () => null, show: (c) => c.fuel_type || '—' },
    { label: t('market.compare.rows.transmission'), better: null, value: () => null, show: (c) => c.transmission || '—' },
    { label: t('market.compare.rows.body'), better: null, value: () => null, show: (c) => c.body_type || '—' },
    {
      label: t('market.compare.rows.score'),
      better: 'highest',
      value: (c) => (typeof c.inspection_score === 'number' ? c.inspection_score : null),
      show: (c) => (typeof c.inspection_score === 'number' ? `${c.inspection_score}/150` : t('market.compare.notInspected')),
    },
    {
      label: t('market.compare.rows.inspection'),
      better: 'highest',
      value: (c) => (c.inspected ? 1 : 0),
      show: (c) => (c.inspected ? t('market.compare.certified') : t('market.compare.notInspected')),
    },
    {
      label: t('market.compare.rows.seller'),
      better: 'highest',
      value: (c) => (c.seller_id_verified === 'approved' ? 1 : 0),
      show: (c) => (c.seller_id_verified === 'approved' ? t('market.compare.idVerified') : t('market.compare.notVerified')),
    },
  ]

  return (
    <Container className="py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title font-extrabold text-content">{t('market.compare.title')}</h1>
          <p className="mt-1 text-caption text-content-secondary">{t('market.compare.subtitle', { max: MAX })}</p>
        </div>
        {list.length ? <CompareClear /> : null}
      </div>

      {list.length < 2 ? (
        <Card className="mt-8">
          <EmptyState
            icon="grid"
            title={t('market.compare.emptyTitle')}
            description={t('market.compare.emptyBody', { max: MAX })}
            action={<Button href="/cars">{t('market.compare.browse')}</Button>}
          />
          {list.length === 1 ? (
            <p className="-mt-8 pb-8 text-center text-caption text-content-muted">
              {t('market.compare.oneSoFar', { title: list[0].title })}
            </p>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-line-soft bg-surface">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr>
                  <th scope="col" className="w-40 p-4 align-bottom text-micro font-bold text-content-muted">
                    <span className="sr-only">{t('market.compare.attribute')}</span>
                  </th>
                  {list.map((car) => (
                    <th key={car.id} scope="col" className="p-4 align-top">
                      <div className="relative">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-alt">
                          {car.images?.[0] ? (
                            <Image src={car.images[0]} alt="" fill sizes="220px" className="object-cover" />
                          ) : null}
                        </div>
                        <div className="absolute right-2 top-2">
                          <CompareRemove carId={car.id} remaining={list.filter((c) => c.id !== car.id).map((c) => c.id)} />
                        </div>
                      </div>
                      <Link href={`/cars/${car.id}`} className="mt-3 block text-caption font-extrabold text-content hover:text-brand">
                        {car.title}
                      </Link>
                      {car.inspected ? (
                        <div className="mt-1.5"><Badge tone="cert" icon="shield-check">{t('market.compare.certified')}</Badge></div>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const win = winner(row, list)
                  return (
                    <tr key={row.label} className="border-t border-line-soft">
                      <th scope="row" className="p-4 text-caption font-bold text-content-secondary">{row.label}</th>
                      {list.map((car) => (
                        <td
                          key={car.id}
                          className={`p-4 text-caption ${
                            win === car.id ? 'bg-success-tint font-extrabold text-success-text' : 'text-content'
                          }`}
                        >
                          {row.show(car)}
                          {win === car.id ? <span className="sr-only"> — {t('market.compare.best')}</span> : null}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-micro text-content-muted">{t('market.compare.legend')}</p>
        </>
      )}
    </Container>
  )
}
