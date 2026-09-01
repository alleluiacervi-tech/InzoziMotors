// Message section: store — the App Store / Google Play buttons (StoreButtons).
// Store names stay in English (proper names); only the captions translate.
import type { Locale } from '../config'

export const store: Record<Locale, Record<string, unknown>> = {
  en: { comingBoth: 'Coming to the App Store and Google Play.', downloadOn: 'Download on the', getItOn: 'Get it on', comingSoon: '{{names}} coming soon.' },
  rw: { comingBoth: 'Iraza kuri App Store na Google Play.', downloadOn: 'Ikure kuri', getItOn: 'Iboneka kuri', comingSoon: '{{names}} iraza.' },
  fr: { comingBoth: 'Bientôt sur l’App Store et Google Play.', downloadOn: 'Télécharger sur', getItOn: 'Disponible sur', comingSoon: '{{names}} bientôt disponible.' },
  sw: { comingBoth: 'Inakuja kwenye App Store na Google Play.', downloadOn: 'Pakua kwenye', getItOn: 'Ipate kwenye', comingSoon: '{{names}} inakuja hivi karibuni.' },
  ko: { comingBoth: 'App Store와 Google Play에 곧 출시됩니다.', downloadOn: '다운로드', getItOn: '다운로드', comingSoon: '{{names}} 곧 출시.' },
}
