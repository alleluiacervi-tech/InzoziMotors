import { Button, Container, Section } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// The homepage's only ask of sellers: make and year, then the valuation on
// /sell with both filled in. A plain GET form, so it works with JavaScript off
// and ships nothing to the browser.
// ─────────────────────────────────────────────────────────────────────────────

const field =
  'h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-3.5 text-field text-content ' +
  'placeholder:text-content-muted transition-colors hover:border-content-muted/60 ' +
  'focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:text-body'

export async function SellStrip({ makes }: { makes: string[] }) {
  const t = await getServerT()
  const currentYear = new Date().getFullYear()

  return (
    <Section tone="surface">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="min-w-0 lg:col-span-5">
            <h2 className="text-headline font-extrabold text-content">{t('home.land.sellStrip.title')}</h2>
            <p className="mt-3 max-w-prose text-title-sm leading-relaxed text-pretty text-content-secondary">
              {t('home.land.sellStrip.body')}
            </p>
          </div>

          <form action="/sell#valuation" method="get" className="grid min-w-0 gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end lg:col-span-7">
            <div className="min-w-0">
              <label htmlFor="sell-strip-make" className="mb-1.5 block text-micro font-bold text-content-secondary">
                {t('home.land.sellStrip.make')}
              </label>
              <input
                id="sell-strip-make"
                name="make"
                type="text"
                autoComplete="off"
                autoCapitalize="words"
                list={makes.length ? 'sell-strip-makes' : undefined}
                placeholder="Toyota"
                maxLength={40}
                className={field}
              />
              {makes.length ? (
                <datalist id="sell-strip-makes">
                  {makes.map((m) => <option key={m} value={m} />)}
                </datalist>
              ) : null}
            </div>
            <div className="min-w-0">
              <label htmlFor="sell-strip-year" className="mb-1.5 block text-micro font-bold text-content-secondary">
                {t('home.land.sellStrip.year')}
              </label>
              <input
                id="sell-strip-year"
                name="year"
                type="number"
                inputMode="numeric"
                min={1980}
                max={currentYear + 1}
                placeholder={String(currentYear - 6)}
                className={field}
              />
            </div>
            <Button type="submit" size="lg" className="h-12">
              {t('home.land.sellStrip.cta')}
            </Button>
          </form>
        </div>
      </Container>
    </Section>
  )
}

export default SellStrip
