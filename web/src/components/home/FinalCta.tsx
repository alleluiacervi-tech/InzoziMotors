import { Button, Icon } from '@/components/ui'
import { InkClose } from '@/components/layout/InkClose'
import { getServerT } from '@/lib/i18n/server'

// The structural claim no volume marketplace can make, stated bluntly, as the
// page's closer. One primary, one inverse — the InkClose contract.

export async function FinalCta() {
  const t = await getServerT()
  return (
    <InkClose
      // Portrait workshop photography sits beside the claim rather than being
      // stretched behind it. The alignment equipment makes inspection tangible.
      image={{ src: '/img/inspection-alignment.jpg', alt: t('home.finalCta.imageAlt') }}
      imagePresentation="portrait"
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
