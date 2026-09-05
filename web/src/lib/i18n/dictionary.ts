// Web message catalogue.
//
// One nested object per locale, all sharing the shape of `en`. `getT` looks a
// dot-path up in the active locale, falls back to English per-string (never a
// blank label), and fills {{name}} placeholders. Keep every locale in the same
// shape so a missing key is obvious in review.
//
// Sections are added as pages are localized; English is always complete first.

import { DEFAULT_LOCALE, normalizeLocale, type Locale } from './config'
import { SECTIONS } from './messages'

type Messages = Record<string, unknown>

const en = {
  common: {
    buy: 'Buy',
    rent: 'Rent',
    sell: 'Sell',
    browseCars: 'Browse cars',
    getApp: 'Get the app',
    signIn: 'Sign in',
    signOut: 'Sign out',
    createAccount: 'Create account',
    dashboard: 'My dashboard',
    menu: 'Menu',
    close: 'Close',
    language: 'Language',
    chooseLanguage: 'Choose your language',
    admin: 'Admin', adminDashboard: 'Admin dashboard', callUs: 'Call us',
  },
  nav: {
    buy: 'Buy',
    rentals: 'Rentals',
    sell: 'Sell',
    tools: 'Tools',
    howItWorks: 'How it works',
    browseCertified: 'Browse certified cars',
  },
  footer: {
    tagline:
      "Rwanda's verified vehicle marketplace. We improve listing evidence and seller accountability, then let users communicate and agree independently.",
    getApp: 'Get the app',
    messageWhatsApp: 'Message us on WhatsApp',
    visitUs: 'Visit us',
    rights: 'All rights reserved.',
    noCheckout:
      'No Sawa checkout or escrow. Users remain responsible for their own contracts and payments.',
    headings: {
      Marketplace: 'Marketplace',
      Company: 'Company',
      Account: 'Account',
      Legal: 'Legal',
    },
    links: {
      '/cars': 'Browse certified cars',
      '/rentals': 'Rent a car',
      '/sell': 'Sell your car',
      '/tools/valuation': 'Free valuation',
      '/tools/import-duty': 'Import duty calculator',
      '/about': 'About Sawa Cars',
      '/promise': 'Marketplace safety',
      '/how-it-works': 'How buying works',
      '/contact': 'Contact & centers',
      '/signin': 'Sign in',
      '/signup': 'Create account',
      '/dashboard': 'My dashboard',
      '/dashboard/saved': 'Saved cars',
      '/legal/terms': 'Terms of service',
      '/legal/privacy': 'Privacy policy',
      '/legal/guarantee': 'Direct-deal notice',
      '/account/delete': 'Delete your account',
    },
  },
} as const

const rw = {
  common: {
    buy: 'Gura',
    rent: 'Kodesha',
    sell: 'Gurisha',
    browseCars: 'Reba imodoka',
    getApp: 'Kura porogaramu',
    signIn: 'Injira',
    signOut: 'Sohoka',
    createAccount: 'Fungura konti',
    dashboard: 'Imbonerahamwe yanjye',
    menu: 'Menyu',
    close: 'Funga',
    language: 'Ururimi',
    chooseLanguage: 'Hitamo ururimi',
    admin: 'Ubuyobozi', adminDashboard: 'Imbonerahamwe y’ubuyobozi', callUs: 'Duhamagare',
  },
  nav: {
    buy: 'Gura',
    rentals: 'Izikodeshwa',
    sell: 'Gurisha',
    tools: 'Ibikoresho',
    howItWorks: 'Uko bikorwa',
    browseCertified: 'Reba imodoka zemewe',
  },
  footer: {
    tagline:
      'Isoko ry’imodoka ryemewe mu Rwanda. Twongera ubwiza bw’ibimenyetso by’amatangazo n’uburyozwe bw’abagurisha, hanyuma abakoresha bakavugana bakumvikana ubwabo.',
    getApp: 'Kura porogaramu',
    messageWhatsApp: 'Twandikire kuri WhatsApp',
    visitUs: 'Dusure',
    rights: 'Uburenganzira bwose burabitswe.',
    noCheckout:
      'Nta kwishyura cyangwa kubika amafaranga kwa Sawa. Abakoresha ni bo bishingira amasezerano n’ubwishyu bwabo.',
    headings: {
      Marketplace: 'Isoko',
      Company: 'Ikigo',
      Account: 'Konti',
      Legal: 'Amategeko',
    },
    links: {
      '/cars': 'Reba imodoka zemewe',
      '/rentals': 'Kodesha imodoka',
      '/sell': 'Gurisha imodoka yawe',
      '/tools/valuation': 'Isuzuma ry’agaciro ku buntu',
      '/tools/import-duty': 'Kubara umusoro wo gutumiza',
      '/about': 'Ibyerekeye Sawa Cars',
      '/promise': 'Umutekano w’isoko',
      '/how-it-works': 'Uko kugura bikorwa',
      '/contact': 'Twandikire & ibigo',
      '/signin': 'Injira',
      '/signup': 'Fungura konti',
      '/dashboard': 'Imbonerahamwe yanjye',
      '/dashboard/saved': 'Imodoka wabikiye',
      '/legal/terms': 'Amabwiriza y’imikoreshereze',
      '/legal/privacy': 'Politiki y’ibanga',
      '/legal/guarantee': 'Itangazo ry’ubucuruzi butaziguye',
      '/account/delete': 'Siba konti yawe',
    },
  },
} as const

const fr = {
  common: {
    buy: 'Acheter',
    rent: 'Louer',
    sell: 'Vendre',
    browseCars: 'Voir les voitures',
    getApp: "Obtenir l'application",
    signIn: 'Se connecter',
    signOut: 'Se déconnecter',
    createAccount: 'Créer un compte',
    dashboard: 'Mon tableau de bord',
    menu: 'Menu',
    close: 'Fermer',
    language: 'Langue',
    chooseLanguage: 'Choisissez votre langue',
    admin: 'Admin', adminDashboard: 'Tableau de bord admin', callUs: 'Nous appeler',
  },
  nav: {
    buy: 'Acheter',
    rentals: 'Locations',
    sell: 'Vendre',
    tools: 'Outils',
    howItWorks: 'Comment ça marche',
    browseCertified: 'Voir les voitures certifiées',
  },
  footer: {
    tagline:
      "Le marché automobile vérifié du Rwanda. Nous renforçons les preuves des annonces et la responsabilité des vendeurs, puis laissons les utilisateurs communiquer et s'entendre en toute indépendance.",
    getApp: "Obtenir l'application",
    messageWhatsApp: 'Écrivez-nous sur WhatsApp',
    visitUs: 'Nous rendre visite',
    rights: 'Tous droits réservés.',
    noCheckout:
      "Pas de paiement ni de séquestre Sawa. Les utilisateurs restent responsables de leurs propres contrats et paiements.",
    headings: {
      Marketplace: 'Marché',
      Company: 'Entreprise',
      Account: 'Compte',
      Legal: 'Juridique',
    },
    links: {
      '/cars': 'Voir les voitures certifiées',
      '/rentals': 'Louer une voiture',
      '/sell': 'Vendre votre voiture',
      '/tools/valuation': 'Estimation gratuite',
      '/tools/import-duty': "Calculateur de droits d'importation",
      '/about': 'À propos de Sawa Cars',
      '/promise': 'Sécurité du marché',
      '/how-it-works': "Comment se déroule l'achat",
      '/contact': 'Contact et centres',
      '/signin': 'Se connecter',
      '/signup': 'Créer un compte',
      '/dashboard': 'Mon tableau de bord',
      '/dashboard/saved': 'Voitures enregistrées',
      '/legal/terms': "Conditions d'utilisation",
      '/legal/privacy': 'Politique de confidentialité',
      '/legal/guarantee': 'Avis de transaction directe',
      '/account/delete': 'Supprimer votre compte',
    },
  },
} as const

const sw = {
  common: {
    buy: 'Nunua',
    rent: 'Kukodisha',
    sell: 'Uza',
    browseCars: 'Angalia magari',
    getApp: 'Pata programu',
    signIn: 'Ingia',
    signOut: 'Ondoka',
    createAccount: 'Fungua akaunti',
    dashboard: 'Dashibodi yangu',
    menu: 'Menyu',
    close: 'Funga',
    language: 'Lugha',
    chooseLanguage: 'Chagua lugha yako',
    admin: 'Msimamizi', adminDashboard: 'Dashibodi ya msimamizi', callUs: 'Tupigie simu',
  },
  nav: {
    buy: 'Nunua',
    rentals: 'Za kukodisha',
    sell: 'Uza',
    tools: 'Zana',
    howItWorks: 'Jinsi inavyofanya kazi',
    browseCertified: 'Angalia magari yaliyothibitishwa',
  },
  footer: {
    tagline:
      'Soko la magari lililothibitishwa la Rwanda. Tunaboresha ushahidi wa matangazo na uwajibikaji wa wauzaji, kisha tunawaacha watumiaji wawasiliane na kukubaliana wenyewe.',
    getApp: 'Pata programu',
    messageWhatsApp: 'Tuandikie kwa WhatsApp',
    visitUs: 'Tutembelee',
    rights: 'Haki zote zimehifadhiwa.',
    noCheckout:
      'Hakuna malipo wala udhamini wa Sawa. Watumiaji wanabaki kuwajibika kwa mikataba na malipo yao wenyewe.',
    headings: {
      Marketplace: 'Soko',
      Company: 'Kampuni',
      Account: 'Akaunti',
      Legal: 'Kisheria',
    },
    links: {
      '/cars': 'Angalia magari yaliyothibitishwa',
      '/rentals': 'Kodisha gari',
      '/sell': 'Uza gari lako',
      '/tools/valuation': 'Ukadiriaji bila malipo',
      '/tools/import-duty': 'Kikokotoo cha ushuru wa kuagiza',
      '/about': 'Kuhusu Sawa Cars',
      '/promise': 'Usalama wa soko',
      '/how-it-works': 'Jinsi ununuzi unavyofanya kazi',
      '/contact': 'Mawasiliano na vituo',
      '/signin': 'Ingia',
      '/signup': 'Fungua akaunti',
      '/dashboard': 'Dashibodi yangu',
      '/dashboard/saved': 'Magari yaliyohifadhiwa',
      '/legal/terms': 'Masharti ya huduma',
      '/legal/privacy': 'Sera ya faragha',
      '/legal/guarantee': 'Ilani ya biashara ya moja kwa moja',
      '/account/delete': 'Futa akaunti yako',
    },
  },
} as const

const ko = {
  common: {
    buy: '구매',
    rent: '렌트',
    sell: '판매',
    browseCars: '차량 둘러보기',
    getApp: '앱 다운로드',
    signIn: '로그인',
    signOut: '로그아웃',
    createAccount: '계정 만들기',
    dashboard: '내 대시보드',
    menu: '메뉴',
    close: '닫기',
    language: '언어',
    chooseLanguage: '언어를 선택하세요',
    admin: '관리자', adminDashboard: '관리자 대시보드', callUs: '전화하기',
  },
  nav: {
    buy: '구매',
    rentals: '렌트',
    sell: '판매',
    tools: '도구',
    howItWorks: '이용 방법',
    browseCertified: '인증 차량 둘러보기',
  },
  footer: {
    tagline:
      '르완다의 인증 차량 마켓플레이스입니다. 매물 근거와 판매자 책임성을 강화한 뒤, 이용자가 직접 소통하고 합의하도록 합니다.',
    getApp: '앱 다운로드',
    messageWhatsApp: 'WhatsApp으로 문의하기',
    visitUs: '방문하기',
    rights: 'All rights reserved.',
    noCheckout:
      'Sawa의 결제나 에스크로가 없습니다. 계약과 결제에 대한 책임은 이용자에게 있습니다.',
    headings: {
      Marketplace: '마켓플레이스',
      Company: '회사',
      Account: '계정',
      Legal: '법률',
    },
    links: {
      '/cars': '인증 차량 둘러보기',
      '/rentals': '차량 렌트',
      '/sell': '내 차량 판매',
      '/tools/valuation': '무료 시세 평가',
      '/tools/import-duty': '수입 관세 계산기',
      '/about': 'Sawa Cars 소개',
      '/promise': '마켓플레이스 안전',
      '/how-it-works': '구매 방법',
      '/contact': '연락처 및 센터',
      '/signin': '로그인',
      '/signup': '계정 만들기',
      '/dashboard': '내 대시보드',
      '/dashboard/saved': '저장한 차량',
      '/legal/terms': '서비스 약관',
      '/legal/privacy': '개인정보 보호정책',
      '/legal/guarantee': '직접 거래 안내',
      '/account/delete': '계정 삭제',
    },
  },
} as const

const zh = {
  common: {
    buy: '购买',
    rent: '租车',
    sell: '出售',
    browseCars: '浏览车辆',
    getApp: '下载应用',
    signIn: '登录',
    signOut: '退出登录',
    createAccount: '创建账户',
    dashboard: '我的控制台',
    menu: '菜单',
    close: '关闭',
    language: '语言',
    chooseLanguage: '选择您的语言',
    admin: '管理员', adminDashboard: '管理员控制台', callUs: '致电我们',
  },
  nav: {
    buy: '购买',
    rentals: '租车',
    sell: '出售',
    tools: '工具',
    howItWorks: '使用说明',
    browseCertified: '浏览已认证车辆',
  },
  footer: {
    tagline:
      '卢旺达的认证车辆市场。我们强化信息依据和卖家责任，让用户可以直接沟通并自行达成协议。',
    getApp: '下载应用',
    messageWhatsApp: '通过 WhatsApp 咨询',
    visitUs: '前来访问',
    rights: 'All rights reserved.',
    noCheckout:
      '没有 Sawa 的结算或资金托管。合同与付款的责任在用户自身。',
    headings: {
      Marketplace: '市场',
      Company: '公司',
      Account: '账户',
      Legal: '法律',
    },
    links: {
      '/cars': '浏览已认证车辆',
      '/rentals': '租车',
      '/sell': '出售我的车辆',
      '/tools/valuation': '免费估值',
      '/tools/import-duty': '进口关税计算器',
      '/about': '关于 Sawa Cars',
      '/promise': '市场安全',
      '/how-it-works': '购车方法',
      '/contact': '联系方式与中心',
      '/signin': '登录',
      '/signup': '创建账户',
      '/dashboard': '我的控制台',
      '/dashboard/saved': '收藏的车辆',
      '/legal/terms': '服务条款',
      '/legal/privacy': '隐私政策',
      '/legal/guarantee': '直接交易须知',
      '/account/delete': '删除账户',
    },
  },
} as const

// Per-page-group message sections (src/lib/i18n/messages/*) are merged in by
// name on top of the base chrome above, one subtree per locale. English is the
// fallback for any section a locale has not filled in yet.
const BASE: Record<Locale, Messages> = { en, rw, fr, sw, ko, zh }

function withSections(locale: Locale): Messages {
  const out: Messages = { ...BASE[locale] }
  for (const [name, byLocale] of Object.entries(SECTIONS)) {
    out[name] = byLocale[locale] ?? byLocale[DEFAULT_LOCALE]
  }
  return out
}

export const DICTIONARY: Record<Locale, Messages> = {
  en: withSections('en'),
  rw: withSections('rw'),
  fr: withSections('fr'),
  sw: withSections('sw'),
  ko: withSections('ko'),
  zh: withSections('zh'),
}

function lookup(source: Messages | undefined, key: string): string | undefined {
  if (!source) return undefined
  const value = key.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    source,
  )
  return typeof value === 'string' ? value : undefined
}

function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_m, name) =>
    vars[name] == null ? `{{${name}}}` : String(vars[name]),
  )
}

export type TFunction = (key: string, vars?: Record<string, string | number>) => string

/** Build a translator bound to one locale. Works in server and client code. */
export function getT(locale: unknown): TFunction {
  const code = normalizeLocale(locale)
  return (key, vars) => {
    const value = lookup(DICTIONARY[code], key) ?? lookup(DICTIONARY[DEFAULT_LOCALE], key) ?? key
    return fill(value, vars)
  }
}
