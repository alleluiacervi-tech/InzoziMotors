import { Button, Container, Icon, Section } from '@/components/ui'
import { StoreButtons } from '@/components/app/StoreButtons'

// The one dark band on the page. Red survives here as the primary action only —
// on ink, that single button is the whole point of the section.

export function FinalCta() {
  return (
    <Section tone="ink">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-16">
          <div>
            <h2 className="text-headline font-extrabold text-white">
              Start with a car that has already been checked.
            </h2>
            <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-white/70">
              Every listing carries its own 150-point report, its verified history and a 7-day
              window to change your mind. Browsing costs nothing, and so does buying — the fees
              are the seller&apos;s.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                href="/cars"
                size="lg"
                trailingIcon={<Icon name="arrow-right" size={18} />}
              >
                Browse certified cars
              </Button>
              <Button
                href="/sell"
                variant="outline"
                size="lg"
                className="border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/10"
              >
                Sell your car
              </Button>
            </div>
          </div>

          <div className="lg:justify-self-end">
            <p className="mb-4 text-eyebrow font-bold uppercase text-white/40">
              Or carry it with you
            </p>
            <StoreButtons tone="dark" />
          </div>
        </div>
      </Container>
    </Section>
  )
}

export default FinalCta
