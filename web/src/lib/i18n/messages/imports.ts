// Message section: imports — the public /imports page.
// One subtree per locale, all sharing the shape of `en`.
import type { Locale } from '../config'

export const imports: Record<Locale, Record<string, unknown>> = {
  en: {
    "metaTitle": "Import a car to Rwanda",
    "metaDescription": "Import a car from Japan, South Korea or China to Kigali: a quote in francs, a signed agreement, two milestone payments evidenced by bank transfer, and an inspection in Kigali before the balance.",
    "title": "Import a car to Rwanda, quoted in francs",
    "lede": "Pick a model from Japan, South Korea or China. We quote it landed in Kigali, you sign the agreement, and you pay in two halves, each by bank transfer with proof. The car is inspected in Kigali before the second half is due.",
    "ctaRequest": "Request a quote",
    "ctaEstimate": "Estimate the duty",
    "modelsCount": "{{count}} models",
    "stepsTitle": "How an import order works",
    "stepsLede": "Every step is a status on your order, with its date, in your dashboard and the app.",
    "steps": {
      "request": {
        "t": "You request",
        "b": "The model, origin and year you want, and anything we should know."
      },
      "quote": {
        "t": "We quote it in francs",
        "b": "One figure for the car landed in Kigali, with what it includes written out."
      },
      "agreement": {
        "t": "You sign the agreement",
        "b": "The quote becomes a versioned import agreement you accept in the dashboard or the app."
      },
      "deposit": {
        "t": "First half: deposit",
        "b": "50% by bank transfer, quoting your order reference. You upload the proof; our team checks it."
      },
      "shipping": {
        "t": "Ordered and shipped",
        "b": "The car is bought, booked on a ship and tracked in transit to Kigali."
      },
      "inspection": {
        "t": "Inspected in Kigali",
        "b": "When it arrives, the car is inspected in Kigali before you pay anything more."
      },
      "balance": {
        "t": "Second half: balance",
        "b": "The other 50%, the same way: bank transfer with your reference, proof uploaded and checked."
      },
      "handover": {
        "t": "Customs and handover",
        "b": "Customs clearance in Kigali, then the car is ready for you to collect."
      }
    },
    "payTitle": "How you pay",
    "payBody": "Each half is a bank transfer to the account printed on your order, quoting its reference. There is no card payment, no escrow and no guarantee: you upload the transfer proof and our team checks it before the order moves on.",
    "catalogTitle": "Models we can source",
    "catalogLede": "The catalogue by origin. Choose a make to see its range; anything else, ask in your request.",
    "allOrigins": "All origins",
    "transitDays": "~{{days}} days at sea",
    "fromPort": "from {{port}}",
    "typicalFob": "Typical price abroad {{amount}}",
    "requestThis": "Request this model",
    "showAll": "Show all {{count}} models",
    "catalogEmpty": "The catalogue is not available right now. You can still request any model below.",
    "estimateTitle": "Estimate the landed cost",
    "estimateLede": "Rwanda’s duties on a vehicle value, by engine size and age. An estimate to plan with; your quote is the figure that counts.",
    "prefilled": "Prefilled from your search: {{usd}} at today’s rate, {{year}} model year.",
    "requestTitle": "Request a quote",
    "requestLede": "Free and without commitment. You get a quote in francs in your dashboard and by email.",
    "origin": "Import from",
    "make": "Make",
    "model": "Model",
    "year": "Year (optional)",
    "notes": "Anything we should know (optional)",
    "notesHint": "Colour, trim, budget, a listing link from an exporter.",
    "submit": "Send request",
    "sending": "Sending…",
    "signInTitle": "Sign in to request a quote",
    "signInBody": "Your quote, agreement and payments live on your account, so the request needs one.",
    "signIn": "Sign in",
    "createAccount": "Create an account",
    "errorRequired": "Choose an origin and enter a make and model.",
    "errorFailed": "The request could not be sent. Try again, or message us on WhatsApp.",
    "origins": {
      "Japan": "Japan",
      "South Korea": "South Korea",
      "China": "China",
      "United Arab Emirates": "United Arab Emirates",
      "Europe": "Europe",
      "Other": "Other"
    }
  },
  rw: {
    "metaTitle": "Tumiza imodoka mu Rwanda",
    "metaDescription": "Tumiza imodoka mu Buyapani, Koreya y’Epfo cyangwa Ubushinwa ikagera i Kigali: igiciro mu mafaranga y’u Rwanda, amasezerano asinywe, kwishyura mu byiciro bibiri ugaragaza inyemezabwishyu ya banki, n’isuzuma i Kigali mbere yo kwishyura asigaye.",
    "title": "Tumiza imodoka mu Rwanda, igiciro mu mafaranga",
    "lede": "Hitamo moderi yo mu Buyapani, Koreya y’Epfo cyangwa Ubushinwa. Tukubwira igiciro igeze i Kigali, ugasinya amasezerano, ukishyura mu bice bibiri, buri gice ukoresheje banki n’inyemezabwishyu. Imodoka isuzumirwa i Kigali mbere y’igice cya kabiri.",
    "ctaRequest": "Saba igiciro",
    "ctaEstimate": "Bara imisoro",
    "modelsCount": "Moderi {{count}}",
    "stepsTitle": "Uko itumiza rikorwa",
    "stepsLede": "Buri ntambwe ni imiterere y’itumiza ryawe, ifite itariki, ku mbonerahamwe yawe no muri porogaramu.",
    "steps": {
      "request": {
        "t": "Urasaba",
        "b": "Moderi, aho ituruka n’umwaka ushaka, n’ibindi dukwiye kumenya."
      },
      "quote": {
        "t": "Tuguha igiciro mu mafaranga",
        "b": "Igiciro kimwe cy’imodoka igeze i Kigali, n’ibyo kirimo byanditse."
      },
      "agreement": {
        "t": "Usinya amasezerano",
        "b": "Igiciro gihinduka amasezerano y’itumiza ufite verisiyo wemerera ku mbonerahamwe cyangwa muri porogaramu."
      },
      "deposit": {
        "t": "Igice cya mbere: ingwate",
        "b": "50% ukoresheje banki, ukoresha nimero y’itumiza ryawe. Wohereza inyemezabwishyu; itsinda ryacu rirayigenzura."
      },
      "shipping": {
        "t": "Irategekwa ikoherezwa",
        "b": "Imodoka iragurwa, igashyirwa ku bwato, igakurikiranwa kugeza i Kigali."
      },
      "inspection": {
        "t": "Isuzumirwa i Kigali",
        "b": "Iyo igeze, imodoka isuzumirwa i Kigali mbere y’uko wishyura ikindi."
      },
      "balance": {
        "t": "Igice cya kabiri: asigaye",
        "b": "Andi 50%, mu buryo bumwe: banki n’inomero yawe, inyemezabwishyu yoherejwe ikagenzurwa."
      },
      "handover": {
        "t": "Gasutamo no gushyikiriza",
        "b": "Gasutamo i Kigali, hanyuma imodoka ikaba yiteguye ko uyifata."
      }
    },
    "payTitle": "Uko wishyura",
    "payBody": "Buri gice ni ukohereza amafaranga kuri konti yanditse ku itumiza ryawe, ukoresheje nimero yaryo. Nta kwishyura ukoresheje ikarita, nta ngwate ibikwa n’undi, nta cyizere cy’inyongera: wohereza inyemezabwishyu, itsinda ryacu rikayigenzura mbere y’uko itumiza rikomeza.",
    "catalogTitle": "Moderi dushobora kukuzanira",
    "catalogLede": "Urutonde hakurikijwe aho ziva. Hitamo ubwoko urebe moderi zabwo; ikindi ubaze mu busabe bwawe.",
    "allOrigins": "Ahantu hose",
    "transitDays": "Iminsi ~{{days}} mu nyanja",
    "fromPort": "kuva {{port}}",
    "typicalFob": "Igiciro gisanzwe hanze {{amount}}",
    "requestThis": "Saba iyi moderi",
    "showAll": "Erekana moderi zose {{count}}",
    "catalogEmpty": "Urutonde ntiruboneka ubu. Ushobora gusaba moderi iyo ari yo yose hepfo.",
    "estimateTitle": "Bara igiciro igeze hano",
    "estimateLede": "Imisoro y’u Rwanda ku gaciro k’imodoka, hakurikijwe moteri n’imyaka. Ni igereranya ryo gutegura; igiciro uhabwa ni cyo cy’ukuri.",
    "prefilled": "Byujujwe ukurikije ibyo washatse: {{usd}} ku gipimo cy’uyu munsi, umwaka wa {{year}}.",
    "requestTitle": "Saba igiciro",
    "requestLede": "Ni ubuntu kandi nta kwiyemeza. Uhabwa igiciro mu mafaranga ku mbonerahamwe yawe no kuri imeyili.",
    "origin": "Bivuye",
    "make": "Ubwoko",
    "model": "Moderi",
    "year": "Umwaka (si ngombwa)",
    "notes": "Ibindi dukwiye kumenya (si ngombwa)",
    "notesHint": "Ibara, urwego, ingengo y’imari, umuyoboro w’itangazo ry’ucuruza hanze.",
    "submit": "Ohereza ubusabe",
    "sending": "Biroherezwa…",
    "signInTitle": "Injira kugira ngo usabe igiciro",
    "signInBody": "Igiciro, amasezerano n’ubwishyu biba kuri konti yawe, bityo ubusabe burayikeneye.",
    "signIn": "Injira",
    "createAccount": "Fungura konti",
    "errorRequired": "Hitamo aho iva, wandike ubwoko na moderi.",
    "errorFailed": "Ubusabe ntibwoherejwe. Ongera ugerageze, cyangwa utwandikire kuri WhatsApp.",
    "origins": {
      "Japan": "Buyapani",
      "South Korea": "Koreya y’Epfo",
      "China": "Ubushinwa",
      "United Arab Emirates": "Leta zunze ubumwe z’Abarabu",
      "Europe": "Uburayi",
      "Other": "Ahandi"
    }
  },
  fr: {
    "metaTitle": "Importer une voiture au Rwanda",
    "metaDescription": "Importez une voiture du Japon, de Corée du Sud ou de Chine jusqu’à Kigali : un devis en francs, un accord signé, deux paiements par étapes justifiés par virement, et une inspection à Kigali avant le solde.",
    "title": "Importez une voiture au Rwanda, devis en francs",
    "lede": "Choisissez un modèle au Japon, en Corée du Sud ou en Chine. Nous le chiffrons rendu à Kigali, vous signez l’accord et vous payez en deux moitiés, chacune par virement avec preuve. La voiture est inspectée à Kigali avant la seconde moitié.",
    "ctaRequest": "Demander un devis",
    "ctaEstimate": "Estimer les droits",
    "modelsCount": "{{count}} modèles",
    "stepsTitle": "Comment se déroule une commande d’import",
    "stepsLede": "Chaque étape est un statut daté de votre commande, dans votre tableau de bord et l’application.",
    "steps": {
      "request": {
        "t": "Vous demandez",
        "b": "Le modèle, l’origine et l’année voulus, et tout ce que nous devons savoir."
      },
      "quote": {
        "t": "Nous chiffrons en francs",
        "b": "Un montant pour la voiture rendue à Kigali, avec son contenu détaillé."
      },
      "agreement": {
        "t": "Vous signez l’accord",
        "b": "Le devis devient un accord d’import versionné que vous acceptez dans le tableau de bord ou l’application."
      },
      "deposit": {
        "t": "Première moitié : acompte",
        "b": "50 % par virement, avec la référence de votre commande. Vous téléversez la preuve ; notre équipe la vérifie."
      },
      "shipping": {
        "t": "Commandée et expédiée",
        "b": "La voiture est achetée, réservée sur un navire et suivie jusqu’à Kigali."
      },
      "inspection": {
        "t": "Inspectée à Kigali",
        "b": "À l’arrivée, la voiture est inspectée à Kigali avant tout autre paiement."
      },
      "balance": {
        "t": "Seconde moitié : solde",
        "b": "Les 50 % restants, de la même façon : virement avec votre référence, preuve téléversée et vérifiée."
      },
      "handover": {
        "t": "Douane et remise",
        "b": "Dédouanement à Kigali, puis la voiture est prête à être récupérée."
      }
    },
    "payTitle": "Comment vous payez",
    "payBody": "Chaque moitié est un virement vers le compte indiqué sur votre commande, avec sa référence. Pas de paiement par carte, pas de séquestre, pas de garantie : vous téléversez la preuve de virement et notre équipe la vérifie avant la suite.",
    "catalogTitle": "Modèles que nous pouvons sourcer",
    "catalogLede": "Le catalogue par origine. Choisissez une marque pour voir sa gamme ; pour le reste, demandez-le dans votre requête.",
    "allOrigins": "Toutes origines",
    "transitDays": "~{{days}} jours en mer",
    "fromPort": "depuis {{port}}",
    "typicalFob": "Prix habituel à l’étranger {{amount}}",
    "requestThis": "Demander ce modèle",
    "showAll": "Voir les {{count}} modèles",
    "catalogEmpty": "Le catalogue est indisponible pour l’instant. Vous pouvez tout de même demander n’importe quel modèle ci-dessous.",
    "estimateTitle": "Estimer le coût rendu",
    "estimateLede": "Les droits rwandais sur une valeur de véhicule, selon la cylindrée et l’âge. Une estimation pour planifier ; votre devis fait foi.",
    "prefilled": "Prérempli depuis votre recherche : {{usd}} au taux du jour, année {{year}}.",
    "requestTitle": "Demander un devis",
    "requestLede": "Gratuit et sans engagement. Vous recevez un devis en francs dans votre tableau de bord et par e-mail.",
    "origin": "Importer depuis",
    "make": "Marque",
    "model": "Modèle",
    "year": "Année (facultatif)",
    "notes": "Ce que nous devons savoir (facultatif)",
    "notesHint": "Couleur, finition, budget, un lien d’annonce d’un exportateur.",
    "submit": "Envoyer la demande",
    "sending": "Envoi…",
    "signInTitle": "Connectez-vous pour demander un devis",
    "signInBody": "Votre devis, votre accord et vos paiements sont liés à votre compte ; la demande en nécessite donc un.",
    "signIn": "Se connecter",
    "createAccount": "Créer un compte",
    "errorRequired": "Choisissez une origine et saisissez une marque et un modèle.",
    "errorFailed": "La demande n’a pas pu être envoyée. Réessayez ou écrivez-nous sur WhatsApp.",
    "origins": {
      "Japan": "Japon",
      "South Korea": "Corée du Sud",
      "China": "Chine",
      "United Arab Emirates": "Émirats arabes unis",
      "Europe": "Europe",
      "Other": "Autre"
    }
  },
  sw: {
    "metaTitle": "Agiza gari Rwanda",
    "metaDescription": "Agiza gari kutoka Japani, Korea Kusini au China hadi Kigali: bei kwa faranga, makubaliano yaliyosainiwa, malipo mawili ya hatua yenye uthibitisho wa benki, na ukaguzi Kigali kabla ya salio.",
    "title": "Agiza gari Rwanda, bei kwa faranga",
    "lede": "Chagua modeli kutoka Japani, Korea Kusini au China. Tunakupa bei likifika Kigali, unasaini makubaliano, na unalipa nusu mbili, kila moja kwa uhamisho wa benki na uthibitisho. Gari hukaguliwa Kigali kabla ya nusu ya pili.",
    "ctaRequest": "Omba bei",
    "ctaEstimate": "Kadiria ushuru",
    "modelsCount": "Modeli {{count}}",
    "stepsTitle": "Jinsi oda ya kuagiza inavyofanya kazi",
    "stepsLede": "Kila hatua ni hali ya oda yako, yenye tarehe, kwenye dashibodi yako na programu.",
    "steps": {
      "request": {
        "t": "Unaomba",
        "b": "Modeli, asili na mwaka unaotaka, na chochote tunachopaswa kujua."
      },
      "quote": {
        "t": "Tunatoa bei kwa faranga",
        "b": "Kiasi kimoja kwa gari likifika Kigali, na kinachojumuishwa kimeandikwa."
      },
      "agreement": {
        "t": "Unasaini makubaliano",
        "b": "Bei inakuwa makubaliano ya kuagiza yenye toleo unayokubali kwenye dashibodi au programu."
      },
      "deposit": {
        "t": "Nusu ya kwanza: amana",
        "b": "50% kwa uhamisho wa benki, ukitaja kumbukumbu ya oda. Unapakia uthibitisho; timu yetu inaukagua."
      },
      "shipping": {
        "t": "Imeagizwa na kusafirishwa",
        "b": "Gari linanunuliwa, linawekwa kwenye meli na kufuatiliwa hadi Kigali."
      },
      "inspection": {
        "t": "Inakaguliwa Kigali",
        "b": "Likifika, gari hukaguliwa Kigali kabla hujalipa zaidi."
      },
      "balance": {
        "t": "Nusu ya pili: salio",
        "b": "50% nyingine kwa njia ile ile: uhamisho wa benki na kumbukumbu yako, uthibitisho unapakiwa na kukaguliwa."
      },
      "handover": {
        "t": "Forodha na makabidhiano",
        "b": "Forodha Kigali, kisha gari liko tayari kuchukuliwa."
      }
    },
    "payTitle": "Jinsi unavyolipa",
    "payBody": "Kila nusu ni uhamisho wa benki kwenda akaunti iliyoandikwa kwenye oda yako, ukitaja kumbukumbu yake. Hakuna malipo ya kadi, hakuna escrow wala dhamana: unapakia uthibitisho na timu yetu inaukagua kabla oda haijaendelea.",
    "catalogTitle": "Modeli tunazoweza kuleta",
    "catalogLede": "Orodha kwa asili. Chagua aina uone modeli zake; kingine chochote, uliza kwenye ombi lako.",
    "allOrigins": "Asili zote",
    "transitDays": "Siku ~{{days}} baharini",
    "fromPort": "kutoka {{port}}",
    "typicalFob": "Bei ya kawaida nje {{amount}}",
    "requestThis": "Omba modeli hii",
    "showAll": "Onyesha modeli zote {{count}}",
    "catalogEmpty": "Orodha haipatikani sasa. Bado unaweza kuomba modeli yoyote hapa chini.",
    "estimateTitle": "Kadiria gharama ikifika",
    "estimateLede": "Ushuru wa Rwanda kwenye thamani ya gari, kwa ukubwa wa injini na umri. Ni makadirio ya kupanga; bei unayopewa ndiyo halisi.",
    "prefilled": "Imejazwa kutoka utafutaji wako: {{usd}} kwa kiwango cha leo, mwaka {{year}}.",
    "requestTitle": "Omba bei",
    "requestLede": "Bure na bila kujifunga. Unapata bei kwa faranga kwenye dashibodi na barua pepe.",
    "origin": "Agiza kutoka",
    "make": "Aina",
    "model": "Modeli",
    "year": "Mwaka (si lazima)",
    "notes": "Chochote tunachopaswa kujua (si lazima)",
    "notesHint": "Rangi, toleo, bajeti, kiungo cha tangazo la msafirishaji.",
    "submit": "Tuma ombi",
    "sending": "Inatuma…",
    "signInTitle": "Ingia ili kuomba bei",
    "signInBody": "Bei, makubaliano na malipo yako yako kwenye akaunti yako, hivyo ombi linahitaji akaunti.",
    "signIn": "Ingia",
    "createAccount": "Fungua akaunti",
    "errorRequired": "Chagua asili na uandike aina na modeli.",
    "errorFailed": "Ombi halikutumwa. Jaribu tena, au tuandikie WhatsApp.",
    "origins": {
      "Japan": "Japani",
      "South Korea": "Korea Kusini",
      "China": "China",
      "United Arab Emirates": "Falme za Kiarabu",
      "Europe": "Ulaya",
      "Other": "Nyingine"
    }
  },
  ko: {
    "metaTitle": "르완다로 차량 수입",
    "metaDescription": "일본, 한국, 중국에서 키갈리까지 차량 수입: 르완다 프랑 견적, 서명된 계약, 은행 송금으로 증빙하는 2단계 결제, 잔금 전 키갈리 검사.",
    "title": "르완다 프랑 견적으로 차량 수입",
    "lede": "일본, 한국, 중국에서 모델을 고르세요. 키갈리 도착 기준으로 견적을 드리고, 계약에 서명한 뒤 두 번에 나누어 은행 송금과 증빙으로 결제합니다. 두 번째 결제 전에 키갈리에서 차량을 검사합니다.",
    "ctaRequest": "견적 요청",
    "ctaEstimate": "관세 계산",
    "modelsCount": "{{count}}개 모델",
    "stepsTitle": "수입 주문 절차",
    "stepsLede": "모든 단계는 날짜와 함께 대시보드와 앱의 주문 상태로 표시됩니다.",
    "steps": {
      "request": {
        "t": "요청",
        "b": "원하는 모델, 원산지, 연식과 참고 사항."
      },
      "quote": {
        "t": "프랑 견적",
        "b": "키갈리 도착 기준 단일 금액과 포함 내역."
      },
      "agreement": {
        "t": "계약 서명",
        "b": "견적은 버전이 관리되는 수입 계약이 되며 대시보드나 앱에서 수락합니다."
      },
      "deposit": {
        "t": "1차: 계약금",
        "b": "주문 번호를 기재해 은행 송금으로 50%. 증빙을 올리면 팀이 확인합니다."
      },
      "shipping": {
        "t": "주문 및 선적",
        "b": "차량 구매, 선적 예약, 키갈리까지 운송 추적."
      },
      "inspection": {
        "t": "키갈리 검사",
        "b": "도착 후 추가 결제 전에 키갈리에서 검사합니다."
      },
      "balance": {
        "t": "2차: 잔금",
        "b": "나머지 50%도 동일하게: 참조 번호로 송금, 증빙 업로드 및 확인."
      },
      "handover": {
        "t": "통관 및 인도",
        "b": "키갈리 통관 후 차량 인수 준비 완료."
      }
    },
    "payTitle": "결제 방법",
    "payBody": "각 결제는 주문서에 기재된 계좌로 참조 번호를 적어 은행 송금합니다. 카드 결제, 에스크로, 보증은 없습니다. 송금 증빙을 올리면 팀이 확인한 후 주문이 진행됩니다.",
    "catalogTitle": "수입 가능한 모델",
    "catalogLede": "원산지별 카탈로그. 제조사를 선택해 라인업을 보세요. 그 외 모델은 요청에 적어 주세요.",
    "allOrigins": "전체 원산지",
    "transitDays": "해상 약 {{days}}일",
    "fromPort": "{{port}} 출발",
    "typicalFob": "현지 통상 가격 {{amount}}",
    "requestThis": "이 모델 요청",
    "showAll": "{{count}}개 모델 모두 보기",
    "catalogEmpty": "지금은 카탈로그를 볼 수 없습니다. 아래에서 원하는 모델을 요청할 수 있습니다.",
    "estimateTitle": "도착 비용 계산",
    "estimateLede": "배기량과 연식에 따른 르완다 관세 추정치입니다. 계획용이며 실제 금액은 견적서 기준입니다.",
    "prefilled": "검색에서 자동 입력: 오늘 환율 기준 {{usd}}, {{year}}년식.",
    "requestTitle": "견적 요청",
    "requestLede": "무료이며 약정이 없습니다. 대시보드와 이메일로 프랑 견적을 받습니다.",
    "origin": "수입 국가",
    "make": "제조사",
    "model": "모델",
    "year": "연식 (선택)",
    "notes": "참고 사항 (선택)",
    "notesHint": "색상, 트림, 예산, 수출업체 매물 링크.",
    "submit": "요청 보내기",
    "sending": "보내는 중…",
    "signInTitle": "견적을 요청하려면 로그인하세요",
    "signInBody": "견적, 계약, 결제는 계정에 저장되므로 계정이 필요합니다.",
    "signIn": "로그인",
    "createAccount": "계정 만들기",
    "errorRequired": "원산지를 고르고 제조사와 모델을 입력하세요.",
    "errorFailed": "요청을 보내지 못했습니다. 다시 시도하거나 WhatsApp으로 문의하세요.",
    "origins": {
      "Japan": "일본",
      "South Korea": "한국",
      "China": "중국",
      "United Arab Emirates": "아랍에미리트",
      "Europe": "유럽",
      "Other": "기타"
    }
  },
  zh: {
    "metaTitle": "进口汽车到卢旺达",
    "metaDescription": "从日本、韩国或中国进口汽车到基加利：卢旺达法郎报价、签署协议、两次凭银行转账证明的阶段付款，以及付尾款前的基加利检测。",
    "title": "以卢旺达法郎报价进口汽车",
    "lede": "从日本、韩国或中国选择车型。我们报出运抵基加利的价格，您签署协议，分两次付款，每次通过银行转账并提供凭证。第二笔付款前，车辆会在基加利接受检测。",
    "ctaRequest": "申请报价",
    "ctaEstimate": "估算关税",
    "modelsCount": "{{count}} 款车型",
    "stepsTitle": "进口订单流程",
    "stepsLede": "每一步都会作为带日期的订单状态显示在您的控制台和应用中。",
    "steps": {
      "request": {
        "t": "提交申请",
        "b": "您想要的车型、产地和年份，以及其他需要我们了解的信息。"
      },
      "quote": {
        "t": "以法郎报价",
        "b": "运抵基加利的一个总价，并列明所含项目。"
      },
      "agreement": {
        "t": "签署协议",
        "b": "报价会生成带版本的进口协议，您在控制台或应用中确认。"
      },
      "deposit": {
        "t": "第一笔：定金",
        "b": "通过银行转账支付50%，注明订单编号。上传凭证后由我们的团队核对。"
      },
      "shipping": {
        "t": "下单与运输",
        "b": "车辆完成采购、订舱，并跟踪运输至基加利。"
      },
      "inspection": {
        "t": "基加利检测",
        "b": "车辆到达后，在您支付其余款项前先在基加利检测。"
      },
      "balance": {
        "t": "第二笔：尾款",
        "b": "其余50%同样处理：注明编号转账，上传凭证并核对。"
      },
      "handover": {
        "t": "清关与交车",
        "b": "在基加利清关后，车辆即可提取。"
      }
    },
    "payTitle": "付款方式",
    "payBody": "每笔款项都通过银行转账支付到订单上注明的账户，并注明编号。不支持刷卡，没有托管，也没有担保：您上传转账凭证，我们的团队核对后订单才会继续。",
    "catalogTitle": "可采购车型",
    "catalogLede": "按产地分类的目录。选择品牌查看车型；其他车型可在申请中注明。",
    "allOrigins": "全部产地",
    "transitDays": "海运约 {{days}} 天",
    "fromPort": "自 {{port}}",
    "typicalFob": "海外常见价格 {{amount}}",
    "requestThis": "申请此车型",
    "showAll": "显示全部 {{count}} 款车型",
    "catalogEmpty": "目录暂时不可用。您仍可在下方申请任何车型。",
    "estimateTitle": "估算到岸成本",
    "estimateLede": "按排量和车龄估算卢旺达关税。仅供规划参考，以正式报价为准。",
    "prefilled": "已根据您的搜索预填：按今日汇率 {{usd}}，{{year}} 年款。",
    "requestTitle": "申请报价",
    "requestLede": "免费且无需承诺。您会在控制台和邮件中收到法郎报价。",
    "origin": "进口自",
    "make": "品牌",
    "model": "车型",
    "year": "年份（可选）",
    "notes": "其他说明（可选）",
    "notesHint": "颜色、配置、预算、出口商车源链接。",
    "submit": "发送申请",
    "sending": "发送中…",
    "signInTitle": "登录后申请报价",
    "signInBody": "您的报价、协议和付款都保存在账户中，因此需要登录。",
    "signIn": "登录",
    "createAccount": "创建账户",
    "errorRequired": "请选择产地并填写品牌和车型。",
    "errorFailed": "申请未能发送。请重试，或通过 WhatsApp 联系我们。",
    "origins": {
      "Japan": "日本",
      "South Korea": "韩国",
      "China": "中国",
      "United Arab Emirates": "阿联酋",
      "Europe": "欧洲",
      "Other": "其他"
    }
  },
}
