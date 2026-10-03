import type { Metadata } from 'next'
import Link from 'next/link'
import { Button, Container, Section } from '@/components/ui'
import { koreaCatalog, type KoreaFacets, type KoreaList } from '@/lib/api'
import { getServerT } from '@/lib/i18n/server'
import { KoreaCard } from './KoreaCard'
import { KoreaMore } from './KoreaMore'

// ─────────────────────────────────────────────────────────────────────────────
// /imports/korea — every used car for sale in South Korea.
//
// Server-rendered: the first 24 cars are in the HTML. Filters are a plain GET
// form, so a search is a link anyone can share and the page works before any
// script has loaded. The rest of the results arrive through KoreaMore.
//
// Honesty: the price is the KOREAN asking price and says so; nothing here
// suggests Sawa is the seller; and while the catalogue is switched off
// (`available: false`) the page says so and points to the request form, rather
// than showing an empty grid.
// ─────────────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined

const FILTER_KEYS = ['make', 'model', 'fuel', 'min_year', 'max_year', 'max_mileage', 'max_price_usd', 'q'] as const
const SORTS = ['newest', 'price_asc', 'price_desc', 'mileage_asc', 'year_desc'] as const

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams
  const t = await getServerT()
  // Worth indexing: the bare list, and one make on its own ("Kia cars for sale in
  // Korea"). Anything finer is thin and endless, and each car's own page is
  // noindex (it disappears when the car sells).
  const keys = Object.keys(params)
  const make = one(params.make)
  const indexable = keys.length === 0 || (keys.length === 1 && Boolean(make))
  return {
    title: make && indexable ? `${make}: ${t('imports.korea.metaTitle')}` : t('imports.korea.metaTitle'),
    description: t('imports.korea.metaDescription'),
    alternates: { canonical: make && indexable ? `/imports/korea?make=${encodeURIComponent(make)}` : '/imports/korea' },
    robots: indexable ? undefined : { index: false, follow: true },
  }
}

const field =
  'h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-field text-content ' +
  'placeholder:text-content-muted focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:text-body'
const label = 'mb-1 block text-caption font-bold text-content'

export default async function KoreaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const t = await getServerT()

  const values: Record<string, string> = {}
  for (const k of FILTER_KEYS) {
    const v = one(params[k])
    if (v) values[k] = v.slice(0, 80)
  }
  const sortParam = one(params.sort)
  const sort = (SORTS as readonly string[]).includes(sortParam ?? '') ? sortParam! : 'newest'
  const hasFilters = Object.keys(values).length > 0 || sort !== 'newest'

  const query: Record<string, string> = { ...values }
  if (sort !== 'newest') query.sort = sort

  const [list, facets] = await Promise.all([
    koreaCatalog.list(query).catch((): KoreaList | null => null),
    koreaCatalog.facets(values.make).catch((): KoreaFacets | null => null),
  ])

  // The API answers `available: false` while the catalogue is off; a network
  // failure is the same to the visitor: the request form still works.
  if (!list || !list.available) {
    return (
      <Section tone="page">
        <Container>
          <h1 className="max-w-4xl text-display font-extrabold text-content">{t('imports.korea.title')}</h1>
          <p className="mt-4 max-w-2xl text-title-sm leading-relaxed text-content-secondary">{t('imports.korea.unavailable')}</p>
          <div className="mt-7">
            <Button href="/imports#request" size="lg">{t('imports.korea.unavailableCta')}</Button>
          </div>
        </Container>
      </Section>
    )
  }

  const makes = facets?.makes ?? []
  const fuels = facets?.fuels ?? []
  const models = facets?.models ?? []
  const filterString = new URLSearchParams(query).toString()

  return (
    <>
      <div className="border-b border-line-soft bg-surface-page">
        <Container className="pb-8 pt-8 sm:pb-10 sm:pt-12">
          <h1 className="max-w-4xl text-display font-extrabold text-content">{t('imports.korea.title')}</h1>
          <p className="mt-4 max-w-2xl text-title-sm leading-relaxed text-content-secondary">{t('imports.korea.lede')}</p>
          {!hasFilters && facets?.total ? (
            <p className="mt-3 text-caption font-semibold text-content-muted">{t('imports.korea.total', { count: facets.total.toLocaleString('en-US') })}</p>
          ) : null}
        </Container>
      </div>

      <Section tone="page" className="!pt-8">
        <Container>
          <form method="get" action="/imports/korea" className="grid gap-3 rounded-2xl border border-line-soft bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
            <div className="min-w-0 sm:col-span-2 lg:col-span-4">
              <label htmlFor="k-q" className={label}>{t('imports.korea.search')}</label>
              <input id="k-q" name="q" type="search" defaultValue={values.q} maxLength={80} placeholder={t('imports.korea.searchPlaceholder')} className={field} />
            </div>
            <div className="min-w-0">
              <label htmlFor="k-make" className={label}>{t('imports.korea.make')}</label>
              <select id="k-make" name="make" defaultValue={values.make ?? ''} className={field}>
                <option value="">{t('imports.korea.allMakes')}</option>
                {makes.map((m) => <option key={m.make} value={m.make}>{m.make} ({m.count})</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="k-model" className={label}>{t('imports.korea.model')}</label>
              <input id="k-model" name="model" list="k-models" defaultValue={values.model} maxLength={60} placeholder={t('imports.korea.modelPlaceholder')} autoComplete="off" className={field} />
              <datalist id="k-models">{models.map((m) => <option key={m.model} value={m.model} />)}</datalist>
            </div>
            <div className="min-w-0">
              <label htmlFor="k-fuel" className={label}>{t('imports.korea.fuel')}</label>
              <select id="k-fuel" name="fuel" defaultValue={values.fuel ?? ''} className={`${field} capitalize`}>
                <option value="">{t('imports.korea.allFuels')}</option>
                {fuels.map((f) => <option key={f.fuel} value={f.fuel}>{f.fuel}</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="k-sort" className={label}>{t('imports.korea.sort')}</label>
              <select id="k-sort" name="sort" defaultValue={sort} className={field}>
                {SORTS.map((s) => <option key={s} value={s}>{t(`imports.korea.sorts.${s}`)}</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="k-minyear" className={label}>{t('imports.korea.yearFrom')}</label>
              <input id="k-minyear" name="min_year" type="number" inputMode="numeric" min={1980} max={2100} defaultValue={values.min_year} className={field} />
            </div>
            <div className="min-w-0">
              <label htmlFor="k-maxyear" className={label}>{t('imports.korea.yearTo')}</label>
              <input id="k-maxyear" name="max_year" type="number" inputMode="numeric" min={1980} max={2100} defaultValue={values.max_year} className={field} />
            </div>
            <div className="min-w-0">
              <label htmlFor="k-price" className={label}>{t('imports.korea.maxPrice')}</label>
              <input id="k-price" name="max_price_usd" type="number" inputMode="numeric" min={0} step={500} defaultValue={values.max_price_usd} className={field} />
            </div>
            <div className="min-w-0">
              <label htmlFor="k-km" className={label}>{t('imports.korea.maxMileage')}</label>
              <input id="k-km" name="max_mileage" type="number" inputMode="numeric" min={0} step={5000} defaultValue={values.max_mileage} className={field} />
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
              <Button type="submit">{t('imports.korea.apply')}</Button>
              {hasFilters ? <Link href="/imports/korea" className="text-caption font-bold text-content underline decoration-line underline-offset-4 hover:decoration-content">{t('imports.korea.clear')}</Link> : null}
            </div>
          </form>

          {list.items.length ? (
            <>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.items.map((c) => <KoreaCard key={c.id} car={c} />)}
              </ul>
              <KoreaMore key={filterString} filters={filterString} initialCursor={list.next_cursor} />
            </>
          ) : (
            <p className="mt-8 rounded-2xl border border-line-soft bg-surface p-5 text-body text-content-secondary">{t('imports.korea.empty')}</p>
          )}
          <p className="mt-10 max-w-prose text-caption text-content-muted">{t('imports.korea.disclaimer')}</p>
        </Container>
      </Section>
    </>
  )
}
