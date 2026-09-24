import type { Metadata } from 'next'
import Link from 'next/link'
import { Button, Container, Icon, Section } from '@/components/ui'
import { JsonLd } from '@/components/JsonLd'
import { DutyCalculator } from '@/components/tools/DutyCalculator'
import { importCatalog, type ImportCatalogMake, type ImportCatalogModel } from '@/lib/api'
import { formatUsdApprox, getRwfRate } from '@/lib/business'
import { getCurrentUser } from '@/lib/session'
import { getServerT } from '@/lib/i18n/server'
import { breadcrumbNode, graph, serviceNode } from '@/lib/seo'
import { RequestImportForm } from './RequestImportForm'

// ─────────────────────────────────────────────────────────────────────────────
// /imports — the import service, in public.
//
// Sawa has run import orders for months (quote → agreement → two 50%
// milestones evidenced by bank-transfer proof → Kigali inspection → customs →
// handover), but the website had no page for it and could not start one; the
// only door was the app. This is that door: the process as the order state
// machine actually runs it (backend/src/routes/imports.js STATUS_TRANSITIONS),
// the catalogue of what can be sourced, the duty estimate, and a request form.
//
// What it must never say: escrow, guarantee, protection, or that Sawa holds
// the money. Payment here is instructing, referencing and evidencing a bank
// transfer — never custody (docs/IMPORTS-AUDIT.md, "Constraint to respect").
// ─────────────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined

const STEPS = ['request', 'quote', 'agreement', 'deposit', 'shipping', 'inspection', 'balance', 'handover'] as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('imports.metaTitle'),
    description: t('imports.metaDescription'),
    alternates: { canonical: '/imports' },
  }
}

function byOrigin(makes: ImportCatalogMake[]) {
  const map = new Map<string, { makes: ImportCatalogMake[]; models: number }>()
  for (const m of makes) {
    const entry = map.get(m.origin_country) ?? { makes: [], models: 0 }
    entry.makes.push(m)
    entry.models += m.model_count
    map.set(m.origin_country, entry)
  }
  return [...map.entries()].sort((a, b) => b[1].models - a[1].models)
}

function ModelRow({ model, t }: { model: ImportCatalogModel; t: (k: string, v?: Record<string, string | number>) => string }) {
  const specs = [model.body_type, model.fuel_types?.join(', '), model.transmission].filter(Boolean)
  const request = new URLSearchParams({ make: model.make, model: model.model, origin: model.origin_country })
  return (
    <li className="flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-line-soft bg-surface p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-micro font-semibold text-content-muted">{model.make}</p>
        <h3 className="mt-0.5 text-body font-extrabold text-content">
          {model.model}
          {model.trim ? <span className="font-semibold text-content-secondary"> {model.trim}</span> : null}
        </h3>
        {specs.length ? <p className="mt-1 text-caption text-content-secondary">{specs.join(' / ')}</p> : null}
        <p className="mt-2 text-micro text-content-muted">
          {model.estimated_transit_days ? t('imports.transitDays', { days: model.estimated_transit_days }) : null}
          {model.estimated_transit_days && model.origin_port ? ' ' : null}
          {model.origin_port ? t('imports.fromPort', { port: model.origin_port }) : null}
        </p>
        {model.typical_fob_usd ? (
          <p className="mt-1 text-caption font-semibold text-content">
            {t('imports.typicalFob', { amount: formatUsdApprox(model.typical_fob_usd) })}
          </p>
        ) : null}
      </div>
      <Link
        href={`/imports?${request.toString()}#request`}
        className="-my-1 inline-flex items-center gap-1.5 py-1 text-caption font-bold text-brand hover:underline"
      >
        {t('imports.requestThis')}
        <Icon name="arrow-right" size={14} aria-hidden="true" />
      </Link>
    </li>
  )
}

export default async function ImportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const t = await getServerT()
  const make = one(params.make)
  const origin = one(params.origin)
  const model = one(params.model)
  const yearParam = one(params.year)
  const priceUsd = Number(one(params.price_usd)) || 0

  const [makesRes, modelsRes, user] = await Promise.all([
    importCatalog.makes().catch(() => null),
    importCatalog.list({ make, origin, limit: make ? 250 : 12 }).catch(() => null),
    getCurrentUser(),
  ])
  const origins = byOrigin(makesRes?.items ?? [])
  const visibleMakes = (makesRes?.items ?? []).filter((m) => !origin || m.origin_country === origin)
  const models = modelsRes?.items ?? []
  const catalogUp = Boolean(makesRes)

  // The homepage's Import tab sends ?year=&price_usd=; turn them into the
  // calculator's inputs at the live rate.
  const year = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : undefined
  const initialValueRwf = priceUsd > 0 ? priceUsd * getRwfRate() : undefined
  const initialAgeYears = year ? Math.max(0, new Date().getFullYear() - year) : undefined

  const originHref = (o?: string) => {
    const q = new URLSearchParams()
    if (o) q.set('origin', o)
    const s = q.toString()
    return `/imports${s ? `?${s}` : ''}#catalog`
  }
  const makeHref = (m: ImportCatalogMake) => {
    const q = new URLSearchParams({ make: m.make, origin: m.origin_country })
    return `/imports?${q.toString()}#catalog`
  }
  const chip = (active: boolean) =>
    `inline-flex h-10 items-center gap-2 rounded-pill border px-4 text-caption font-bold transition-colors ${
      active ? 'border-content bg-content text-surface-page' : 'border-line bg-surface text-content hover:border-content'
    }`

  return (
    <>
      <JsonLd
        data={graph(
          serviceNode({
            id: 'vehicle-import-rwanda',
            name: 'Vehicle import to Rwanda',
            description: t('imports.metaDescription'),
            path: '/imports',
            serviceType: 'Vehicle import',
          }),
          breadcrumbNode([
            { name: 'Home', path: '/' },
            { name: 'Import a car', path: '/imports' },
          ])
        )}
      />

      {/* Opening, on the site's paper like /cars. */}
      <div className="border-b border-line-soft bg-surface-page">
        <Container className="pb-10 pt-8 sm:pb-14 sm:pt-14">
          <h1 className="max-w-4xl text-display font-extrabold text-content">{t('imports.title')}</h1>
          <p className="mt-4 max-w-2xl text-title-sm leading-relaxed text-content-secondary">{t('imports.lede')}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="#request" size="lg" trailingIcon={<Icon name="arrow-right" size={18} />}>
              {t('imports.ctaRequest')}
            </Button>
            <Button href="#estimate" size="lg" variant="outline">
              {t('imports.ctaEstimate')}
            </Button>
          </div>
          {origins.length ? (
            <ul className="mt-8 flex flex-wrap gap-2">
              {origins.map(([name, info]) => (
                <li key={name}>
                  <Link href={originHref(name)} className={chip(false)}>
                    {t(`imports.origins.${name}`)}
                    <span className="font-semibold text-content-muted">{t('imports.modelsCount', { count: info.models })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Container>
      </div>

      {/* The process: a real sequence, so it is numbered. */}
      <Section tone="surface">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-8">
              <h2 className="text-headline font-extrabold text-content">{t('imports.stepsTitle')}</h2>
              <p className="mt-3 max-w-prose text-body text-content-secondary">{t('imports.stepsLede')}</p>
              <ol className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2">
                {STEPS.map((step, i) => (
                  <li key={step} className="grid grid-cols-[auto_1fr] gap-x-4">
                    <span
                      aria-hidden="true"
                      className={`grid h-9 w-9 place-items-center rounded-full text-caption font-extrabold tabular-nums ${
                        // The two money steps in ink: marked, but not in the
                        // red reserved for prices and actions.
                        step === 'deposit' || step === 'balance'
                          ? 'bg-content text-surface-page'
                          : 'bg-surface-alt text-content'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-body font-extrabold text-content">{t(`imports.steps.${step}.t`)}</h3>
                      <p className="mt-1 text-caption leading-relaxed text-content-secondary">{t(`imports.steps.${step}.b`)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <aside className="min-w-0 lg:col-span-4">
              <div className="rounded-3xl bg-ink-900 p-6 text-white shadow-lift-ink sm:p-7 lg:sticky lg:top-[calc(var(--header-h)+24px)]">
                <Icon name="cash" size={22} className="text-white/70" aria-hidden="true" />
                <h2 className="mt-4 text-title font-extrabold">{t('imports.payTitle')}</h2>
                <p className="mt-3 text-body leading-relaxed text-white/75">{t('imports.payBody')}</p>
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      {/* The catalogue. Server-rendered and linkable: ?origin= and ?make=. */}
      <Section tone="page" id="catalog">
        <Container>
          <h2 className="text-headline font-extrabold text-content">{t('imports.catalogTitle')}</h2>
          <p className="mt-3 max-w-prose text-body text-content-secondary">{t('imports.catalogLede')}</p>

          {catalogUp ? (
            <>
              <ul className="mt-8 flex flex-wrap gap-2" aria-label={t('imports.origin')}>
                <li>
                  <Link href={originHref()} className={chip(!origin)} aria-current={!origin ? 'true' : undefined}>
                    {t('imports.allOrigins')}
                  </Link>
                </li>
                {origins.map(([name]) => (
                  <li key={name}>
                    <Link href={originHref(name)} className={chip(origin === name)} aria-current={origin === name ? 'true' : undefined}>
                      {t(`imports.origins.${name}`)}
                    </Link>
                  </li>
                ))}
              </ul>

              <ul className="mt-4 flex flex-wrap gap-2" aria-label={t('imports.make')}>
                {visibleMakes.map((m) => {
                  const active = make?.toLowerCase() === m.make.toLowerCase() && (!origin || origin === m.origin_country)
                  return (
                    <li key={`${m.make}-${m.origin_country}`}>
                      <Link
                        href={makeHref(m)}
                        aria-current={active ? 'true' : undefined}
                        className={`inline-flex h-9 items-center gap-2 rounded-pill border px-3.5 text-micro font-bold transition-colors ${
                          active ? 'border-brand bg-brand-tint text-content' : 'border-line-soft bg-surface text-content-secondary hover:border-content hover:text-content'
                        }`}
                      >
                        {m.make}
                        <span className="tabular-nums font-semibold text-content-muted">{m.model_count}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>

              {models.length ? (
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {models.map((m) => <ModelRow key={m.id} model={m} t={t} />)}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="mt-8 rounded-2xl border border-line-soft bg-surface p-5 text-body text-content-secondary">
              {t('imports.catalogEmpty')}
            </p>
          )}
        </Container>
      </Section>

      <Section tone="surface" id="estimate">
        <Container>
          <h2 className="text-headline font-extrabold text-content">{t('imports.estimateTitle')}</h2>
          <p className="mt-3 max-w-prose text-body text-content-secondary">{t('imports.estimateLede')}</p>
          {initialValueRwf && year ? (
            <p className="mt-3 text-caption font-semibold text-content">
              {t('imports.prefilled', { usd: formatUsdApprox(priceUsd), year })}
            </p>
          ) : null}
          <div className="mt-8">
            <DutyCalculator initialValueRwf={initialValueRwf} initialAgeYears={initialAgeYears} />
          </div>
        </Container>
      </Section>

      <Section tone="page" id="request">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-5">
              <h2 className="text-headline font-extrabold text-content">{t('imports.requestTitle')}</h2>
              <p className="mt-3 max-w-prose text-body text-content-secondary">{t('imports.requestLede')}</p>
            </div>
            <div className="min-w-0 lg:col-span-7">
              <div className="rounded-3xl border border-line-soft bg-surface p-5 shadow-card sm:p-7">
                {user ? (
                  <RequestImportForm
                    makes={[...new Set((makesRes?.items ?? []).map((m) => m.make))]}
                    defaults={{ origin, make, model, year: year ? String(year) : undefined }}
                  />
                ) : (
                  <div>
                    <h3 className="text-title-sm font-extrabold text-content">{t('imports.signInTitle')}</h3>
                    <p className="mt-2 text-body text-content-secondary">{t('imports.signInBody')}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button href={`/signin?next=${encodeURIComponent('/imports#request')}`}>{t('imports.signIn')}</Button>
                      <Button href={`/signup?next=${encodeURIComponent('/imports#request')}`} variant="outline">
                        {t('imports.createAccount')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}
