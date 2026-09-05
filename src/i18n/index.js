// Sawa's small, dependency-free translation layer.
//
// The app is deliberately usable before the network is available, so language
// data lives in the bundle rather than coming from a remote translation API.
// English is the source/fallback language: a new key can ship safely before all
// translations are complete, and a missing translation never renders a blank
// label.

// `flag` is a regional-indicator emoji. It renders as a flag on iOS; Android
// has no flag glyphs and shows the two letters instead, so the picker falls
// back to the code badge there (see LanguageScreen). The emoji stays in the
// data so one source describes each language.
export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', locale: 'en-RW', flag: '🇬🇧' },
  { code: 'rw', label: 'Kinyarwanda', nativeLabel: 'Kinyarwanda', locale: 'rw-RW', flag: '🇷🇼' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', locale: 'fr-RW', flag: '🇫🇷' },
  { code: 'sw', label: 'Swahili', nativeLabel: 'Kiswahili', locale: 'sw-KE', flag: '🇰🇪' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', locale: 'ko-KR', flag: '🇰🇷' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', locale: 'zh-CN', flag: '🇨🇳' },
];

export const DEFAULT_LANGUAGE = 'en';

const EN = {
  common: {
    back: 'Back', close: 'Close', cancel: 'Cancel', save: 'Save', search: 'Search',
    signIn: 'Sign in', register: 'Register', logout: 'Log out', next: 'Next',
    skip: 'Skip', getStarted: 'Get started', loading: 'Loading…', retry: 'Try again',
    language: 'Language', done: 'Done', settings: 'Settings', home: 'Home',
    buy: 'Buy', rent: 'Rent', sell: 'Sell', profile: 'Profile', menu: 'Menu',
  },
  language: {
    title: 'Choose your language',
    subtitle: 'You can change this any time in Settings.',
    current: 'Current language',
    saved: 'Language updated',
    restartHint: 'Your choice is saved on this device and applies immediately.',
  },
  welcome: {
    title: "Rwanda's most\ntrusted car\nmarketplace.",
    subtitle: 'Quality cars. Fair prices.\nTotal peace of mind.',
    trusted: 'Trusted', trustedSub: 'Every car is\ninspected',
    fairPrices: 'Fair prices', fairPricesSub: 'Best value for\nyour money',
    directContact: 'Direct contact', directContactSub: 'Deal with the\nseller yourself',
    exploreCars: 'Explore cars', sellCar: 'Sell your car',
    alreadyAccount: 'Already have an account?',
    termsPrefix: 'By continuing, you agree to our', terms: 'Terms', privacy: 'Privacy policy',
  },
  onboarding: {
    inspectTitle: 'Every car, inspected', inspectSub: '150-point certified check.',
    photosTitle: 'Real photos, real specs', photosSub: 'Shot by our own team.',
    trustTitle: 'Contact verified sellers', trustSub: 'Agree and transact directly.',
    updateChoice: 'Keep Sawa Cars up to date automatically. New versions install when you next open the app — never while you are using it.',
  },
  drawer: {
    buyCar: 'Buy a car', browseAll: 'Browse all cars', savedCars: 'Saved cars', compareCars: 'Compare cars',
    rent: 'Rent', browseRentals: 'Browse rentals', rentalInquiries: 'Rental inquiries',
    financeServices: 'Finance & services', financing: 'Financing calculator', importDuty: 'Import duty', imports: 'My vehicle imports',
    sellCar: 'Sell a car', verifyIdentity: 'Identity verification', submitCar: 'Submit my car', submissions: 'My submissions', analytics: 'Seller analytics', trustScore: 'My trust score',
    trustSafety: 'Trust & safety', notifications: 'Notifications', marketplaceSafety: 'Marketplace safety',
    teamPortal: 'Team portal', version: 'Sawa Cars v1.0 · Kigali, Rwanda', certifiedMarketplace: "Rwanda's certified marketplace",
  },
  settings: {
    title: 'Settings', account: 'Account', preferences: 'Preferences', support: 'Support', app: 'App', legal: 'Legal', danger: 'Danger zone',
    verification: 'Verification & trust', savedSearches: 'Saved searches', push: 'Push notifications',
    language: 'Language', checkUpdates: 'Check for updates', whatsapp: 'WhatsApp us', call: 'Call us', email: 'Email us', replay: 'Replay intro',
    privacy: 'Privacy policy', terms: 'Terms of service', directDeal: 'Direct-deal notice', delete: 'Delete my account', deleteHint: 'Permanent. Your data is erased.',
    verified: 'Verified', underReview: 'Under review', actionNeeded: 'Action needed', notVerified: 'Not verified',
  },
  home: {
    location: 'Location', kigali: 'Kigali, Rwanda', buy: 'Buy', rent: 'Rent',
    offlineTitle: "We couldn't reach Sawa Cars", offlineSub: 'Check your connection to see the latest listings.',
    search: 'Search make, model, type…', searchRentals: 'Search rental cars…', rentalInquiry: 'Rental inquiry in progress',
    certifiedRentals: 'Certified rentals', certifiedRentalsSub: 'Reliable vehicles for every journey.',
    topDeals: 'Top deals', topDealsSub: 'Chosen by our team · swipe for more',
    certifyCar: 'Certify my car', importDuty: 'Import duty', financing: 'Financing', compare: 'Compare',
    showroom: 'Sawa Center', onDisplay: 'On display in Nyarutarama this week', carsInShowroom: '{{count}} cars in the showroom',
    all: 'All', imported: 'Imported', local: 'Local', evHybrid: 'EV·Hybrid',
    fresh: 'Fresh this week', popular: 'Popular near you', browseAll: 'Browse all cars',
    ourPromise: 'Our promise', aboutUs: 'About us', login: 'Log in', copyright: '© 2026 Sawa Cars. All rights reserved.',
  },
  filters: { filters: 'Filters', clear: 'Clear all filters', apply: 'View cars', noResults: 'No cars found', adjust: 'Try adjusting your search or removing filters' },
};

// Keep the keys in the same shape as English. This makes missing translations
// obvious in code review and lets `translate` safely fall back per string.
const RW = {
  common: { back: 'Subira inyuma', close: 'Funga', cancel: 'Hagarika', save: 'Bika', search: 'Shakisha', signIn: 'Injira', register: 'Iyandikishe', logout: 'Sohoka', next: 'Komeza', skip: 'Simbuka', getStarted: 'Tangira', loading: 'Birimo gutegurwa…', retry: 'Ongera ugerageze', language: 'Ururimi', done: 'Byarangiye', settings: 'Igenamiterere', home: 'Ahabanza', buy: 'Gura', rent: 'Kodesha', sell: 'Gurisha', profile: 'Umwirondoro', menu: 'Menyu' },
  language: { title: 'Hitamo ururimi', subtitle: 'Ushobora kubihindura igihe icyo ari cyo cyose muri Igenamiterere.', current: 'Ururimi rukoreshwa', saved: 'Ururimi rwahinduwe', restartHint: 'Ihitamo ryawe ribikwa kuri iki gikoresho kandi rihita rikora.' },
  welcome: { title: 'Isoko ry’imodoka\nryizewe cyane\nmu Rwanda.', subtitle: 'Imodoka nziza. Ibiciro biboneye.\nAmahoro yuzuye.', trusted: 'Yizewe', trustedSub: 'Buri modoka\nirasuzumwa', fairPrices: 'Ibiciro biboneye', fairPricesSub: 'Agaciro keza ku\nmafaranga yawe', directContact: 'Kuvugana mu buryo butaziguye', directContactSub: 'Ganira n’umugurisha\nubwawe', exploreCars: 'Reba imodoka', sellCar: 'Gurisha imodoka yawe', alreadyAccount: 'Usanzwe ufite konti?', termsPrefix: 'Mu gukomeza, wemera', terms: 'Amabwiriza', privacy: 'Politiki y’ibanga' },
  onboarding: { inspectTitle: 'Buri modoka irasuzumwa', inspectSub: 'Isuzuma ryemewe ry’ingingo 150.', photosTitle: 'Amafoto nyayo, amakuru nyayo', photosSub: 'Bifashwe n’itsinda ryacu.', trustTitle: 'Vugana n’abagurisha bagenzuwe', trustSub: 'Mubyumvikane kandi mugirane amasezerano.', updateChoice: 'Komeza Sawa Cars ivugururwa mu buryo bwikora. Verisiyo nshya ishyirwaho igihe wongeye gufungura porogaramu — ntibikubangamira uyikoresha.' },
  drawer: { buyCar: 'Gura imodoka', browseAll: 'Reba imodoka zose', savedCars: 'Imodoka wabikiye', compareCars: 'Geranya imodoka', rent: 'Kodesha', browseRentals: 'Reba izikodeshwa', rentalInquiries: 'Ibyifuzo byo gukodesha', financeServices: 'Imari na serivisi', financing: 'Kubara inguzanyo', importDuty: 'Umusoro wo gutumiza', imports: 'Imodoka ntumiza', sellCar: 'Gurisha imodoka', verifyIdentity: 'Genzura umwirondoro', submitCar: 'Tanga imodoka yawe', submissions: 'Ibyo watanze', analytics: 'Isesengura ry’umugurisha', trustScore: 'Amanota y’icyizere', trustSafety: 'Icyizere n’umutekano', notifications: 'Imenyesha', marketplaceSafety: 'Umutekano w’isoko', teamPortal: 'Urubuga rw’abakozi', version: 'Sawa Cars v1.0 · Kigali, Rwanda', certifiedMarketplace: 'Isoko ryemewe mu Rwanda' },
  settings: { title: 'Igenamiterere', account: 'Konti', preferences: 'Ibyifuzo', support: 'Ubufasha', app: 'Porogaramu', legal: 'Amategeko', danger: 'Ahantu hateye akaga', verification: 'Kugenzura n’icyizere', savedSearches: 'Ibyo washakishije wabikiye', push: 'Imenyesha kuri telefoni', language: 'Ururimi', checkUpdates: 'Reba ivugurura', whatsapp: 'Twandikire kuri WhatsApp', call: 'Duhamagare', email: 'Twoherereze imeyili', replay: 'Subiramo intangiriro', privacy: 'Politiki y’ibanga', terms: 'Amabwiriza y’imikoreshereze', directDeal: 'Itangazo ry’ubucuruzi butaziguye', delete: 'Siba konti yanjye', deleteHint: 'Ntibisubirwaho. Amakuru yawe arasibwa.', verified: 'Byagenzuwe', underReview: 'Biracyasuzumwa', actionNeeded: 'Harakenewe igikorwa', notVerified: 'Ntabwo byagenzuwe' },
  home: { location: 'Aho biherereye', kigali: 'Kigali, Rwanda', buy: 'Gura', rent: 'Kodesha', offlineTitle: 'Ntidushoboye kugera kuri Sawa Cars', offlineSub: 'Reba umurongo wa interineti kugira ngo ubone imodoka nshya.', search: 'Shakisha ikirango, ubwoko…', searchRentals: 'Shakisha imodoka zikodeshwa…', rentalInquiry: 'Ufite icyifuzo cyo gukodesha gikomeje', certifiedRentals: 'Imodoka zemewe zikodeshwa', certifiedRentalsSub: 'Imodoka zizewe kuri buri rugendo.', topDeals: 'Amahitamo meza', topDealsSub: 'Byatoranyijwe n’itsinda ryacu · koresha intoki', certifyCar: 'Emeza imodoka yanjye', importDuty: 'Umusoro wo gutumiza', financing: 'Kubara inguzanyo', compare: 'Geranya', showroom: 'Sawa Center', onDisplay: 'Ziri kumurikwa i Nyarutarama muri iki cyumweru', carsInShowroom: 'Imodoka {{count}} muri showroom', all: 'Zose', imported: 'Zatumijwe', local: 'Iz’imbere mu gihugu', evHybrid: 'EV·Hybrid', fresh: 'Nshya kuri iki cyumweru', popular: 'Zikunzwe hafi yawe', browseAll: 'Reba imodoka zose', ourPromise: 'Isezerano ryacu', aboutUs: 'Abo turi bo', login: 'Injira', copyright: '© 2026 Sawa Cars. Uburenganzira bwose burabitswe.' },
  filters: { filters: 'Akayunguruzo', clear: 'Kuraho byose', apply: 'Reba imodoka', noResults: 'Nta modoka zabonetse', adjust: 'Hindura ibyo washakishije cyangwa ukureho akayunguruzo' },
};

const FR = {
  common: { back: 'Retour', close: 'Fermer', cancel: 'Annuler', save: 'Enregistrer', search: 'Rechercher', signIn: 'Se connecter', register: "S’inscrire", logout: 'Se déconnecter', next: 'Suivant', skip: 'Passer', getStarted: 'Commencer', loading: 'Chargement…', retry: 'Réessayer', language: 'Langue', done: 'Terminé', settings: 'Paramètres', home: 'Accueil', buy: 'Acheter', rent: 'Louer', sell: 'Vendre', profile: 'Profil', menu: 'Menu' },
  language: { title: 'Choisissez votre langue', subtitle: 'Vous pouvez la modifier à tout moment dans les paramètres.', current: 'Langue actuelle', saved: 'Langue mise à jour', restartHint: 'Votre choix est enregistré sur cet appareil et s’applique immédiatement.' },
  welcome: { title: 'Le marché automobile\nle plus fiable\nau Rwanda.', subtitle: 'Des voitures de qualité. Des prix justes.\nUne tranquillité totale.', trusted: 'Fiable', trustedSub: 'Chaque voiture est\ninspectée', fairPrices: 'Prix justes', fairPricesSub: 'Le meilleur rapport\nqualité-prix', directContact: 'Contact direct', directContactSub: 'Échangez directement\navec le vendeur', exploreCars: 'Explorer les voitures', sellCar: 'Vendre votre voiture', alreadyAccount: 'Vous avez déjà un compte ?', termsPrefix: 'En continuant, vous acceptez nos', terms: 'Conditions', privacy: 'Politique de confidentialité' },
  onboarding: { inspectTitle: 'Chaque voiture est inspectée', inspectSub: 'Contrôle certifié en 150 points.', photosTitle: 'Vraies photos, vraies informations', photosSub: 'Prises par notre équipe.', trustTitle: 'Contactez des vendeurs vérifiés', trustSub: 'Échangez et concluez directement.', updateChoice: 'Gardez Sawa Cars à jour automatiquement. Les nouvelles versions s’installent à votre prochaine ouverture — jamais pendant votre utilisation.' },
  drawer: { buyCar: 'Acheter une voiture', browseAll: 'Toutes les voitures', savedCars: 'Voitures enregistrées', compareCars: 'Comparer', rent: 'Louer', browseRentals: 'Voir les locations', rentalInquiries: 'Demandes de location', financeServices: 'Finances et services', financing: 'Calculateur de financement', importDuty: 'Droits d’importation', imports: 'Mes importations', sellCar: 'Vendre une voiture', verifyIdentity: 'Vérification d’identité', submitCar: 'Proposer ma voiture', submissions: 'Mes propositions', analytics: 'Analyses vendeur', trustScore: 'Mon score de confiance', trustSafety: 'Confiance et sécurité', notifications: 'Notifications', marketplaceSafety: 'Sécurité du marché', teamPortal: 'Portail équipe', version: 'Sawa Cars v1.0 · Kigali, Rwanda', certifiedMarketplace: 'Marché certifié du Rwanda' },
  settings: { title: 'Paramètres', account: 'Compte', preferences: 'Préférences', support: 'Assistance', app: 'Application', legal: 'Juridique', danger: 'Zone dangereuse', verification: 'Vérification et confiance', savedSearches: 'Recherches enregistrées', push: 'Notifications push', language: 'Langue', checkUpdates: 'Rechercher des mises à jour', whatsapp: 'Nous écrire sur WhatsApp', call: 'Nous appeler', email: 'Nous envoyer un e-mail', replay: 'Revoir l’introduction', privacy: 'Politique de confidentialité', terms: "Conditions d’utilisation", directDeal: 'Avis de transaction directe', delete: 'Supprimer mon compte', deleteHint: 'Définitif. Vos données seront supprimées.', verified: 'Vérifié', underReview: 'En cours de vérification', actionNeeded: 'Action requise', notVerified: 'Non vérifié' },
  home: { location: 'Lieu', kigali: 'Kigali, Rwanda', buy: 'Acheter', rent: 'Louer', offlineTitle: 'Sawa Cars est inaccessible', offlineSub: 'Vérifiez votre connexion pour voir les dernières annonces.', search: 'Rechercher marque, modèle, type…', searchRentals: 'Rechercher une location…', rentalInquiry: 'Demande de location en cours', certifiedRentals: 'Locations certifiées', certifiedRentalsSub: 'Des véhicules fiables pour chaque trajet.', topDeals: 'Meilleures offres', topDealsSub: 'Sélectionnées par notre équipe · faites défiler', certifyCar: 'Certifier ma voiture', importDuty: 'Droits d’importation', financing: 'Financement', compare: 'Comparer', showroom: 'Sawa Center', onDisplay: 'Exposées à Nyarutarama cette semaine', carsInShowroom: '{{count}} voitures dans le showroom', all: 'Toutes', imported: 'Importées', local: 'Locales', evHybrid: 'VE·Hybride', fresh: 'Nouveautés', popular: 'Populaires près de vous', browseAll: 'Voir toutes les voitures', ourPromise: 'Notre promesse', aboutUs: 'À propos', login: 'Se connecter', copyright: '© 2026 Sawa Cars. Tous droits réservés.' },
  filters: { filters: 'Filtres', clear: 'Effacer les filtres', apply: 'Voir les voitures', noResults: 'Aucune voiture trouvée', adjust: 'Modifiez votre recherche ou retirez des filtres' },
};

const SW = {
  common: { back: 'Rudi', close: 'Funga', cancel: 'Ghairi', save: 'Hifadhi', search: 'Tafuta', signIn: 'Ingia', register: 'Jisajili', logout: 'Ondoka', next: 'Endelea', skip: 'Ruka', getStarted: 'Anza', loading: 'Inapakia…', retry: 'Jaribu tena', language: 'Lugha', done: 'Imekamilika', settings: 'Mipangilio', home: 'Nyumbani', buy: 'Nunua', rent: 'Kukodisha', sell: 'Uza', profile: 'Wasifu', menu: 'Menyu' },
  language: { title: 'Chagua lugha yako', subtitle: 'Unaweza kuibadilisha wakati wowote kwenye Mipangilio.', current: 'Lugha ya sasa', saved: 'Lugha imebadilishwa', restartHint: 'Chaguo lako limehifadhiwa kwenye kifaa hiki na linaanza kutumika mara moja.' },
  welcome: { title: 'Soko la magari\nlenye kuaminika zaidi\nRwanda.', subtitle: 'Magari bora. Bei za haki.\nAmani kamili ya moyo.', trusted: 'Inaaminika', trustedSub: 'Kila gari\nlinakaguliwa', fairPrices: 'Bei za haki', fairPricesSub: 'Thamani bora\nkwa pesa yako', directContact: 'Mawasiliano ya moja kwa moja', directContactSub: 'Fanya biashara na\nmuuzaji mwenyewe', exploreCars: 'Angalia magari', sellCar: 'Uza gari lako', alreadyAccount: 'Una akaunti tayari?', termsPrefix: 'Kwa kuendelea, unakubali', terms: 'Masharti', privacy: 'Sera ya faragha' },
  onboarding: { inspectTitle: 'Kila gari linakaguliwa', inspectSub: 'Ukaguzi wa pointi 150 uliothibitishwa.', photosTitle: 'Picha halisi, maelezo halisi', photosSub: 'Zimepigwa na timu yetu.', trustTitle: 'Wasiliana na wauzaji waliothibitishwa', trustSub: 'Kubali na kufanya biashara moja kwa moja.', updateChoice: 'Weka Sawa Cars isasishwe kiotomatiki. Matoleo mapya yatawekwa unapofungua programu tena — kamwe wakati unaitumia.' },
  drawer: { buyCar: 'Nunua gari', browseAll: 'Angalia magari yote', savedCars: 'Magari yaliyohifadhiwa', compareCars: 'Linganisha magari', rent: 'Kukodisha', browseRentals: 'Angalia ya kukodisha', rentalInquiries: 'Maombi ya kukodisha', financeServices: 'Fedha na huduma', financing: 'Kikokotoo cha ufadhili', importDuty: 'Ushuru wa kuagiza', imports: 'Magari yangu yanayoagizwa', sellCar: 'Uza gari', verifyIdentity: 'Thibitisha utambulisho', submitCar: 'Wasilisha gari langu', submissions: 'Mawasilisho yangu', analytics: 'Takwimu za muuzaji', trustScore: 'Alama yangu ya uaminifu', trustSafety: 'Uaminifu na usalama', notifications: 'Arifa', marketplaceSafety: 'Usalama wa soko', teamPortal: 'Lango la timu', version: 'Sawa Cars v1.0 · Kigali, Rwanda', certifiedMarketplace: 'Soko lililothibitishwa Rwanda' },
  settings: { title: 'Mipangilio', account: 'Akaunti', preferences: 'Mapendeleo', support: 'Msaada', app: 'Programu', legal: 'Kisheria', danger: 'Eneo la hatari', verification: 'Uthibitishaji na uaminifu', savedSearches: 'Utafutaji uliohifadhiwa', push: 'Arifa za programu', language: 'Lugha', checkUpdates: 'Angalia masasisho', whatsapp: 'Wasiliana nasi WhatsApp', call: 'Tupigie simu', email: 'Tutumie barua pepe', replay: 'Rudia utangulizi', privacy: 'Sera ya faragha', terms: 'Masharti ya huduma', directDeal: 'Ilani ya biashara ya moja kwa moja', delete: 'Futa akaunti yangu', deleteHint: 'Ni ya kudumu. Data yako itafutwa.', verified: 'Imethibitishwa', underReview: 'Inakaguliwa', actionNeeded: 'Hatua inahitajika', notVerified: 'Haijathibitishwa' },
  home: { location: 'Mahali', kigali: 'Kigali, Rwanda', buy: 'Nunua', rent: 'Kukodisha', offlineTitle: 'Hatukuweza kufikia Sawa Cars', offlineSub: 'Angalia muunganisho wako kuona matangazo mapya.', search: 'Tafuta chapa, modeli, aina…', searchRentals: 'Tafuta magari ya kukodisha…', rentalInquiry: 'Ombi la kukodisha linaendelea', certifiedRentals: 'Magari ya kukodisha yaliyothibitishwa', certifiedRentalsSub: 'Magari ya kuaminika kwa kila safari.', topDeals: 'Ofa bora', topDealsSub: 'Zimechaguliwa na timu yetu · telezesha', certifyCar: 'Thibitisha gari langu', importDuty: 'Ushuru wa kuagiza', financing: 'Ufadhili', compare: 'Linganisha', showroom: 'Sawa Center', onDisplay: 'Yanaonyeshwa Nyarutarama wiki hii', carsInShowroom: 'Magari {{count}} kwenye showroom', all: 'Yote', imported: 'Yaliyoagizwa', local: 'Ya ndani', evHybrid: 'EV·Hybrid', fresh: 'Mapya wiki hii', popular: 'Maarufu karibu nawe', browseAll: 'Angalia magari yote', ourPromise: 'Ahadi yetu', aboutUs: 'Kuhusu sisi', login: 'Ingia', copyright: '© 2026 Sawa Cars. Haki zote zimehifadhiwa.' },
  filters: { filters: 'Vichujio', clear: 'Futa vichujio vyote', apply: 'Angalia magari', noResults: 'Hakuna magari yaliyopatikana', adjust: 'Rekebisha utafutaji au ondoa vichujio' },
};

const KO = {
  common: { back: '뒤로', close: '닫기', cancel: '취소', save: '저장', search: '검색', signIn: '로그인', register: '회원가입', logout: '로그아웃', next: '다음', skip: '건너뛰기', getStarted: '시작하기', loading: '로드 중…', retry: '다시 시도', language: '언어', done: '완료', settings: '설정', home: '홈', buy: '구매', rent: '렌트', sell: '판매', profile: '프로필', menu: '메뉴' },
  language: { title: '언어를 선택하세요', subtitle: '설정에서 언제든지 변경할 수 있습니다.', current: '현재 언어', saved: '언어가 변경되었습니다', restartHint: '선택한 언어는 이 기기에 저장되며 즉시 적용됩니다.' },
  welcome: { title: '르완다에서\n가장 신뢰받는\n자동차 마켓플레이스.', subtitle: '품질 좋은 차량. 합리적인 가격.\n완벽한 안심.', trusted: '신뢰', trustedSub: '모든 차량은\n검사를 받습니다', fairPrices: '합리적인 가격', fairPricesSub: '당신의 돈을 위한\n최고의 가치', directContact: '직접 연락', directContactSub: '판매자와 직접\n거래하세요', exploreCars: '차량 둘러보기', sellCar: '내 차량 판매', alreadyAccount: '이미 계정이 있으신가요?', termsPrefix: '계속하면 다음에 동의하게 됩니다:', terms: '이용약관', privacy: '개인정보 보호정책' },
  onboarding: { inspectTitle: '모든 차량을 검사합니다', inspectSub: '150개 항목의 인증 검사.', photosTitle: '실제 사진, 실제 사양', photosSub: 'Sawa 팀이 직접 촬영합니다.', trustTitle: '인증된 판매자와 연락하세요', trustSub: '직접 합의하고 거래하세요.', updateChoice: 'Sawa Cars를 자동으로 최신 상태로 유지합니다. 새 버전은 앱을 다음에 열 때 설치되며 사용 중에는 설치되지 않습니다.' },
  drawer: { buyCar: '차량 구매', browseAll: '모든 차량 보기', savedCars: '저장한 차량', compareCars: '차량 비교', rent: '렌트', browseRentals: '렌트 차량 보기', rentalInquiries: '렌트 문의', financeServices: '금융 및 서비스', financing: '금융 계산기', importDuty: '수입 관세', imports: '내 수입 차량', sellCar: '차량 판매', verifyIdentity: '신원 인증', submitCar: '내 차량 등록', submissions: '내 등록 내역', analytics: '판매자 분석', trustScore: '내 신뢰 점수', trustSafety: '신뢰 및 안전', notifications: '알림', marketplaceSafety: '마켓플레이스 안전', teamPortal: '팀 포털', version: 'Sawa Cars v1.0 · Kigali, Rwanda', certifiedMarketplace: '르완다 인증 마켓플레이스' },
  settings: { title: '설정', account: '계정', preferences: '환경설정', support: '지원', app: '앱', legal: '법률', danger: '위험 영역', verification: '인증 및 신뢰', savedSearches: '저장된 검색', push: '푸시 알림', language: '언어', checkUpdates: '업데이트 확인', whatsapp: 'WhatsApp 문의', call: '전화하기', email: '이메일 보내기', replay: '소개 다시 보기', privacy: '개인정보 보호정책', terms: '서비스 약관', directDeal: '직접 거래 안내', delete: '내 계정 삭제', deleteHint: '영구 삭제됩니다. 데이터가 지워집니다.', verified: '인증됨', underReview: '검토 중', actionNeeded: '조치 필요', notVerified: '인증되지 않음' },
  home: { location: '위치', kigali: 'Kigali, Rwanda', buy: '구매', rent: '렌트', offlineTitle: 'Sawa Cars에 연결할 수 없습니다', offlineSub: '최신 매물을 보려면 연결을 확인하세요.', search: '브랜드, 모델, 유형 검색…', searchRentals: '렌트 차량 검색…', rentalInquiry: '렌트 문의 진행 중', certifiedRentals: '인증된 렌트 차량', certifiedRentalsSub: '모든 여정에 믿을 수 있는 차량.', topDeals: '추천 매물', topDealsSub: '팀이 선정 · 더 보려면 넘기세요', certifyCar: '내 차량 인증', importDuty: '수입 관세', financing: '금융', compare: '비교', showroom: 'Sawa Center', onDisplay: '이번 주 Nyarutarama에 전시 중', carsInShowroom: '쇼룸 차량 {{count}}대', all: '전체', imported: '수입', local: '현지', evHybrid: 'EV·하이브리드', fresh: '이번 주 신규', popular: '내 주변 인기 차량', browseAll: '모든 차량 보기', ourPromise: '우리의 약속', aboutUs: '회사 소개', login: '로그인', copyright: '© 2026 Sawa Cars. All rights reserved.' },
  filters: { filters: '필터', clear: '필터 모두 지우기', apply: '차량 보기', noResults: '차량을 찾을 수 없습니다', adjust: '검색을 변경하거나 필터를 제거해 보세요' },
};

const ZH = {
  common: {
    back: '返回', close: '关闭', cancel: '取消', save: '保存', search: '搜索',
    signIn: '登录', register: '注册', logout: '退出登录', next: '下一步',
    skip: '跳过', getStarted: '开始使用', loading: '加载中…', retry: '重试',
    language: '语言', done: '完成', settings: '设置', home: '首页',
    buy: '购买', rent: '租赁', sell: '出售', profile: '个人资料', menu: '菜单',
  },
  language: {
    title: '选择您的语言',
    subtitle: '您可以随时在设置中更改。',
    current: '当前语言',
    saved: '语言已更新',
    restartHint: '您的选择已保存在此设备上，并会立即生效。',
  },
  welcome: {
    title: '卢旺达\n最值得信赖的\n汽车市场。',
    subtitle: '优质车辆，公平价格。\n安心无忧。',
    trusted: '值得信赖', trustedSub: '每辆车都\n经过检测',
    fairPrices: '价格公道', fairPricesSub: '物超所值',
    directContact: '直接联系', directContactSub: '与卖家\n直接交易',
    exploreCars: '浏览车辆', sellCar: '出售您的车辆',
    alreadyAccount: '已有账户？',
    termsPrefix: '继续即表示您同意我们的', terms: '条款', privacy: '隐私政策',
  },
  onboarding: {
    inspectTitle: '每辆车都经过检测', inspectSub: '150项认证检查。',
    photosTitle: '真实照片，真实规格', photosSub: '由我们团队拍摄。',
    trustTitle: '联系已验证的卖家', trustSub: '直接协商并完成交易。',
    updateChoice: '让 Sawa Cars 自动保持最新。新版本会在您下次打开应用时安装——绝不会在您使用过程中安装。',
  },
  drawer: {
    buyCar: '购买车辆', browseAll: '浏览所有车辆', savedCars: '收藏的车辆', compareCars: '比较车辆',
    rent: '租赁', browseRentals: '浏览租车', rentalInquiries: '租车咨询',
    financeServices: '金融与服务', financing: '贷款计算器', importDuty: '进口关税', imports: '我的进口车辆',
    sellCar: '出售车辆', verifyIdentity: '身份验证', submitCar: '提交我的车辆', submissions: '我的提交记录', analytics: '卖家分析', trustScore: '我的信誉评分',
    trustSafety: '信任与安全', notifications: '通知', marketplaceSafety: '市场安全',
    teamPortal: '团队门户', version: 'Sawa Cars v1.0 · 基加利，卢旺达', certifiedMarketplace: '卢旺达认证市场',
  },
  settings: {
    title: '设置', account: '账户', preferences: '偏好设置', support: '支持', app: '应用', legal: '法律', danger: '危险区域',
    verification: '验证与信任', savedSearches: '已保存的搜索', push: '推送通知',
    language: '语言', checkUpdates: '检查更新', whatsapp: '通过WhatsApp联系我们', call: '致电我们', email: '给我们发邮件', replay: '重新观看介绍',
    privacy: '隐私政策', terms: '服务条款', directDeal: '直接交易须知', delete: '删除我的账户', deleteHint: '此操作不可撤销，您的数据将被永久删除。',
    verified: '已验证', underReview: '审核中', actionNeeded: '需要处理', notVerified: '未验证',
  },
  home: {
    location: '位置', kigali: '基加利，卢旺达', buy: '购买', rent: '租赁',
    offlineTitle: '无法连接到 Sawa Cars', offlineSub: '请检查网络连接以查看最新车源。',
    search: '搜索品牌、型号、类型…', searchRentals: '搜索租赁车辆…', rentalInquiry: '租车咨询处理中',
    certifiedRentals: '认证租赁车辆', certifiedRentalsSub: '每一次出行都可靠的车辆。',
    topDeals: '精选优惠', topDealsSub: '由我们团队精选 · 左右滑动查看更多',
    certifyCar: '认证我的车辆', importDuty: '进口关税', financing: '贷款', compare: '比较',
    showroom: 'Sawa 展厅', onDisplay: '本周在尼亚鲁塔拉马展出', carsInShowroom: '展厅内有 {{count}} 辆车',
    all: '全部', imported: '进口车', local: '本地车', evHybrid: '电动·混动',
    fresh: '本周新上架', popular: '附近热门', browseAll: '浏览所有车辆',
    ourPromise: '我们的承诺', aboutUs: '关于我们', login: '登录', copyright: '© 2026 Sawa Cars. 保留所有权利。',
  },
  filters: { filters: '筛选', clear: '清除所有筛选', apply: '查看车辆', noResults: '未找到车辆', adjust: '请尝试调整搜索条件或清除筛选' },
};

const EXTRA_SETTINGS = {
  en: { closeAccount: 'Close my account', closeHint: 'Takes effect straight away. Erased for good after {{days}} days.', closeWhy: 'Why are you closing your account? It genuinely changes what we fix next.', closeNote: 'Anything else? (optional)', password: 'Your password', autoUpdate: 'Install updates automatically', autoUpdateOn: 'New versions will install the next time you open the app.', autoUpdateOff: 'You will be asked before a new version is installed.', pushError: 'Push could not be enabled. Check notification permissions in your phone settings.', wrongPassword: 'That password is not correct.', networkError: "We couldn't reach Sawa Cars. Check your connection and try again.", genericError: 'Something went wrong. Please try again.' },
  rw: { closeAccount: 'Funga konti yanjye', closeHint: 'Bihita bitangira. Izahanagurwa burundu nyuma y’iminsi {{days}}.', closeWhy: 'Kuki ufunga konti yawe? Igisubizo cyawe kidufasha kunoza serivisi.', closeNote: 'Hari ikindi? (si ngombwa)', password: 'Ijambo ry’ibanga', autoUpdate: 'Shyiraho ivugurura ryikora', autoUpdateOn: 'Verisiyo nshya izashyirwaho igihe wongeye gufungura porogaramu.', autoUpdateOff: 'Uzabazwa mbere y’uko verisiyo nshya ishyirwaho.', pushError: 'Ntabwo imenyesha ryakoreshejwe. Reba uburenganzira bw’imenyesha muri telefoni.', wrongPassword: 'Iryo jambo ry’ibanga si ryo.', networkError: 'Ntidushoboye kugera kuri Sawa Cars. Reba umurongo wa interineti wongere ugerageze.', genericError: 'Hari ikitagenda. Ongera ugerageze.' },
  fr: { closeAccount: 'Fermer mon compte', closeHint: 'Prend effet immédiatement. Effacement définitif après {{days}} jours.', closeWhy: 'Pourquoi fermez-vous votre compte ? Votre réponse nous aide à progresser.', closeNote: 'Autre chose ? (facultatif)', password: 'Votre mot de passe', autoUpdate: 'Installer automatiquement les mises à jour', autoUpdateOn: 'Les nouvelles versions s’installeront à votre prochaine ouverture.', autoUpdateOff: 'Une confirmation vous sera demandée avant l’installation.', pushError: 'Les notifications push ne peuvent pas être activées. Vérifiez les autorisations.', wrongPassword: 'Ce mot de passe est incorrect.', networkError: 'Sawa Cars est inaccessible. Vérifiez votre connexion et réessayez.', genericError: 'Une erreur est survenue. Réessayez.' },
  sw: { closeAccount: 'Funga akaunti yangu', closeHint: 'Inaanza mara moja. Data itafutwa kabisa baada ya siku {{days}}.', closeWhy: 'Kwa nini unafunga akaunti yako? Jibu lako hutusaidia kuboresha.', closeNote: 'Kuna kingine? (si lazima)', password: 'Nenosiri lako', autoUpdate: 'Sakinisha masasisho kiotomatiki', autoUpdateOn: 'Matoleo mapya yatawekwa unapofungua programu tena.', autoUpdateOff: 'Utaulizwa kabla ya toleo jipya kuwekwa.', pushError: 'Arifa hazikuwezeshwa. Angalia ruhusa za arifa kwenye simu yako.', wrongPassword: 'Nenosiri hilo si sahihi.', networkError: 'Hatukuweza kufikia Sawa Cars. Angalia muunganisho na ujaribu tena.', genericError: 'Kuna tatizo. Jaribu tena.' },
  ko: { closeAccount: '내 계정 닫기', closeHint: '즉시 적용되며 {{days}}일 후 데이터가 완전히 삭제됩니다.', closeWhy: '계정을 닫는 이유가 무엇인가요? 답변은 서비스 개선에 도움이 됩니다.', closeNote: '추가 의견 (선택사항)', password: '비밀번호', autoUpdate: '업데이트 자동 설치', autoUpdateOn: '앱을 다음에 열 때 새 버전이 설치됩니다.', autoUpdateOff: '새 버전을 설치하기 전에 확인을 요청합니다.', pushError: '푸시 알림을 켤 수 없습니다. 휴대폰 알림 권한을 확인하세요.', wrongPassword: '비밀번호가 올바르지 않습니다.', networkError: 'Sawa Cars에 연결할 수 없습니다. 연결을 확인하고 다시 시도하세요.', genericError: '문제가 발생했습니다. 다시 시도하세요.' },
  zh: { closeAccount: '注销我的账户', closeHint: '立即生效。{{days}} 天后将被永久删除。', closeWhy: '您为什么要注销账户？您的答案能真正帮助我们改进。', closeNote: '还有其他想说的吗？（可选）', password: '您的密码', autoUpdate: '自动安装更新', autoUpdateOn: '新版本将在您下次打开应用时安装。', autoUpdateOff: '安装新版本前会先询问您。', pushError: '无法启用推送通知。请检查手机设置中的通知权限。', wrongPassword: '密码不正确。', networkError: '无法连接到 Sawa Cars。请检查网络连接后重试。', genericError: '出现问题，请重试。' },
};

// High-frequency marketplace copy lives here so the first localized pass can
// cover browsing without changing the shape of the catalogue data returned by
// the API. Listing titles, makes and seller-provided text remain untouched.
const EXTRA_HOME = {
  en: {
    trying: 'Trying…', safariReady: 'Safari-ready', suv: 'SUV', sedan: 'Sedan', truck: 'Truck',
    safari4x4s: 'Safari-ready 4×4s', availableKigali: 'Available in Kigali',
    showrooms: 'Showrooms', showroomCarsView: '{{count}} cars · view the collection',
    recentlyViewed: 'Recently viewed', moreLikeSaved: 'More like your saved cars', saved: 'Saved', more: 'More',
    bannerCertifiedBrand: 'Sawa Certified', bannerCertifiedTagline: 'Every car inspected before listing. No exceptions.', bannerCertifiedTag: 'Trust',
    bannerInspectionBrand: '150-Point Check', bannerInspectionTagline: 'Certified mechanics. Full report before you buy.', bannerInspectionTag: 'Inspection',
    bannerSellBrand: 'Certify Your Car', bannerSellTagline: 'Submit for our 150-point inspection. We list it for you.', bannerSellTag: 'Sell',
    providerContacted: 'provider contacted', awaitingProvider: 'awaiting provider reply', inspected: '{{score}}/150 inspected', perDay: '/day', seats: 'seats', trips: 'trips', belowMarket: '{{percent}}% below market', highDemand: 'High demand', saveCar: 'Save {{title}}', removeSaved: 'Remove {{title}} from saved',
    carsCount: '{{label}} · {{count}} cars', unavailableUntil: 'Unavailable until {{date}}',
  },
  rw: {
    trying: 'Biragerageza…', safariReady: 'Yiteguye safari', suv: 'SUV', sedan: 'Sedani', truck: 'Ikamyo',
    safari4x4s: '4×4 ziteguye safari', availableKigali: 'Ziboneka i Kigali', showrooms: 'Showroom',
    showroomCarsView: 'Imodoka {{count}} · reba urutonde', recentlyViewed: 'Waherukaga kureba', moreLikeSaved: 'Zisa n’izo wabikiye', saved: 'Zabitswe', more: 'Ibindi',
    bannerCertifiedBrand: 'Sawa yemeje', bannerCertifiedTagline: 'Buri modoka isuzumwa mbere yo gushyirwa ku isoko.', bannerCertifiedTag: 'Icyizere',
    bannerInspectionBrand: 'Isuzuma ry’ingingo 150', bannerInspectionTagline: 'Abakanishi bemewe. Raporo yuzuye mbere yo kugura.', bannerInspectionTag: 'Isuzuma',
    bannerSellBrand: 'Emeza imodoka yawe', bannerSellTagline: 'Tanga imodoka yawe isuzumwe ingingo 150. Turayishyira ku isoko.', bannerSellTag: 'Gurisha',
    providerContacted: 'uwatanga imodoka yavugishijwe', awaitingProvider: 'dutegereje igisubizo', inspected: 'Isuzumwe {{score}}/150', perDay: '/umunsi', seats: 'imyanya', trips: 'ingendo', belowMarket: '{{percent}}% munsi y’isoko', highDemand: 'Irasabwa cyane', saveCar: 'Bika {{title}}', removeSaved: 'Kuraho {{title}} mu zabitswe', carsCount: '{{label}} · imodoka {{count}}', unavailableUntil: 'Ntiboneka kugeza {{date}}',
  },
  fr: {
    trying: 'Tentative…', safariReady: 'Prêt pour le safari', suv: 'SUV', sedan: 'Berline', truck: 'Pick-up',
    safari4x4s: '4×4 prêts pour le safari', availableKigali: 'Disponibles à Kigali', showrooms: 'Showrooms',
    showroomCarsView: '{{count}} voitures · voir la collection', recentlyViewed: 'Vus récemment', moreLikeSaved: 'Similaires à vos favoris', saved: 'Enregistrés', more: 'Plus',
    bannerCertifiedBrand: 'Sawa certifié', bannerCertifiedTagline: 'Chaque voiture est inspectée avant sa mise en ligne.', bannerCertifiedTag: 'Confiance',
    bannerInspectionBrand: 'Contrôle en 150 points', bannerInspectionTagline: 'Mécaniciens certifiés. Rapport complet avant l’achat.', bannerInspectionTag: 'Inspection',
    bannerSellBrand: 'Certifiez votre voiture', bannerSellTagline: 'Soumettez-la à notre contrôle en 150 points. Nous la mettons en ligne.', bannerSellTag: 'Vendre',
    providerContacted: 'prestataire contacté', awaitingProvider: 'en attente de réponse', inspected: '{{score}}/150 inspectés', perDay: '/jour', seats: 'places', trips: 'trajets', belowMarket: '{{percent}}% sous le marché', highDemand: 'Forte demande', saveCar: 'Enregistrer {{title}}', removeSaved: 'Retirer {{title}} des favoris', carsCount: '{{label}} · {{count}} voitures', unavailableUntil: 'Indisponible jusqu’au {{date}}',
  },
  sw: {
    trying: 'Inajaribu…', safariReady: 'Tayari kwa safari', suv: 'SUV', sedan: 'Sedani', truck: 'Lori',
    safari4x4s: '4×4 tayari kwa safari', availableKigali: 'Zinapatikana Kigali', showrooms: 'Vyumba vya maonyesho',
    showroomCarsView: 'Magari {{count}} · tazama mkusanyiko', recentlyViewed: 'Uliyotazama hivi karibuni', moreLikeSaved: 'Yanayofanana na uliyohifadhi', saved: 'Yaliyohifadhiwa', more: 'Zaidi',
    bannerCertifiedBrand: 'Sawa Imethibitishwa', bannerCertifiedTagline: 'Kila gari linakaguliwa kabla ya kutangazwa.', bannerCertifiedTag: 'Uaminifu',
    bannerInspectionBrand: 'Ukaguzi wa pointi 150', bannerInspectionTagline: 'Mafundi waliothibitishwa. Ripoti kamili kabla ya kununua.', bannerInspectionTag: 'Ukaguzi',
    bannerSellBrand: 'Thibitisha gari lako', bannerSellTagline: 'Wasilisha gari lako kwa ukaguzi wa pointi 150. Tutaliweka sokoni.', bannerSellTag: 'Uza',
    providerContacted: 'mtoa huduma amewasilishwa', awaitingProvider: 'inasubiri jibu', inspected: 'Limekaguliwa {{score}}/150', perDay: '/siku', seats: 'viti', trips: 'safari', belowMarket: '{{percent}}% chini ya soko', highDemand: 'Mahitaji makubwa', saveCar: 'Hifadhi {{title}}', removeSaved: 'Ondoa {{title}} kwenye yaliyohifadhiwa', carsCount: '{{label}} · magari {{count}}', unavailableUntil: 'Haipatikani hadi {{date}}',
  },
  ko: {
    trying: '시도 중…', safariReady: '사파리 준비 완료', suv: 'SUV', sedan: '세단', truck: '트럭',
    safari4x4s: '사파리용 4×4', availableKigali: '키갈리에서 이용 가능', showrooms: '쇼룸',
    showroomCarsView: '차량 {{count}}대 · 컬렉션 보기', recentlyViewed: '최근 본 차량', moreLikeSaved: '저장한 차량과 비슷한 차량', saved: '저장됨', more: '더 보기',
    bannerCertifiedBrand: 'Sawa 인증', bannerCertifiedTagline: '모든 차량은 등록 전에 검사를 받습니다.', bannerCertifiedTag: '신뢰',
    bannerInspectionBrand: '150개 항목 검사', bannerInspectionTagline: '인증 정비사가 구매 전에 전체 보고서를 제공합니다.', bannerInspectionTag: '검사',
    bannerSellBrand: '내 차량 인증', bannerSellTagline: '150개 항목 검사를 신청하면 차량을 등록해 드립니다.', bannerSellTag: '판매',
    providerContacted: '제공자에게 연락함', awaitingProvider: '제공자 답변 대기 중', inspected: '{{score}}/150 검사 완료', perDay: '/일', seats: '좌석', trips: '회 운행', belowMarket: '시장가보다 {{percent}}% 저렴', highDemand: '인기 차량', saveCar: '{{title}} 저장', removeSaved: '{{title}} 저장 취소', carsCount: '{{label}} · 차량 {{count}}대', unavailableUntil: '{{date}}까지 이용 불가',
  },
  zh: {
    trying: '正在尝试…', safariReady: '适合越野', suv: 'SUV', sedan: '轿车', truck: '皮卡',
    safari4x4s: '适合越野的四驱车', availableKigali: '基加利有售', showrooms: '展厅',
    showroomCarsView: '{{count}} 辆车 · 查看展厅', recentlyViewed: '最近浏览', moreLikeSaved: '与您收藏车辆相似', saved: '已收藏', more: '更多',
    bannerCertifiedBrand: 'Sawa 认证', bannerCertifiedTagline: '每辆车在上架前都经过检测，绝无例外。', bannerCertifiedTag: '信任',
    bannerInspectionBrand: '150项检测', bannerInspectionTagline: '认证技师检测，购车前提供完整报告。', bannerInspectionTag: '检测',
    bannerSellBrand: '认证您的车辆', bannerSellTagline: '提交车辆接受150项检测，我们为您上架。', bannerSellTag: '出售',
    providerContacted: '已联系提供方', awaitingProvider: '等待提供方回复', inspected: '已检测 {{score}}/150', perDay: '/天', seats: '座', trips: '次行程', belowMarket: '低于市场价 {{percent}}%', highDemand: '热门抢购', saveCar: '收藏 {{title}}', removeSaved: '取消收藏 {{title}}', carsCount: '{{label}} · {{count}} 辆车', unavailableUntil: '至 {{date}} 前不可用',
  },
};

const EXTRA_FILTERS = {
  en: { price: 'Price', anyPrice: 'Any price', underPrice: 'Under RWF {{amount}}', minimumPrice: 'Minimum price', noMinimum: 'No minimum', minPrice: 'RWF {{amount}}M+', year: 'Year', anyYear: 'Any year', newer: '{{year}} or newer', mileage: 'Mileage', anyMileage: 'Any mileage', underMileage: 'Under {{mileage}} km', inspectionScore: 'Inspection score', anyScore: 'Any score', scorePlus: '{{score}}+ / 150', make: 'Make', location: 'Location', bodyType: 'Body type', fuelType: 'Fuel type', transmission: 'Transmission', standardNote: 'Public listings pass the configured seller, inspection and image publication checks. Inspection evidence is not a transaction warranty.', reset: 'Reset', viewCount: 'View {{count}} cars' },
  rw: { price: 'Igiciro', anyPrice: 'Igiciro icyo ari cyo cyose', underPrice: 'Munsi ya RWF {{amount}}', minimumPrice: 'Igiciro gito', noMinimum: 'Nta gipimo gito', minPrice: 'RWF {{amount}}M kuzamura', year: 'Umwaka', anyYear: 'Umwaka uwo ari wo wose', newer: '{{year}} cyangwa nyuma', mileage: 'Intera yakozwe', anyMileage: 'Intera iyo ari yo yose', underMileage: 'Munsi ya {{mileage}} km', inspectionScore: 'Amanota y’isuzuma', anyScore: 'Amanota ayo ari yo yose', scorePlus: '{{score}}+ / 150', make: 'Ikirango', location: 'Aho biherereye', bodyType: 'Ubwoko bw’umubiri', fuelType: 'Ubwoko bwa lisansi', transmission: 'Gearbox', standardNote: 'Imodoka ziri ku isoko zigenzurwa n’umugurisha, isuzuma n’amafoto. Raporo y’isuzuma si garanti y’ubucuruzi.', reset: 'Subiramo', viewCount: 'Reba imodoka {{count}}' },
  fr: { price: 'Prix', anyPrice: 'Tous les prix', underPrice: 'Moins de {{amount}} RWF', minimumPrice: 'Prix minimum', noMinimum: 'Sans minimum', minPrice: '{{amount}} M RWF+', year: 'Année', anyYear: 'Toutes les années', newer: '{{year}} ou plus récente', mileage: 'Kilométrage', anyMileage: 'Tout kilométrage', underMileage: 'Moins de {{mileage}} km', inspectionScore: 'Score d’inspection', anyScore: 'Tous les scores', scorePlus: '{{score}}+ / 150', make: 'Marque', location: 'Lieu', bodyType: 'Carrosserie', fuelType: 'Carburant', transmission: 'Transmission', standardNote: 'Les annonces publiques passent les contrôles vendeur, inspection et publication des images. Le rapport d’inspection n’est pas une garantie de transaction.', reset: 'Réinitialiser', viewCount: 'Voir {{count}} voitures' },
  sw: { price: 'Bei', anyPrice: 'Bei yoyote', underPrice: 'Chini ya RWF {{amount}}', minimumPrice: 'Bei ya chini', noMinimum: 'Hakuna kiwango cha chini', minPrice: 'RWF {{amount}}M+', year: 'Mwaka', anyYear: 'Mwaka wowote', newer: '{{year}} au mpya zaidi', mileage: 'Umbali', anyMileage: 'Umbali wowote', underMileage: 'Chini ya {{mileage}} km', inspectionScore: 'Alama ya ukaguzi', anyScore: 'Alama yoyote', scorePlus: '{{score}}+ / 150', make: 'Chapa', location: 'Mahali', bodyType: 'Aina ya mwili', fuelType: 'Aina ya mafuta', transmission: 'Gearbox', standardNote: 'Matangazo ya umma hupitia ukaguzi wa muuzaji, gari na picha. Ushahidi wa ukaguzi si dhamana ya muamala.', reset: 'Weka upya', viewCount: 'Angalia magari {{count}}' },
  ko: { price: '가격', anyPrice: '모든 가격', underPrice: 'RWF {{amount}} 미만', minimumPrice: '최저 가격', noMinimum: '최저 없음', minPrice: 'RWF {{amount}}M 이상', year: '연식', anyYear: '모든 연식', newer: '{{year}}년 이상', mileage: '주행거리', anyMileage: '주행거리 무관', underMileage: '{{mileage}}km 미만', inspectionScore: '검사 점수', anyScore: '모든 점수', scorePlus: '{{score}}+ / 150', make: '제조사', location: '위치', bodyType: '차체 유형', fuelType: '연료 유형', transmission: '변속기', standardNote: '공개 매물은 판매자, 검사 및 이미지 게시 기준을 통과합니다. 검사 자료는 거래를 보증하지 않습니다.', reset: '초기화', viewCount: '{{count}}대 보기' },
  zh: { price: '价格', anyPrice: '不限价格', underPrice: '低于 {{amount}} 卢旺达法郎', minimumPrice: '最低价格', noMinimum: '无最低限制', minPrice: '{{amount}}百万卢旺达法郎以上', year: '年份', anyYear: '不限年份', newer: '{{year}} 年及以后', mileage: '里程', anyMileage: '不限里程', underMileage: '低于 {{mileage}} 公里', inspectionScore: '检测评分', anyScore: '不限评分', scorePlus: '{{score}}+ / 150', make: '品牌', location: '位置', bodyType: '车身类型', fuelType: '燃料类型', transmission: '变速箱', standardNote: '公开车源均通过卖家、检测及图片发布的审核。检测结果不构成交易担保。', reset: '重置', viewCount: '查看 {{count}} 辆车' },
};

const EXTRA_SEARCH = {
  en: { back: 'Go back', clearSearch: 'Clear search', filterButton: 'Filters', carsFound: '{{count}} cars found', rentalsFound: '{{count}} rentals found', plusCars: '{{count}}+ cars', saveSearch: 'Save search', savedToast: "Search saved — we'll notify you when new matching cars are listed.", allCars: 'All cars', everyMatch: "That's every match on Sawa Cars right now.", bestMatch: 'Best match', priceLow: 'Price ↑', priceHigh: 'Price ↓', newest: 'Newest', mileage: 'Mileage', showList: 'Show results as a list', showGrid: 'Show results as a grid' },
  rw: { back: 'Subira inyuma', clearSearch: 'Siba ibyo washakishije', filterButton: 'Akayunguruzo', carsFound: 'Habonetse imodoka {{count}}', rentalsFound: 'Habonetse izikodeshwa {{count}}', plusCars: 'Imodoka {{count}}+', saveSearch: 'Bika ubushakashatsi', savedToast: 'Ubushakashatsi bwabitswe — tuzakumenyesha imodoka nshya zihuye nabwo.', allCars: 'Imodoka zose', everyMatch: 'Izi ni zo modoka zose zihuye na byo kuri Sawa Cars ubu.', bestMatch: 'Ihura neza', priceLow: 'Igiciro ↑', priceHigh: 'Igiciro ↓', newest: 'Nshya', mileage: 'Intera', showList: 'Erekana nk’urutonde', showGrid: 'Erekana nka grille' },
  fr: { back: 'Retour', clearSearch: 'Effacer la recherche', filterButton: 'Filtres', carsFound: '{{count}} voitures trouvées', rentalsFound: '{{count}} locations trouvées', plusCars: '{{count}}+ voitures', saveSearch: 'Enregistrer la recherche', savedToast: 'Recherche enregistrée — nous vous préviendrons des nouvelles annonces correspondantes.', allCars: 'Toutes les voitures', everyMatch: 'Voici toutes les annonces correspondantes sur Sawa Cars.', bestMatch: 'Pertinence', priceLow: 'Prix ↑', priceHigh: 'Prix ↓', newest: 'Plus récentes', mileage: 'Kilométrage', showList: 'Afficher en liste', showGrid: 'Afficher en grille' },
  sw: { back: 'Rudi', clearSearch: 'Futa utafutaji', filterButton: 'Vichujio', carsFound: 'Magari {{count}} yamepatikana', rentalsFound: 'Magari ya kukodisha {{count}} yamepatikana', plusCars: 'Magari {{count}}+', saveSearch: 'Hifadhi utafutaji', savedToast: 'Utafutaji umehifadhiwa — tutakujulisha matangazo mapya yanayolingana.', allCars: 'Magari yote', everyMatch: 'Haya ndiyo matangazo yote yanayolingana kwa sasa Sawa Cars.', bestMatch: 'Yanayofaa zaidi', priceLow: 'Bei ↑', priceHigh: 'Bei ↓', newest: 'Mapya zaidi', mileage: 'Umbali', showList: 'Onyesha kama orodha', showGrid: 'Onyesha kama gridi' },
  ko: { back: '뒤로', clearSearch: '검색 지우기', filterButton: '필터', carsFound: '{{count}}대 검색됨', rentalsFound: '{{count}}대 렌트 검색됨', plusCars: '{{count}}대 이상', saveSearch: '검색 저장', savedToast: '검색이 저장되었습니다 — 새 매물이 등록되면 알려드리겠습니다.', allCars: '모든 차량', everyMatch: '현재 Sawa Cars의 모든 검색 결과입니다.', bestMatch: '추천순', priceLow: '가격 ↑', priceHigh: '가격 ↓', newest: '최신순', mileage: '주행거리', showList: '목록으로 보기', showGrid: '격자로 보기' },
  zh: { back: '返回', clearSearch: '清除搜索', filterButton: '筛选', carsFound: '找到 {{count}} 辆车', rentalsFound: '找到 {{count}} 辆租赁车', plusCars: '{{count}}+ 辆车', saveSearch: '保存搜索', savedToast: '搜索已保存——有符合条件的新车源上架时我们会通知您。', allCars: '所有车辆', everyMatch: '这是 Sawa Cars 目前所有符合条件的车辆。', bestMatch: '最佳匹配', priceLow: '价格 ↑', priceHigh: '价格 ↓', newest: '最新', mileage: '里程', showList: '以列表显示结果', showGrid: '以网格显示结果' },
};

const EXTRA_AUTH = {
  en: { signInTitle: 'Welcome back', signInSub: 'Sign in to continue to Sawa Cars.', createTitle: 'Create account', createSub: 'Buy, save and message sellers on Sawa Cars.', email: 'Email', validEmail: 'Please enter a valid email address.', password: 'Password', passwordMin: 'Password must be at least 6 characters.', forgot: 'Forgot?', enterPassword: 'Enter your password', hidePassword: 'Hide password', showPassword: 'Show password', signIn: 'Sign in', noAccount: "Don't have an account?", signUp: 'Sign up', fullName: 'Full name', namePlaceholder: 'Alex Morgan', nameRequired: 'Please enter your full name.', passwordPlaceholder: 'At least 6 characters', createAccount: 'Create account', termsPrefix: 'By creating an account you agree to our', terms: 'Terms', privacy: 'Privacy Policy', alreadyAccount: 'Already have an account?', accountClosed: 'This account is closed', accountClosedMessage: 'You closed it, and nothing has been erased. Reopen it and your saved cars, messages and listings come back.', accountClosedUntil: 'After {{date}} it is deleted for good.', reopen: 'Reopen my account', notNow: 'Not now', welcomeBack: 'Welcome back. Your account is open again.', reopenError: 'Could not reopen this account.', invalidCredentials: 'Invalid email or password.', createError: 'Could not create your account. Please try again.' },
  rw: { signInTitle: 'Murakaza neza', signInSub: 'Injira ukomeze kuri Sawa Cars.', createTitle: 'Fungura konti', createSub: 'Gura, bika kandi wandikire abagurisha kuri Sawa Cars.', email: 'Imeyili', validEmail: 'Andika imeyili iboneye.', password: 'Ijambo ry’ibanga', passwordMin: 'Ijambo ry’ibanga rigomba kugira inyuguti nibura 6.', forgot: 'Waribagiwe?', enterPassword: 'Andika ijambo ry’ibanga', hidePassword: 'Hisha ijambo ry’ibanga', showPassword: 'Erekana ijambo ry’ibanga', signIn: 'Injira', noAccount: 'Ntabwo ufite konti?', signUp: 'Iyandikishe', fullName: 'Amazina yose', namePlaceholder: 'Alex Morgan', nameRequired: 'Andika amazina yawe yose.', passwordPlaceholder: 'Nibura inyuguti 6', createAccount: 'Fungura konti', termsPrefix: 'Mu gufungura konti wemera', terms: 'Amabwiriza', privacy: 'Politiki y’ibanga', alreadyAccount: 'Usanzwe ufite konti?', accountClosed: 'Iyi konti yarafunzwe', accountClosedMessage: 'Wayifunze, ariko amakuru ntiyahanaguwe. Yongera kuyifungura kugira ngo imodoka wabitse, ubutumwa n’amatangazo bigaruke.', accountClosedUntil: 'Nyuma ya {{date}} izahanagurwa burundu.', reopen: 'Ongera ufungure konti', notNow: 'Si ubu', welcomeBack: 'Murakaza neza. Konti yawe yongeye gufunguka.', reopenError: 'Konti ntiyafunguwe.', invalidCredentials: 'Imeyili cyangwa ijambo ry’ibanga si byo.', createError: 'Konti ntiyafunguwe. Ongera ugerageze.' },
  fr: { signInTitle: 'Bon retour', signInSub: 'Connectez-vous pour continuer sur Sawa Cars.', createTitle: 'Créer un compte', createSub: 'Achetez, enregistrez et échangez avec les vendeurs sur Sawa Cars.', email: 'E-mail', validEmail: 'Saisissez une adresse e-mail valide.', password: 'Mot de passe', passwordMin: 'Le mot de passe doit contenir au moins 6 caractères.', forgot: 'Oublié ?', enterPassword: 'Saisissez votre mot de passe', hidePassword: 'Masquer le mot de passe', showPassword: 'Afficher le mot de passe', signIn: 'Se connecter', noAccount: 'Vous n’avez pas de compte ?', signUp: 'S’inscrire', fullName: 'Nom complet', namePlaceholder: 'Alex Morgan', nameRequired: 'Saisissez votre nom complet.', passwordPlaceholder: 'Au moins 6 caractères', createAccount: 'Créer un compte', termsPrefix: 'En créant un compte, vous acceptez nos', terms: 'Conditions', privacy: 'Politique de confidentialité', alreadyAccount: 'Vous avez déjà un compte ?', accountClosed: 'Ce compte est fermé', accountClosedMessage: 'Vous l’avez fermé, mais rien n’a été effacé. Rouvrez-le pour retrouver vos favoris, messages et annonces.', accountClosedUntil: 'Après le {{date}}, il sera définitivement supprimé.', reopen: 'Rouvrir mon compte', notNow: 'Pas maintenant', welcomeBack: 'Bon retour. Votre compte est de nouveau ouvert.', reopenError: 'Impossible de rouvrir ce compte.', invalidCredentials: 'E-mail ou mot de passe invalide.', createError: 'Impossible de créer le compte. Réessayez.' },
  sw: { signInTitle: 'Karibu tena', signInSub: 'Ingia kuendelea kwenye Sawa Cars.', createTitle: 'Fungua akaunti', createSub: 'Nunua, hifadhi na tuma ujumbe kwa wauzaji kwenye Sawa Cars.', email: 'Barua pepe', validEmail: 'Weka anwani sahihi ya barua pepe.', password: 'Nenosiri', passwordMin: 'Nenosiri lazima liwe na angalau herufi 6.', forgot: 'Umesahau?', enterPassword: 'Weka nenosiri lako', hidePassword: 'Ficha nenosiri', showPassword: 'Onyesha nenosiri', signIn: 'Ingia', noAccount: 'Huna akaunti?', signUp: 'Jisajili', fullName: 'Jina kamili', namePlaceholder: 'Alex Morgan', nameRequired: 'Weka jina lako kamili.', passwordPlaceholder: 'Angalau herufi 6', createAccount: 'Fungua akaunti', termsPrefix: 'Kwa kufungua akaunti unakubali', terms: 'Masharti', privacy: 'Sera ya faragha', alreadyAccount: 'Una akaunti tayari?', accountClosed: 'Akaunti hii imefungwa', accountClosedMessage: 'Uliifunga, lakini hakuna kilichofutwa. Ifungue tena ili upate magari, ujumbe na matangazo uliyohifadhi.', accountClosedUntil: 'Baada ya {{date}} itafutwa kabisa.', reopen: 'Fungua akaunti yangu tena', notNow: 'Si sasa', welcomeBack: 'Karibu tena. Akaunti yako imefunguliwa.', reopenError: 'Akaunti haikuweza kufunguliwa.', invalidCredentials: 'Barua pepe au nenosiri si sahihi.', createError: 'Akaunti haikuweza kuundwa. Jaribu tena.' },
  ko: { signInTitle: '다시 오신 것을 환영합니다', signInSub: 'Sawa Cars를 계속 이용하려면 로그인하세요.', createTitle: '계정 만들기', createSub: 'Sawa Cars에서 차량을 구매하고 저장하고 판매자에게 문의하세요.', email: '이메일', validEmail: '올바른 이메일 주소를 입력하세요.', password: '비밀번호', passwordMin: '비밀번호는 6자 이상이어야 합니다.', forgot: '비밀번호를 잊으셨나요?', enterPassword: '비밀번호 입력', hidePassword: '비밀번호 숨기기', showPassword: '비밀번호 보기', signIn: '로그인', noAccount: '계정이 없으신가요?', signUp: '회원가입', fullName: '이름', namePlaceholder: 'Alex Morgan', nameRequired: '이름을 입력하세요.', passwordPlaceholder: '6자 이상', createAccount: '계정 만들기', termsPrefix: '계정을 만들면 다음에 동의하게 됩니다:', terms: '이용약관', privacy: '개인정보 보호정책', alreadyAccount: '이미 계정이 있으신가요?', accountClosed: '이 계정은 닫혀 있습니다', accountClosedMessage: '계정을 닫았지만 데이터는 삭제되지 않았습니다. 다시 열면 저장한 차량, 메시지와 매물이 복구됩니다.', accountClosedUntil: '{{date}} 후에는 영구 삭제됩니다.', reopen: '계정 다시 열기', notNow: '나중에', welcomeBack: '다시 오신 것을 환영합니다. 계정이 열렸습니다.', reopenError: '계정을 다시 열 수 없습니다.', invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다.', createError: '계정을 만들 수 없습니다. 다시 시도하세요.' },
  zh: { signInTitle: '欢迎回来', signInSub: '登录以继续使用 Sawa Cars。', createTitle: '创建账户', createSub: '在 Sawa Cars 上购买、收藏车辆并联系卖家。', email: '电子邮箱', validEmail: '请输入有效的电子邮箱地址。', password: '密码', passwordMin: '密码至少需要6个字符。', forgot: '忘记密码？', enterPassword: '输入您的密码', hidePassword: '隐藏密码', showPassword: '显示密码', signIn: '登录', noAccount: '还没有账户？', signUp: '注册', fullName: '姓名', namePlaceholder: 'Alex Morgan', nameRequired: '请输入您的姓名。', passwordPlaceholder: '至少6个字符', createAccount: '创建账户', termsPrefix: '创建账户即表示您同意我们的', terms: '条款', privacy: '隐私政策', alreadyAccount: '已有账户？', accountClosed: '此账户已关闭', accountClosedMessage: '您已将其关闭，但数据并未被删除。重新开启后，您收藏的车辆、消息和发布内容都会恢复。', accountClosedUntil: '{{date}} 之后将被永久删除。', reopen: '重新开启我的账户', notNow: '暂不', welcomeBack: '欢迎回来，您的账户已重新开启。', reopenError: '无法重新开启此账户。', invalidCredentials: '邮箱或密码不正确。', createError: '无法创建您的账户，请重试。' },
};

// RentalDetailScreen — one screen, entirely hand-written copy (it predates the
// i18n rollout). Keyed flat rather than nested per section since there is only
// one screen consuming it.
const EXTRA_RENTAL_DETAIL = {
  en: {
    notFoundTitle: "This rental isn't available", notFoundSub: 'It may have been paused or removed from the fleet.', goBack: 'Go back', loading: 'Loading this rental…',
    forRent: 'For Rent', certified: 'Certified {{score}}/150', safariReady: 'Safari-Ready', share: 'Share', shareMessage: '{{title}} — {{price}}/day on Sawa Cars',
    seats: 'Seats', gearbox: 'Gearbox', fuel: 'Fuel', year: 'Year',
    unavailableUntil: 'Unavailable until {{date}}',
    availability: 'Availability', requestDates: 'Request your dates', availabilityNote: 'The verified provider will confirm the vehicle, price and pickup arrangements. Sending an inquiry does not hold or book the car.',
    pricing: 'Pricing', dailyRate: 'Daily rate', weeklyRate: 'Weekly rate', saveVsDaily: 'Save {{amount}} vs daily', securityDeposit: 'Security deposit', depositSub: 'Provider-stated amount · confirm written terms', minRental: 'Minimum rental: {{count}} days',
    confirmTerms: 'Confirm these terms with the provider', insurance: 'Insurance coverage', roadside: 'Roadside assistance', mileageLimits: 'Kilometre limits', depositTerms: 'Deposit & refund terms',
    safetyLink: 'Marketplace safety & responsibilities',
    inspectionTitle: '150-Point Inspection Report', inspectionSub: 'Scored {{score}}/150 · View full report',
    howItWorks: 'How renting works',
    step1Title: 'Send an inquiry', step1Desc: 'Share your dates and preferred contact channel.',
    step2Title: 'Agree directly', step2Desc: 'The provider confirms availability, price, insurance, deposit and written rental terms.',
    step3Title: 'Manage the rental', step3Desc: 'Pickup, payment, vehicle condition and return are handled directly between you and the provider.',
    ctaDailyRental: 'Daily rental', ctaPerDay: '/ day', ctaRateNote: 'Provider-stated rate · confirm directly', ctaInquiryOnly: 'Inquiry only', ctaRequestAvailability: 'Request availability',
  },
  rw: {
    notFoundTitle: 'Iyi modoka ntiboneka', notFoundSub: 'Ishobora kuba yarahagaritswe cyangwa ikuwe mu modoka zikodeshwa.', goBack: 'Subira inyuma', loading: 'Turimo gutegura iyi modoka…',
    forRent: 'Ikodeshwa', certified: 'Yemejwe {{score}}/150', safariReady: 'Yiteguye safari', share: 'Sangiza', shareMessage: '{{title}} — {{price}}/umunsi kuri Sawa Cars',
    seats: 'Imyanya', gearbox: 'Gearbox', fuel: 'Lisansi', year: 'Umwaka',
    unavailableUntil: 'Ntiboneka kugeza {{date}}',
    availability: 'Kuboneka', requestDates: 'Saba amatariki yawe', availabilityNote: 'Uwatanga imodoka wemejwe azemeza imodoka, igiciro n’uko izafatirwa. Kohereza icyifuzo ntibivuze ko imodoka yabitswe cyangwa yasabwe.',
    pricing: 'Ibiciro', dailyRate: 'Igiciro cy’umunsi', weeklyRate: 'Igiciro cy’icyumweru', saveVsDaily: 'Zigama {{amount}} ugereranyije n’umunsi', securityDeposit: 'Ingwate y’umutekano', depositSub: 'Umubare watanzwe n’uwatanga imodoka · emeza amabwiriza yanditse', minRental: 'Igihe gito cyo gukodesha: iminsi {{count}}',
    confirmTerms: 'Emeza aya mabwiriza n’uwatanga imodoka', insurance: 'Ubwishingizi', roadside: 'Ubufasha mu nzira', mileageLimits: 'Imipaka y’intera', depositTerms: 'Amabwiriza y’ingwate no gusubizwa',
    safetyLink: 'Umutekano n’inshingano ku isoko',
    inspectionTitle: 'Raporo y’isuzuma ry’ingingo 150', inspectionSub: 'Amanota {{score}}/150 · Reba raporo yuzuye',
    howItWorks: 'Uburyo gukodesha bikora',
    step1Title: 'Ohereza icyifuzo', step1Desc: 'Tanga amatariki yawe n’uburyo bwiza bwo kuvugana nawe.',
    step2Title: 'Mwumvikane mu buryo butaziguye', step2Desc: 'Uwatanga imodoka yemeza ko iboneka, igiciro, ubwishingizi, ingwate n’amabwiriza yanditse.',
    step3Title: 'Genzura ikodeshwa', step3Desc: 'Gufata imodoka, kwishyura, uko imodoka imeze no kuyisubiza bikorwa hagati yawe n’uwayitanze.',
    ctaDailyRental: 'Ikodeshwa ry’umunsi', ctaPerDay: '/ umunsi', ctaRateNote: 'Igiciro giteganywa n’uwatanga imodoka · emeza mu buryo butaziguye', ctaInquiryOnly: 'Icyifuzo gusa', ctaRequestAvailability: 'Saba ko iboneka',
  },
  fr: {
    notFoundTitle: 'Cette location n’est pas disponible', notFoundSub: 'Elle a peut-être été suspendue ou retirée de la flotte.', goBack: 'Retour', loading: 'Chargement de cette location…',
    forRent: 'À louer', certified: 'Certifié {{score}}/150', safariReady: 'Prêt pour le safari', share: 'Partager', shareMessage: '{{title}} — {{price}}/jour sur Sawa Cars',
    seats: 'Places', gearbox: 'Boîte', fuel: 'Carburant', year: 'Année',
    unavailableUntil: 'Indisponible jusqu’au {{date}}',
    availability: 'Disponibilité', requestDates: 'Demandez vos dates', availabilityNote: 'Le prestataire vérifié confirmera le véhicule, le prix et les modalités de prise en charge. Envoyer une demande ne réserve pas le véhicule.',
    pricing: 'Tarifs', dailyRate: 'Tarif journalier', weeklyRate: 'Tarif hebdomadaire', saveVsDaily: 'Économisez {{amount}} par rapport au tarif journalier', securityDeposit: 'Caution', depositSub: 'Montant indiqué par le prestataire · confirmez les conditions écrites', minRental: 'Location minimale : {{count}} jours',
    confirmTerms: 'Confirmez ces conditions avec le prestataire', insurance: 'Couverture d’assurance', roadside: 'Assistance routière', mileageLimits: 'Limites de kilométrage', depositTerms: 'Conditions de caution et de remboursement',
    safetyLink: 'Sécurité et responsabilités sur la plateforme',
    inspectionTitle: 'Rapport d’inspection en 150 points', inspectionSub: 'Score {{score}}/150 · Voir le rapport complet',
    howItWorks: 'Comment fonctionne la location',
    step1Title: 'Envoyez une demande', step1Desc: 'Indiquez vos dates et le moyen de contact préféré.',
    step2Title: 'Convenez directement', step2Desc: 'Le prestataire confirme la disponibilité, le prix, l’assurance, la caution et les conditions écrites.',
    step3Title: 'Gérez la location', step3Desc: 'La prise en charge, le paiement, l’état du véhicule et le retour se règlent directement entre vous et le prestataire.',
    ctaDailyRental: 'Location journalière', ctaPerDay: '/ jour', ctaRateNote: 'Tarif indiqué par le prestataire · à confirmer directement', ctaInquiryOnly: 'Demande uniquement', ctaRequestAvailability: 'Demander la disponibilité',
  },
  sw: {
    notFoundTitle: 'Gari hili la kukodisha halipatikani', notFoundSub: 'Huenda limesitishwa au kuondolewa kwenye meli.', goBack: 'Rudi nyuma', loading: 'Inapakia gari hili…',
    forRent: 'Kwa Kukodisha', certified: 'Imethibitishwa {{score}}/150', safariReady: 'Tayari kwa safari', share: 'Shiriki', shareMessage: '{{title}} — {{price}}/siku kwenye Sawa Cars',
    seats: 'Viti', gearbox: 'Gearbox', fuel: 'Mafuta', year: 'Mwaka',
    unavailableUntil: 'Haipatikani hadi {{date}}',
    availability: 'Upatikanaji', requestDates: 'Omba tarehe zako', availabilityNote: 'Mtoa huduma aliyethibitishwa atathibitisha gari, bei na mpangilio wa kuchukua. Kutuma ombi hakuhifadhi wala kubuki gari.',
    pricing: 'Bei', dailyRate: 'Bei ya siku', weeklyRate: 'Bei ya wiki', saveVsDaily: 'Okoa {{amount}} ukilinganisha na bei ya siku', securityDeposit: 'Amana ya usalama', depositSub: 'Kiasi kilichoelezwa na mtoa huduma · thibitisha masharti yaliyoandikwa', minRental: 'Kukodisha kwa chini: siku {{count}}',
    confirmTerms: 'Thibitisha masharti haya na mtoa huduma', insurance: 'Bima', roadside: 'Msaada wa barabarani', mileageLimits: 'Kikomo cha umbali', depositTerms: 'Masharti ya amana na kurejeshewa',
    safetyLink: 'Usalama na majukumu ya sokoni',
    inspectionTitle: 'Ripoti ya Ukaguzi wa Pointi 150', inspectionSub: 'Alama {{score}}/150 · Angalia ripoti kamili',
    howItWorks: 'Jinsi kukodisha kunavyofanya kazi',
    step1Title: 'Tuma ombi', step1Desc: 'Shiriki tarehe zako na njia unayopendelea kuwasiliana.',
    step2Title: 'Kubaliana moja kwa moja', step2Desc: 'Mtoa huduma huthibitisha upatikanaji, bei, bima, amana na masharti yaliyoandikwa.',
    step3Title: 'Simamia ukodishaji', step3Desc: 'Kuchukua gari, malipo, hali ya gari na kurejesha hushughulikiwa moja kwa moja kati yako na mtoa huduma.',
    ctaDailyRental: 'Ukodishaji wa siku', ctaPerDay: '/ siku', ctaRateNote: 'Bei iliyoelezwa na mtoa huduma · thibitisha moja kwa moja', ctaInquiryOnly: 'Ombi tu', ctaRequestAvailability: 'Omba upatikanaji',
  },
  ko: {
    notFoundTitle: '이 렌트 차량은 이용할 수 없습니다', notFoundSub: '일시 중단되었거나 목록에서 제거되었을 수 있습니다.', goBack: '뒤로 가기', loading: '이 차량 정보를 불러오는 중…',
    forRent: '렌트 가능', certified: '인증 {{score}}/150', safariReady: '사파리 준비 완료', share: '공유', shareMessage: '{{title}} — Sawa Cars에서 하루 {{price}}',
    seats: '좌석', gearbox: '변속기', fuel: '연료', year: '연식',
    unavailableUntil: '{{date}}까지 이용 불가',
    availability: '이용 가능 여부', requestDates: '희망 날짜 요청', availabilityNote: '인증된 제공자가 차량, 가격, 픽업 방식을 확인해 드립니다. 문의를 보낸다고 해서 차량이 예약되거나 확보되지는 않습니다.',
    pricing: '요금', dailyRate: '일일 요금', weeklyRate: '주간 요금', saveVsDaily: '일일 요금 대비 {{amount}} 절약', securityDeposit: '보증금', depositSub: '제공자가 명시한 금액 · 서면 조건을 확인하세요', minRental: '최소 대여 기간: {{count}}일',
    confirmTerms: '제공자와 다음 조건을 확인하세요', insurance: '보험 보장', roadside: '긴급 출동 지원', mileageLimits: '주행거리 제한', depositTerms: '보증금 및 환불 조건',
    safetyLink: '마켓플레이스 안전 및 책임',
    inspectionTitle: '150개 항목 검사 보고서', inspectionSub: '{{score}}/150점 · 전체 보고서 보기',
    howItWorks: '렌트 이용 방법',
    step1Title: '문의 보내기', step1Desc: '희망 날짜와 선호하는 연락 방법을 공유하세요.',
    step2Title: '직접 협의하기', step2Desc: '제공자가 이용 가능 여부, 가격, 보험, 보증금, 서면 대여 조건을 확인해 드립니다.',
    step3Title: '대여 관리하기', step3Desc: '픽업, 결제, 차량 상태, 반납은 제공자와 직접 처리합니다.',
    ctaDailyRental: '일일 렌트', ctaPerDay: '/ 일', ctaRateNote: '제공자가 명시한 요금 · 직접 확인하세요', ctaInquiryOnly: '문의만 가능', ctaRequestAvailability: '이용 가능 여부 요청',
  },
  zh: {
    notFoundTitle: '此租赁车辆不可用', notFoundSub: '可能已被暂停或从车队中移除。', goBack: '返回', loading: '正在加载此租赁车辆信息…',
    forRent: '可租赁', certified: '认证 {{score}}/150', safariReady: '适合越野', share: '分享', shareMessage: '{{title}} — 在 Sawa Cars 每天 {{price}}',
    seats: '座位数', gearbox: '变速箱', fuel: '燃料', year: '年份',
    unavailableUntil: '至 {{date}} 前不可用',
    availability: '可用情况', requestDates: '申请您的日期', availabilityNote: '经过验证的提供方将确认车辆、价格及取车安排。发送咨询并不代表车辆已被预留或预订。',
    pricing: '价格', dailyRate: '日租金', weeklyRate: '周租金', saveVsDaily: '比日租金节省 {{amount}}', securityDeposit: '押金', depositSub: '金额由提供方说明 · 请确认书面条款', minRental: '最短租期：{{count}} 天',
    confirmTerms: '请与提供方确认以下条款', insurance: '保险保障', roadside: '道路救援', mileageLimits: '里程限制', depositTerms: '押金与退款条款',
    safetyLink: '市场安全与责任',
    inspectionTitle: '150项检测报告', inspectionSub: '得分 {{score}}/150 · 查看完整报告',
    howItWorks: '租赁流程说明',
    step1Title: '发送咨询', step1Desc: '告知您的日期及首选联系方式。',
    step2Title: '直接协商', step2Desc: '提供方将确认车辆是否可用、价格、保险、押金及书面租赁条款。',
    step3Title: '管理租赁', step3Desc: '取车、付款、车况及还车均由您与提供方直接处理。',
    ctaDailyRental: '按日租赁', ctaPerDay: '/ 天', ctaRateNote: '价格由提供方说明 · 请直接确认', ctaInquiryOnly: '仅咨询', ctaRequestAvailability: '查询可用情况',
  },
};

// ProfileScreen — the account tab. Flat per-screen keys, same convention as
// EXTRA_RENTAL_DETAIL; strings shared with the drawer/common sections are
// reused there via t('drawer.…')/t('common.…') instead of duplicated here.
const EXTRA_PROFILE = {
  en: {
    guestTitle: "You're browsing as a guest", guestSub: 'Sign in to save cars, contact sellers, manage rental inquiries, and sell your car.', guestSignIn: 'Sign In', guestDemo: 'Continue with a demo account',
    statSubmitted: 'Submitted', statLive: 'Live', statTrust: 'Trust Score',
    dashboardTitle: 'Seller Dashboard', dashboardSub: '{{count}} submissions · {{live}} live on marketplace',
    sectionListings: 'My Listings', sectionAccount: 'Account',
    menuContactVisibility: 'Contact Visibility', menuCarValuation: "What's My Car Worth?", menuMessages: 'Messages', menuHowBuyingWorks: 'How Buying Works', menuHelpSupport: 'Help & Support',
    badgeVerifiedSeller: 'Verified Seller', badgeIdVerified: 'ID Verified', badgeIdPending: 'ID under review', badgeIdRejected: 'ID needs attention — tap to resubmit', badgeIdNone: 'Verify your ID to sell',
    openFailed: 'Could not open that. Please try again.', editLabel: 'Edit',
  },
  rw: {
    guestTitle: 'Uri gushakisha nk’umushyitsi', guestSub: 'Injira kugira ngo ubike imodoka, uvugane n’abagurisha, ugenzure ibyifuzo byo gukodesha, kandi ugurishe imodoka yawe.', guestSignIn: 'Injira', guestDemo: 'Komeza ukoresheje konti y’ikitegererezo',
    statSubmitted: 'Byatanzwe', statLive: 'Biri kumugaragaro', statTrust: 'Amanota y’icyizere',
    dashboardTitle: 'Ikibaho cy’umugurisha', dashboardSub: 'Ibyatanzwe {{count}} · {{live}} biri kumugaragaro ku isoko',
    sectionListings: 'Amatangazo yanjye', sectionAccount: 'Konti',
    menuContactVisibility: 'Kugaragaza uko wavugana', menuCarValuation: 'Imodoka yanjye ifite agaciro kangana?', menuMessages: 'Ubutumwa', menuHowBuyingWorks: 'Uko kugura bikorwa', menuHelpSupport: 'Ubufasha n’inkunga',
    badgeVerifiedSeller: 'Umugurisha wemejwe', badgeIdVerified: 'Umwirondoro wagenzuwe', badgeIdPending: 'Umwirondoro uracyasuzumwa', badgeIdRejected: 'Umwirondoro ukeneye kugarukwaho — kanda utange ukundi', badgeIdNone: 'Genzura umwirondoro wawe kugira ngo ugurishe',
    openFailed: 'Ntibyashobotse gufungura ibyo. Ongera ugerageze.', editLabel: 'Hindura',
  },
  fr: {
    guestTitle: 'Vous naviguez en tant qu’invité', guestSub: 'Connectez-vous pour enregistrer des voitures, contacter des vendeurs, gérer vos demandes de location et vendre votre voiture.', guestSignIn: 'Se connecter', guestDemo: 'Continuer avec un compte de démonstration',
    statSubmitted: 'Soumises', statLive: 'En ligne', statTrust: 'Score de confiance',
    dashboardTitle: 'Tableau de bord vendeur', dashboardSub: '{{count}} soumissions · {{live}} en ligne sur le marché',
    sectionListings: 'Mes annonces', sectionAccount: 'Compte',
    menuContactVisibility: 'Visibilité du contact', menuCarValuation: 'Combien vaut ma voiture ?', menuMessages: 'Messages', menuHowBuyingWorks: 'Comment fonctionne l’achat', menuHelpSupport: 'Aide et assistance',
    badgeVerifiedSeller: 'Vendeur vérifié', badgeIdVerified: 'Identité vérifiée', badgeIdPending: 'Identité en cours de vérification', badgeIdRejected: 'Identité à revoir — appuyez pour soumettre à nouveau', badgeIdNone: 'Vérifiez votre identité pour vendre',
    openFailed: 'Impossible d’ouvrir ce lien. Veuillez réessayer.', editLabel: 'Modifier',
  },
  sw: {
    guestTitle: 'Unavinjari kama mgeni', guestSub: 'Ingia ili kuhifadhi magari, kuwasiliana na wauzaji, kusimamia maombi ya kukodisha, na kuuza gari lako.', guestSignIn: 'Ingia', guestDemo: 'Endelea na akaunti ya onyesho',
    statSubmitted: 'Yaliyowasilishwa', statLive: 'Yanayoonekana', statTrust: 'Alama ya uaminifu',
    dashboardTitle: 'Dashibodi ya muuzaji', dashboardSub: 'Mawasilisho {{count}} · {{live}} yanayoonekana sokoni',
    sectionListings: 'Matangazo yangu', sectionAccount: 'Akaunti',
    menuContactVisibility: 'Mwonekano wa mawasiliano', menuCarValuation: 'Gari langu lina thamani gani?', menuMessages: 'Ujumbe', menuHowBuyingWorks: 'Jinsi ununuzi unavyofanya kazi', menuHelpSupport: 'Msaada na Usaidizi',
    badgeVerifiedSeller: 'Muuzaji aliyethibitishwa', badgeIdVerified: 'Utambulisho umethibitishwa', badgeIdPending: 'Utambulisho unakaguliwa', badgeIdRejected: 'Utambulisho unahitaji hatua — gusa kuwasilisha tena', badgeIdNone: 'Thibitisha utambulisho wako ili uuze',
    openFailed: 'Imeshindikana kufungua hilo. Tafadhali jaribu tena.', editLabel: 'Hariri',
  },
  ko: {
    guestTitle: '게스트로 둘러보는 중입니다', guestSub: '차량 저장, 판매자 연락, 렌트 문의 관리, 차량 판매를 위해 로그인하세요.', guestSignIn: '로그인', guestDemo: '데모 계정으로 계속하기',
    statSubmitted: '제출됨', statLive: '게시 중', statTrust: '신뢰 점수',
    dashboardTitle: '판매자 대시보드', dashboardSub: '제출 {{count}}건 · 게시 중 {{live}}건',
    sectionListings: '내 매물', sectionAccount: '계정',
    menuContactVisibility: '연락처 공개 설정', menuCarValuation: '내 차량 가치는 얼마일까요?', menuMessages: '메시지', menuHowBuyingWorks: '구매 방법', menuHelpSupport: '고객 지원',
    badgeVerifiedSeller: '인증 판매자', badgeIdVerified: '신원 인증 완료', badgeIdPending: '신원 확인 검토 중', badgeIdRejected: '신원 확인 재제출 필요 — 눌러서 다시 제출', badgeIdNone: '판매하려면 신원을 인증하세요',
    openFailed: '열 수 없습니다. 다시 시도해 주세요.', editLabel: '편집',
  },
  zh: {
    guestTitle: '您正在以访客身份浏览', guestSub: '登录后即可收藏车辆、联系卖家、管理租车咨询并出售您的车辆。', guestSignIn: '登录', guestDemo: '使用演示账户继续',
    statSubmitted: '已提交', statLive: '已上线', statTrust: '信誉评分',
    dashboardTitle: '卖家控制台', dashboardSub: '{{count}}次提交 · {{live}}个已在市场上线',
    sectionListings: '我的信息', sectionAccount: '账户',
    menuContactVisibility: '联系方式可见性', menuCarValuation: '我的车值多少钱？', menuMessages: '消息', menuHowBuyingWorks: '购车流程说明', menuHelpSupport: '帮助与支持',
    badgeVerifiedSeller: '已认证卖家', badgeIdVerified: '身份已验证', badgeIdPending: '身份审核中', badgeIdRejected: '身份需要重新提交——点击重新提交', badgeIdNone: '验证身份即可出售车辆',
    openFailed: '无法打开该内容，请重试。', editLabel: '编辑',
  },
};

export const TRANSLATIONS = { en: EN, rw: RW, fr: FR, sw: SW, ko: KO, zh: ZH };
for (const code of Object.keys(TRANSLATIONS)) {
  TRANSLATIONS[code].settings = { ...TRANSLATIONS[code].settings, ...EXTRA_SETTINGS[code] };
  TRANSLATIONS[code].home = { ...TRANSLATIONS[code].home, ...EXTRA_HOME[code] };
  TRANSLATIONS[code].filters = { ...TRANSLATIONS[code].filters, ...EXTRA_FILTERS[code] };
  TRANSLATIONS[code].searchResults = EXTRA_SEARCH[code];
  TRANSLATIONS[code].auth = EXTRA_AUTH[code];
  TRANSLATIONS[code].rentalDetail = EXTRA_RENTAL_DETAIL[code];
  TRANSLATIONS[code].profile = EXTRA_PROFILE[code];
}

export function normalizeLanguage(value) {
  return LANGUAGES.some((item) => item.code === value) ? value : DEFAULT_LANGUAGE;
}

export function languageFor(code) {
  return LANGUAGES.find((item) => item.code === normalizeLanguage(code)) || LANGUAGES[0];
}

export function translate(language, key, variables = {}) {
  const code = normalizeLanguage(language);
  const lookup = (source) => String(key).split('.').reduce((value, part) => value?.[part], source);
  const value = lookup(TRANSLATIONS[code]) ?? lookup(EN) ?? key;
  return String(value).replace(/\{\{(\w+)\}\}/g, (_match, name) => (
    variables[name] == null ? `{{${name}}}` : String(variables[name])
  ));
}

export function localeFor(code) {
  return languageFor(code).locale;
}
