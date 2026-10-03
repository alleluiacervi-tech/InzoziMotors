// Message section: store — the App Store / Google Play buttons (StoreButtons).
// Store names stay in English (proper names); only the captions translate.
import type { Locale } from '../config'

export const store: Record<Locale, Record<string, unknown>> = {
  en: { androidWeb: 'On Android, use sawacars.com. Everything works in the browser.', comingBoth: 'Coming to the App Store and Google Play.', downloadOn: 'Download on the', getItOn: 'Get it on', comingCaption: 'Coming soon to', comingSoon: '{{names}} coming soon.' },
  rw: { androidWeb: 'Kuri Android, koresha sawacars.com. Byose bikorera muri mushakisha.', comingBoth: 'Iraza kuri App Store na Google Play.', downloadOn: 'Ikure kuri', getItOn: 'Iboneka kuri', comingCaption: 'Iraza kuri', comingSoon: '{{names}} iraza.' },
  fr: { androidWeb: 'Sur Android, utilisez sawacars.com. Tout fonctionne dans le navigateur.', comingBoth: 'Bientôt sur l’App Store et Google Play.', downloadOn: 'Télécharger sur', getItOn: 'Disponible sur', comingCaption: 'Bientôt sur', comingSoon: '{{names}} bientôt disponible.' },
  sw: { androidWeb: 'Kwenye Android, tumia sawacars.com. Kila kitu hufanya kazi kwenye kivinjari.', comingBoth: 'Inakuja kwenye App Store na Google Play.', downloadOn: 'Pakua kwenye', getItOn: 'Ipate kwenye', comingCaption: 'Inakuja kwenye', comingSoon: '{{names}} inakuja hivi karibuni.' },
  ko: { androidWeb: 'Android에서는 sawacars.com을 이용하세요. 모든 기능이 브라우저에서 작동합니다.', comingBoth: 'App Store와 Google Play에 곧 출시됩니다.', downloadOn: '다운로드', getItOn: '다운로드', comingCaption: '출시 예정', comingSoon: '{{names}} 곧 출시.' },
  zh: { androidWeb: 'Android 用户请使用 sawacars.com，所有功能均可在浏览器中使用。', comingBoth: '即将登陆 App Store 和 Google Play。', downloadOn: '下载于', getItOn: '获取于', comingCaption: '即将上线', comingSoon: '{{names}} 即将推出。' },
}
