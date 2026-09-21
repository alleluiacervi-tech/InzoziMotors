import { Button, Icon } from '@/components/ui'
import { InkClose } from '@/components/layout/InkClose'
import { getServerT } from '@/lib/i18n/server'

// The structural claim no volume marketplace can make, stated bluntly, as the
// page's closer. One primary, one inverse — the InkClose contract.
//
// THE PHOTOGRAPH. This band used to run /img/inspection-alignment.jpg — the
// same frame the hero opens with, printed twice on one page. Repeating a
// photograph inside a single scroll makes a site look like it owns one picture,
// and it wasted the closer: by the time a reader reaches it they have already
// been told about the inspection and are deciding whether to browse or to sell.
// So the alignment rack now appears exactly once, in the hero, and the closer
// carries the thing it is actually asking about — the row of inspected cars
// standing at the Kigali lot. Backdrop rather than portrait: the picture is a
// wide receding line of vehicles, and cropping that to a tall right-hand column
// would show one fender.

export async function FinalCta() {
  const t = await getServerT()
  return (
    <InkClose
      image={{ src: '/img/lot.jpg', alt: t('home.finalCta.imageAlt') }}
      headline={t('home.finalCta.headline')}
      actions={
        <>
          <Button href="/cars" size="lg" trailingIcon={<Icon name="arrow-right" size={18} />}>
            {t('home.finalCta.browse')}
          </Button>
          <Button href="/sell" variant="inverse" size="lg">
            {t('home.finalCta.sell')}
          </Button>
        </>
      }
    >
      {t('home.finalCta.body')}
    </InkClose>
  )
}

export default FinalCta
