import { Button, Container, Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'

// The whole proposition in two lines. Both halves are literally true and both
// are enforced by the backend: no car reaches `live` without an inspection
// record, and no seller can submit one without an approved ID.
//
// The search box is a real GET form pointed at /cars, so it works with
// JavaScript disabled and produces a shareable, indexable URL.

const TRUST_STRIP: { icon: IconName; label: string }[] = [
  { icon: 'shield-check', label: '150-point inspection' },
  { icon: 'refresh', label: '7-day drive-it guarantee' },
  { icon: 'cash', label: 'Buyers pay nothing' },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line-soft">
      {/* Decorative wash only — nothing here carries meaning. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface via-surface-page to-surface-page"
      />

      <Container className="relative py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-3xl text-center animate-fade-up">
          <h1 className="text-display-xl font-extrabold text-content">
            <span className="block">Every car inspected.</span>
            <span className="block">Every seller verified.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-[17px] leading-relaxed text-content-secondary sm:text-lg">
            Inzozi Motors is the middleman Rwanda&apos;s used-car market never had. Sellers bring
            us the car, we run a 150-point check and photograph it ourselves, and only then does
            it go live — which is why nobody but our team can publish a listing.
          </p>

          <form
            action="/cars"
            method="get"
            role="search"
            className="mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card transition-colors focus-within:border-content-muted"
          >
            <label htmlFor="hero-search" className="sr-only">
              Search certified cars
            </label>
            <span className="pl-3 text-content-muted">
              <Icon name="search" size={18} />
            </span>
            <input
              id="hero-search"
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Toyota RAV4, automatic SUV, diesel…"
              className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-content placeholder:text-content-muted"
            />
            <Button type="submit" variant="dark" size="sm">
              Search
            </Button>
          </form>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              href="/cars"
              size="lg"
              trailingIcon={<Icon name="arrow-right" size={18} />}
            >
              Browse certified cars
            </Button>
            <Button href="/sell" variant="outline" size="lg">
              Sell your car
            </Button>
          </div>

          <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            {TRUST_STRIP.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2 text-[13px] font-semibold text-content-secondary"
              >
                <Icon name={item.icon} size={15} className="text-content-muted" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  )
}

export default Hero
