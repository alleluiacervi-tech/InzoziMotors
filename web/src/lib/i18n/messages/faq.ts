// Message section: faq. Shared by the homepage and /how-it-works, both of which
// render FaqAccordion over the FAQS data in lib/site. Each FAQS item carries a
// stable `id`; FaqAccordion looks up `faq.<id>.q` / `faq.<id>.a` here and falls
// back to the item's English text. The answers state the product's legal
// position (no payment, no guarantee, not a party to deals) and must keep that
// meaning exactly in every language.
import type { Locale } from '../config'

export const faq: Record<Locale, Record<string, unknown>> = {
  en: {
    pay: {
      q: 'Do I pay anything through the app or website?',
      a: 'No. Sawa Cars has no checkout or payment gateway for vehicle sales or rentals. Buyers, sellers and rental providers decide payment and contract arrangements directly and should document them carefully.',
    },
    inspection: {
      q: 'What does the 150-point inspection actually cover?',
      a: 'Seven categories: engine and drivetrain, brakes and steering, body and exterior, interior and comfort, electronics and safety, tyres and wheels, and documentation. Every item is graded pass, flag or fail, and the full report is published on the listing before you commit.',
    },
    guarantee: {
      q: 'Does Sawa Cars guarantee the transaction?',
      a: 'No. Sawa Cars reviews listings and seller eligibility, but it does not guarantee a vehicle, payment, rental deposit, contract, delivery or outcome between users. Always inspect, verify and agree terms in writing.',
    },
    listing: {
      q: 'Can sellers list cars themselves?',
      a: 'Sellers submit vehicle information and can manage approved listing details, but only an authorized administrator can make a listing public after the required checks.',
    },
    cost: {
      q: 'What does it cost to sell?',
      a: 'Any commercial service or listing charges are communicated separately by Sawa Cars and are not collected through a buyer–seller payment gateway. A vehicle transaction itself is always between the users.',
    },
    reserve: {
      q: 'Does contacting a seller reserve a car?',
      a: 'No. Contacting a seller starts a conversation only. Availability remains the seller’s responsibility until you and the seller make your own agreement.',
    },
    appOrWeb: {
      q: 'Do I need the mobile app, or can I do everything on the web?',
      a: 'Browsing, inspection information, saved cars, direct seller contact and your account work on the web. The app adds camera capture, push notifications and a more convenient messaging experience.',
    },
    areas: {
      q: 'Which areas do you cover?',
      a: 'We operate inspection services across Kigali. Listings show the location supplied for each vehicle. Buyer and seller decide where to view or exchange a vehicle.',
    },
  },
  rw: {
    pay: {
      q: 'Hari icyo nishyura binyuze kuri porogaramu cyangwa urubuga?',
      a: 'Oya. Sawa Cars nta buryo bwo kwishyura cyangwa kwakira amafaranga ku igurishwa cyangwa ubukode bw’imodoka ifite. Abaguzi, abagurisha n’abakodesha ni bo bumvikana ku buryo bw’ubwishyu n’amasezerano ubwabo, kandi bagomba kubyandika neza.',
    },
    inspection: {
      q: 'Isuzuma ry’ingingo 150 rirebana n’iki koko?',
      a: 'Ibyiciro birindwi: moteri n’ibiyikwereza, feri n’imikorere yo kuyobora, umubiri n’inyuma, imbere n’ineza, ibyuma bikoresha amashanyarazi n’umutekano, amapine n’amapfundo, n’inyandiko. Buri kintu gihabwa amanota (byatsinze, gukurikiranwa cyangwa byanze), kandi raporo yuzuye ishyirwa ku itangazo mbere y’uko wemeza.',
    },
    guarantee: {
      q: 'Ese Sawa Cars iratanga icyemezo ku bucuruzi?',
      a: 'Oya. Sawa Cars isuzuma amatangazo no kuba umugurisha yujuje ibisabwa, ariko ntitanga garanti ku modoka, ubwishyu, ingwate y’ubukode, amasezerano, gutanga cyangwa ku byavamo hagati y’abakoresha. Buri gihe suzuma, genzura kandi mwumvikane ku mabwiriza mu nyandiko.',
    },
    listing: {
      q: 'Ese abagurisha bashobora gushyira imodoka ku isoko ubwabo?',
      a: 'Abagurisha batanga amakuru y’imodoka kandi bashobora gucunga amakuru y’itangazo ryemejwe, ariko ni umuyobozi wemewe wenyine ushobora gutuma itangazo rigaragara ku bantu nyuma y’isuzuma risabwa.',
    },
    cost: {
      q: 'Kugurisha bihenda bite?',
      a: 'Amafaranga yose ya serivisi cyangwa ay’itangazo amenyeshwa ukwayo na Sawa Cars kandi ntakusanywa binyuze mu buryo bw’ubwishyu hagati y’umuguzi n’umugurisha. Ubucuruzi bw’imodoka ubwabwo buhora hagati y’abakoresha.',
    },
    reserve: {
      q: 'Ese kuvugana n’umugurisha bibika imodoka?',
      a: 'Oya. Kuvugana n’umugurisha bitangira ikiganiro gusa. Kuba imodoka iboneka bikomeza kuba inshingano z’umugurisha kugeza igihe wowe n’umugurisha mukoze amasezerano yanyu bwite.',
    },
    appOrWeb: {
      q: 'Ese nkeneye porogaramu ya telefoni, cyangwa nshobora gukora byose ku rubuga?',
      a: 'Gushakisha, amakuru y’isuzuma, imodoka wabitse, kuvugana n’umugurisha ku buryo butaziguye na konti yawe bikorera ku rubuga. Porogaramu yongeraho gufata amafoto na kamera, imenyesha, n’uburyo bworoshye bwo kohererezanya ubutumwa.',
    },
    areas: {
      q: 'Ni ahihe mukorera?',
      a: 'Dutanga serivisi z’isuzuma hirya no hino muri Kigali. Amatangazo yerekana aho imodoka iherereye nk’uko byatanzwe. Umuguzi n’umugurisha ni bo bahitamo aho barebera cyangwa bahererekanyeza imodoka.',
    },
  },
  fr: {
    pay: {
      q: 'Dois-je payer quelque chose via l’application ou le site ?',
      a: "Non. Sawa Cars n’a aucun paiement ni passerelle de paiement pour la vente ou la location de véhicules. Les acheteurs, vendeurs et loueurs conviennent directement des modalités de paiement et de contrat, et doivent les documenter soigneusement.",
    },
    inspection: {
      q: 'Que couvre réellement l’inspection en 150 points ?',
      a: 'Sept catégories : moteur et transmission, freins et direction, carrosserie et extérieur, intérieur et confort, électronique et sécurité, pneus et roues, et documentation. Chaque point est noté réussi, signalé ou échoué, et le rapport complet est publié sur l’annonce avant que vous ne vous engagiez.',
    },
    guarantee: {
      q: 'Sawa Cars garantit-elle la transaction ?',
      a: "Non. Sawa Cars vérifie les annonces et l’éligibilité des vendeurs, mais ne garantit ni le véhicule, ni le paiement, ni la caution de location, ni le contrat, ni la livraison, ni le résultat entre utilisateurs. Inspectez, vérifiez et convenez toujours des conditions par écrit.",
    },
    listing: {
      q: 'Les vendeurs peuvent-ils publier leurs voitures eux-mêmes ?',
      a: 'Les vendeurs soumettent les informations du véhicule et peuvent gérer les détails d’une annonce approuvée, mais seul un administrateur autorisé peut rendre une annonce publique après les contrôles requis.',
    },
    cost: {
      q: 'Combien coûte la vente ?',
      a: 'Les éventuels frais de service ou de mise en ligne sont communiqués séparément par Sawa Cars et ne sont pas prélevés via une passerelle de paiement acheteur–vendeur. La transaction du véhicule elle-même se fait toujours entre les utilisateurs.',
    },
    reserve: {
      q: 'Contacter un vendeur réserve-t-il une voiture ?',
      a: 'Non. Contacter un vendeur ne fait qu’ouvrir une conversation. La disponibilité reste la responsabilité du vendeur jusqu’à ce que vous et le vendeur concluiez votre propre accord.',
    },
    appOrWeb: {
      q: 'Ai-je besoin de l’application mobile, ou puis-je tout faire sur le web ?',
      a: 'La navigation, les informations d’inspection, les voitures enregistrées, le contact direct avec le vendeur et votre compte fonctionnent sur le web. L’application ajoute la capture par appareil photo, les notifications et une messagerie plus pratique.',
    },
    areas: {
      q: 'Quelles zones couvrez-vous ?',
      a: 'Nous assurons des services d’inspection à Kigali. Les annonces indiquent le lieu fourni pour chaque véhicule. L’acheteur et le vendeur décident où voir ou échanger un véhicule.',
    },
  },
  sw: {
    pay: {
      q: 'Je, ninalipa chochote kupitia programu au tovuti?',
      a: 'Hapana. Sawa Cars haina malipo wala mfumo wa malipo kwa mauzo au ukodishaji wa magari. Wanunuzi, wauzaji na watoa huduma za ukodishaji hukubaliana wenyewe kuhusu malipo na mikataba, na wanapaswa kuyaandika kwa makini.',
    },
    inspection: {
      q: 'Ukaguzi wa pointi 150 unahusu nini hasa?',
      a: 'Makundi saba: injini na mfumo wa uendeshaji, breki na usukani, mwili na nje, ndani na starehe, elektroniki na usalama, matairi na magurudumu, na nyaraka. Kila kipengele hupewa alama (kimefaulu, kimeonywa au kimeshindwa), na ripoti kamili huchapishwa kwenye tangazo kabla hujaamua.',
    },
    guarantee: {
      q: 'Je, Sawa Cars inadhamini muamala?',
      a: 'Hapana. Sawa Cars hukagua matangazo na ustahiki wa muuzaji, lakini haidhamini gari, malipo, amana ya ukodishaji, mkataba, uwasilishaji wala matokeo kati ya watumiaji. Daima kagua, thibitisha na kubaliana masharti kwa maandishi.',
    },
    listing: {
      q: 'Je, wauzaji wanaweza kutangaza magari wenyewe?',
      a: 'Wauzaji huwasilisha taarifa za gari na wanaweza kusimamia maelezo ya tangazo lililoidhinishwa, lakini ni msimamizi aliyeidhinishwa pekee anayeweza kulifanya tangazo lionekane kwa umma baada ya ukaguzi unaohitajika.',
    },
    cost: {
      q: 'Kuuza kunagharimu kiasi gani?',
      a: 'Gharama zozote za huduma au za tangazo huwasilishwa kando na Sawa Cars na hazikusanywi kupitia mfumo wa malipo kati ya mnunuzi na muuzaji. Muamala wa gari wenyewe daima uko kati ya watumiaji.',
    },
    reserve: {
      q: 'Je, kuwasiliana na muuzaji kunahifadhi gari?',
      a: 'Hapana. Kuwasiliana na muuzaji huanzisha mazungumzo tu. Upatikanaji unabaki kuwa jukumu la muuzaji hadi wewe na muuzaji mfikie makubaliano yenu wenyewe.',
    },
    appOrWeb: {
      q: 'Je, ninahitaji programu ya simu, au ninaweza kufanya kila kitu kwenye wavuti?',
      a: 'Kuvinjari, taarifa za ukaguzi, magari yaliyohifadhiwa, mawasiliano ya moja kwa moja na muuzaji na akaunti yako hufanya kazi kwenye wavuti. Programu huongeza upigaji picha kwa kamera, arifa, na uzoefu rahisi zaidi wa ujumbe.',
    },
    areas: {
      q: 'Mnahudumia maeneo gani?',
      a: 'Tunatoa huduma za ukaguzi jijini Kigali. Matangazo huonyesha mahali palipotolewa kwa kila gari. Mnunuzi na muuzaji huamua wapi pa kuangalia au kubadilishana gari.',
    },
  },
  ko: {
    pay: {
      q: '앱이나 웹사이트를 통해 결제하나요?',
      a: '아니요. Sawa Cars에는 차량 판매나 렌트를 위한 결제나 결제 게이트웨이가 없습니다. 구매자, 판매자, 렌트 제공자가 결제와 계약 조건을 직접 정하며, 이를 신중히 문서로 남겨야 합니다.',
    },
    inspection: {
      q: '150개 항목 검사는 실제로 무엇을 다루나요?',
      a: '일곱 가지 범주: 엔진과 구동계, 브레이크와 조향, 차체와 외관, 실내와 편의, 전자장치와 안전, 타이어와 휠, 서류. 각 항목은 합격·주의·불합격으로 평가되며, 전체 보고서는 구매를 결정하기 전에 매물에 공개됩니다.',
    },
    guarantee: {
      q: 'Sawa Cars가 거래를 보증하나요?',
      a: '아니요. Sawa Cars는 매물과 판매자 자격을 검토하지만, 이용자 간의 차량, 결제, 렌트 보증금, 계약, 인도 또는 결과를 보증하지 않습니다. 항상 점검하고 확인하며 조건을 서면으로 합의하세요.',
    },
    listing: {
      q: '판매자가 직접 차량을 등록할 수 있나요?',
      a: '판매자는 차량 정보를 제출하고 승인된 매물의 세부 정보를 관리할 수 있지만, 필요한 검토를 거친 후 매물을 공개할 수 있는 것은 권한이 있는 관리자뿐입니다.',
    },
    cost: {
      q: '판매 비용은 얼마인가요?',
      a: '상업 서비스나 등록 수수료가 있다면 Sawa Cars가 별도로 안내하며, 구매자–판매자 결제 게이트웨이를 통해 징수하지 않습니다. 차량 거래 자체는 항상 이용자 간에 이루어집니다.',
    },
    reserve: {
      q: '판매자에게 연락하면 차량이 예약되나요?',
      a: '아니요. 판매자에게 연락하는 것은 대화를 시작할 뿐입니다. 판매 가능 여부는 귀하와 판매자가 직접 합의하기 전까지 판매자의 책임으로 남습니다.',
    },
    appOrWeb: {
      q: '모바일 앱이 필요한가요, 아니면 웹에서 모두 가능한가요?',
      a: '둘러보기, 검사 정보, 저장한 차량, 판매자 직접 연락, 계정 이용은 웹에서 가능합니다. 앱은 카메라 촬영, 푸시 알림, 더 편리한 메시지 경험을 더해 줍니다.',
    },
    areas: {
      q: '어느 지역을 다루나요?',
      a: '키갈리 전역에서 검사 서비스를 운영합니다. 매물에는 각 차량에 대해 제공된 위치가 표시됩니다. 차량을 어디서 보거나 교환할지는 구매자와 판매자가 정합니다.',
    },
  },
}
