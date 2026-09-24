'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Button, Icon } from '@/components/ui'
import { formatMoney } from '@/lib/business'
import { BUDGET_EDGES, type CountedValue } from '@/lib/inventory'
import { useT } from '@/lib/i18n/context'

// ─────────────────────────────────────────────────────────────────────────────
// The front door's one control: Buy, Rent or Import, each a real GET form.
//
// Buyers here search by make, then budget, then shape — so Buy is three fields
// that write exactly the params /cars' own filter panel writes (make, model,
// max_price). With JavaScript off every panel still submits; the tabs only
// decide which one is visible. Makes and models come from live stock
// (lib/inventory.ts), so no option can land on an empty page.
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'buy' | 'rent' | 'import'
const MODES: Mode[] = ['buy', 'rent', 'import']

const field =
  'h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-3.5 text-field text-content ' +
  'placeholder:text-content-muted transition-colors hover:border-content-muted/60 ' +
  'focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-0 sm:text-body'

const label = 'mb-1.5 block text-micro font-bold text-content-secondary'

export function HeroSearch({
  makes,
  modelsByMake,
  rentalCount,
}: {
  makes: CountedValue[]
  modelsByMake: Record<string, string[]>
  rentalCount: number
}) {
  const t = useT()
  const id = useId()
  const [mode, setMode] = useState<Mode>('buy')
  const [make, setMake] = useState('')
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const models = make ? modelsByMake[make] ?? [] : Object.values(modelsByMake).flat()

  // Arrow keys move between tabs, as the WAI-ARIA tabs pattern expects.
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
    if (next == null) return
    e.preventDefault()
    const j = (next + MODES.length) % MODES.length
    setMode(MODES[j])
    tabs.current[j]?.focus()
  }

  return (
    <div className="mt-8 w-full max-w-2xl rounded-3xl border border-line-soft bg-surface p-2 shadow-float">
      <div role="tablist" aria-label={t('home.front.tabsLabel')} className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-alt p-1">
        {MODES.map((m, i) => (
          <button
            key={m}
            ref={(el) => { tabs.current[i] = el }}
            type="button"
            role="tab"
            id={`${id}-tab-${m}`}
            aria-selected={mode === m}
            aria-controls={`${id}-panel-${m}`}
            tabIndex={mode === m ? 0 : -1}
            onClick={() => setMode(m)}
            onKeyDown={(e) => onKey(e, i)}
            className={`h-10 rounded-xl text-caption font-bold transition-[background-color,color,box-shadow] duration-200 ease-brand ${
              mode === m
                ? 'bg-surface text-content shadow-card'
                : 'text-content-secondary hover:text-content'
            }`}
          >
            {t(`home.front.tab.${m}`)}
          </button>
        ))}
      </div>

      {/* BUY */}
      {/* role="tabpanel" is not allowed on <form>, so each panel is a div
          holding its form. */}
      <div
        role="tabpanel"
        id={`${id}-panel-buy`}
        aria-labelledby={`${id}-tab-buy`}
        hidden={mode !== 'buy'}
      >
        <form
          action="/cars"
          method="get"
          // The `hidden` attribute alone loses to a display utility, so the
          // visibility class is toggled with it.
          className={`${mode === 'buy' ? 'grid' : 'hidden'} grid-cols-2 gap-3 p-3 pt-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end`}
        >
          <div className="min-w-0">
            <label htmlFor={`${id}-make`} className={label}>{t('home.front.make')}</label>
            <select id={`${id}-make`} name="make" value={make} onChange={(e) => setMake(e.target.value)} className={field}>
              <option value="">{t('home.front.anyMake')}</option>
              {makes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.value} ({m.count})
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor={`${id}-model`} className={label}>{t('home.front.model')}</label>
            <input
              id={`${id}-model`}
              name="model"
              list={`${id}-models`}
              autoComplete="off"
              placeholder={t('home.front.anyModel')}
              className={field}
            />
            <datalist id={`${id}-models`}>
              {models.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <label htmlFor={`${id}-budget`} className={label}>{t('home.front.budget')}</label>
            <select id={`${id}-budget`} name="max_price" defaultValue="" className={field}>
              <option value="">{t('home.front.anyBudget')}</option>
              {BUDGET_EDGES.map((edge) => (
                <option key={edge} value={edge}>
                  {t('home.front.upTo', { amount: formatMoney(edge) })}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="lg" className="col-span-2 h-12 sm:col-span-1 sm:px-6" leadingIcon={<Icon name="search" size={18} />}>
            {t('home.front.showCars')}
          </Button>
        </form>
      </div>

      {/* RENT */}
      <div
        role="tabpanel"
        id={`${id}-panel-rent`}
        aria-labelledby={`${id}-tab-rent`}
        hidden={mode !== 'rent'}
        className={`${mode === 'rent' ? 'flex' : 'hidden'} flex-col gap-4 p-3 pt-4 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="min-w-0 max-w-md">
          <p className="text-caption leading-relaxed text-content-secondary">{t('home.front.rentLede')}</p>
          {rentalCount > 0 ? (
            <p className="mt-1.5 text-caption font-bold text-content">
              {t('home.front.rentCount', { count: rentalCount })}
            </p>
          ) : null}
        </div>
        <Button href="/rentals" size="lg" className="h-12 shrink-0" trailingIcon={<Icon name="arrow-right" size={18} />}>
          {t('home.front.rentCta')}
        </Button>
      </div>

      {/* IMPORT */}
      <div
        role="tabpanel"
        id={`${id}-panel-import`}
        aria-labelledby={`${id}-tab-import`}
        hidden={mode !== 'import'}
      >
        <form
          action="/imports"
          method="get"
          className={`${mode === 'import' ? 'block' : 'hidden'} p-3 pt-4`}
        >
          <p className="text-caption leading-relaxed text-content-secondary">{t('home.front.importLede')}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="min-w-0">
              <label htmlFor={`${id}-year`} className={label}>{t('home.front.importYear')}</label>
              <input
                id={`${id}-year`}
                name="year"
                type="number"
                inputMode="numeric"
                min={1990}
                max={new Date().getFullYear() + 1}
                placeholder={String(new Date().getFullYear() - 5)}
                className={field}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor={`${id}-fob`} className={label}>{t('home.front.importPrice')}</label>
              <input
                id={`${id}-fob`}
                name="price_usd"
                type="number"
                inputMode="numeric"
                min={0}
                step={100}
                placeholder="12000"
                className={field}
              />
            </div>
            <Button type="submit" size="lg" className="h-12" trailingIcon={<Icon name="arrow-right" size={18} />}>
              {t('home.front.importCta')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default HeroSearch
