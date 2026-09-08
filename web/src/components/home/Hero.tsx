import { HERO_SLIDES } from '@/lib/imagery'
import type { Car } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'
import { HeroDeck } from './HeroDeck'

export async function Hero({ cars = [] }: { cars?: Car[] }) {
  const t = await getServerT()

  const translations = {
    eyebrow: t('home.hero.eyebrow'),
    title: t('home.hero.title'),
    subtitle: t('home.hero.subtitle'),
    stockEyebrow: t('home.hero.stockEyebrow'),
    stockAll: t('home.hero.stockAll'),
  }

  return (
    <HeroDeck
      cars={cars}
      slides={HERO_SLIDES}
      translations={translations}
    />
  )
}

export default Hero

