import { Button, Icon } from '@/components/ui'
import { InkClose } from '@/components/layout/InkClose'

// The structural claim no volume marketplace can make, stated bluntly, as the
// page's closer. One primary, one inverse — the InkClose contract.

export function FinalCta() {
  return (
    <InkClose
      // Portrait workshop photography sits beside the claim rather than being
      // stretched behind it. The alignment equipment makes inspection tangible.
      image={{ src: '/img/inspection-alignment.jpg', alt: 'A vehicle undergoing wheel alignment in a professional inspection workshop' }}
      imagePresentation="portrait"
      headline="Every car here passed the same 150-point inspection. There is no uninspected tier."
      actions={
        <>
          <Button href="/cars" size="lg" trailingIcon={<Icon name="arrow-right" size={18} />}>
            Browse certified cars
          </Button>
          <Button href="/sell" variant="inverse" size="lg">
            Sell your car
          </Button>
        </>
      }
    >
      Every listing carries its own report, its verified history and a 7-day window to change
      your mind. Browsing costs nothing, and so does buying — the fees are the seller&apos;s.
    </InkClose>
  )
}

export default FinalCta
