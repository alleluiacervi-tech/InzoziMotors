// Message section: home. One subtree per locale, all sharing the shape of `en`.
// English is complete first; other locales fall back to it per missing key.
import type { Locale } from '../config'

export const home: Record<Locale, Record<string, unknown>> = {
  en: {
    hero: {
      eyebrow: "Rwanda's trusted mobility marketplace",
      title: 'The right car. The confidence to move.',
      subtitle:
        'Compare reviewed listings, contact verified sellers and agree your own sale or rental with clear information upfront.',
      navLabel: 'Choose what you want to do',
      nav: { buy: 'Buy', rent: 'Rent', sell: 'Sell', tools: 'Car tools' },
      searchLabel: 'Search certified cars',
      searchPlaceholder: 'Toyota RAV4, automatic SUV, diesel…',
      searchButton: 'Search',
      trust: {
        inspection: '150-point inspection',
        sellers: 'Verified sellers',
        contact: 'Direct contact, no checkout',
      },
    },
    browse: {
      eyebrow: 'Browse',
      title: 'Start where buyers start',
      family: { suv: 'SUVs', sedan: 'Sedans', hatchback: 'Hatchbacks', pickup: 'Pickups' },
      familyMeta: 'Certified · Kigali',
      budget: {
        under: 'Under 10M RWF',
        band1: '10 – 20M RWF',
        band2: '20 – 35M RWF',
        top: '35M+ RWF',
      },
    },
    featured: {
      eyebrow: 'Just listed',
      title: 'Certified and available now',
      description: 'Fresh from inspection at our Kigali centers.',
      viewAll: 'View all cars',
      emptyTitle: 'The marketplace is briefly unreachable',
      emptyDescription: 'The cars are still there — browse directly, or check back in a moment.',
      emptyAction: 'Browse all cars',
    },
    topDeals: {
      eyebrow: 'Top deals',
      title: 'Picked by our team this week',
      description: 'Chosen from cars that passed the 150-point inspection. Paid placements say so.',
      viewAll: 'View all cars',
    },
    howItWorks: {
      eyebrow: 'How it works',
      title: 'Submission to direct enquiry, in five steps',
      description:
        'Our team controls the evidence and publication stages. The seller controls the resulting negotiation.',
      link: 'Buying safety, direct deals, and how selling works',
    },
    trust: {
      eyebrow: 'Marketplace controls',
      title: 'Evidence before contact',
      description:
        'Sawa Cars controls verification and publication. Users retain control—and responsibility—for the deal itself.',
      link: 'See the controls and their limits',
      fact: {
        inspection: 'point inspection, published in full',
        gallery: 'gallery images supported per listing',
        payments: 'payments processed by Sawa Cars',
        centers: 'Kigali inspection centers',
      },
      ledger: {
        evidence: {
          claim: 'Inspection evidence',
          proof:
            'Publication checks require a completed inspection when the platform inspection policy is enabled.',
        },
        seller: {
          claim: 'Verified seller status',
          proof: 'A listing cannot go live for a suspended, deleted or identity-unverified seller.',
        },
        guessing: {
          claim: 'Evidence without guessing',
          proof:
            'Ownership, mileage and RRA duty status are checked — unknowns are labelled unknown, never guessed.',
        },
        publication: {
          claim: 'Controlled publication',
          proof:
            'Only authorized administrators publish, with the decision and readiness result retained in the audit history.',
        },
        direct: {
          claim: 'Direct transactions',
          proof:
            'Sawa Cars does not accept, hold or route user transaction funds and does not create the parties’ contract.',
        },
      },
    },
    finalCta: {
      headline:
        'Every car here passed the same 150-point inspection. There is no uninspected tier.',
      browse: 'Browse certified cars',
      sell: 'Sell your car',
      body: 'Review the listing evidence, contact the verified seller, then inspect, negotiate and document your own agreement. Sawa Cars never takes custody of the transaction funds.',
      imageAlt: 'A vehicle undergoing wheel alignment in a professional inspection workshop',
    },
    faq: { eyebrow: 'Questions', title: 'Before you commit' },
  },

  rw: {
    hero: {
      eyebrow: 'Isoko ry’imodoka ryizewe mu Rwanda',
      title: 'Imodoka ikwiye. Icyizere cyo kugenda.',
      subtitle:
        'Gereranya amatangazo yasuzumwe, uvugane n’abagurisha bemejwe, kandi wumvikane wenyine ku igurisha cyangwa ubukode hamwe n’amakuru asobanutse mbere.',
      navLabel: 'Hitamo icyo ushaka gukora',
      nav: { buy: 'Gura', rent: 'Kodesha', sell: 'Gurisha', tools: 'Ibikoresho' },
      searchLabel: 'Shakisha imodoka zemewe',
      searchPlaceholder: 'Toyota RAV4, SUV ya automatique, mazutu…',
      searchButton: 'Shakisha',
      trust: {
        inspection: 'Isuzuma ry’ingingo 150',
        sellers: 'Abagurisha bemejwe',
        contact: 'Ukuvugana butaziguye, nta kwishyura',
      },
    },
    browse: {
      eyebrow: 'Reba',
      title: 'Tangirira aho abaguzi batangirira',
      family: { suv: 'SUV', sedan: 'Sedani', hatchback: 'Hatchback', pickup: 'Pikapu' },
      familyMeta: 'Byemejwe · Kigali',
      budget: {
        under: 'Munsi ya 10M RWF',
        band1: '10 – 20M RWF',
        band2: '20 – 35M RWF',
        top: '35M+ RWF',
      },
    },
    featured: {
      eyebrow: 'Amaze gutangazwa',
      title: 'Zemewe kandi zihari ubu',
      description: 'Ziva mu isuzuma mu bigo byacu byo i Kigali.',
      viewAll: 'Reba imodoka zose',
      emptyTitle: 'Isoko ntirigeze ryagerwaho by’agateganyo',
      emptyDescription: 'Imodoka ziracyahari — reba ku buryo butaziguye, cyangwa ugaruke nyuma y’akanya.',
      emptyAction: 'Reba imodoka zose',
    },
    topDeals: {
      eyebrow: 'Ibiciro byiza',
      title: 'Byatoranyijwe n’ikipe yacu iyi cyumweru',
      description:
        'Zatoranyijwe mu modoka zatsinze isuzuma ry’ingingo 150. Ahishyuriwe harabivuga.',
      viewAll: 'Reba imodoka zose',
    },
    howItWorks: {
      eyebrow: 'Uko bikorwa',
      title: 'Kuva ku isaba kugeza ku kubaza butaziguye, mu ntambwe eshanu',
      description:
        'Ikipe yacu igenzura ibimenyetso n’intambwe zo gutangaza. Umugurisha agenzura imishyikirano ikurikira.',
      link: 'Umutekano wo kugura, ubucuruzi butaziguye, n’uko kugurisha bikorwa',
    },
    trust: {
      eyebrow: 'Igenzura ry’isoko',
      title: 'Ibimenyetso mbere yo kuvugana',
      description:
        'Sawa Cars igenzura kwemeza no gutangaza. Abakoresha bagumana ubwo bwigenge—n’uburyozwe—ku bijyanye n’isezerano ubwaryo.',
      link: 'Reba igenzura n’aho rigarukira',
      fact: {
        inspection: 'ingingo z’isuzuma, zitangajwe zuzuye',
        gallery: 'amafoto ashyigikiwe kuri buri tangazo',
        payments: 'ubwishyu bunyuze kuri Sawa Cars',
        centers: 'ibigo by’isuzuma i Kigali',
      },
      ledger: {
        evidence: {
          claim: 'Ibimenyetso by’isuzuma',
          proof:
            'Kugenzura gutangaza bisaba isuzuma ryuzuye igihe politiki y’isuzuma y’urubuga ikoreshwa.',
        },
        seller: {
          claim: 'Imiterere y’umugurisha wemejwe',
          proof:
            'Itangazo ntirishobora kujya ku mugaragaro ku mugurisha wahagaritswe, wasibwe cyangwa utaremejwe.',
        },
        guessing: {
          claim: 'Ibimenyetso bidakekwa',
          proof:
            'Nyir’imodoka, ibirometero na sitati y’umusoro wa RRA birasuzumwa — ibitazwi bishyirwaho ko bitazwi, ntibikekwa.',
        },
        publication: {
          claim: 'Gutangaza kugenzuwe',
          proof:
            'Abayobozi bemewe gusa ni bo batangaza, icyemezo n’ibisubizo by’ubwiteguro bikabikwa mu mateka y’igenzura.',
        },
        direct: {
          claim: 'Ibikorwa by’ubucuruzi butaziguye',
          proof:
            'Sawa Cars ntiyakira, ntibika cyangwa ntinyuza amafaranga y’abakoresha kandi ntikora amasezerano y’impande.',
        },
      },
    },
    finalCta: {
      headline:
        'Buri modoka hano yatsinze isuzuma rimwe ry’ingingo 150. Nta rwego rw’imodoka zitasuzumwe rihari.',
      browse: 'Reba imodoka zemewe',
      sell: 'Gurisha imodoka yawe',
      body: 'Reba ibimenyetso by’itangazo, uvugane n’umugurisha wemejwe, hanyuma usuzume, uganire kandi wandike isezerano ryawe bwite. Sawa Cars ntibika na rimwe amafaranga y’ubucuruzi.',
      imageAlt: 'Imodoka irimo gukorwaho iringaniza y’amapine mu kigo cy’isuzuma cy’umwuga',
    },
    faq: { eyebrow: 'Ibibazo', title: 'Mbere yo kwiyemeza' },
  },

  fr: {
    hero: {
      eyebrow: 'Le marché de la mobilité de confiance au Rwanda',
      title: 'La bonne voiture. La confiance d’avancer.',
      subtitle:
        'Comparez des annonces vérifiées, contactez des vendeurs certifiés et convenez vous-même de votre vente ou de votre location avec des informations claires dès le départ.',
      navLabel: 'Choisissez ce que vous voulez faire',
      nav: { buy: 'Acheter', rent: 'Louer', sell: 'Vendre', tools: 'Outils auto' },
      searchLabel: 'Rechercher des voitures certifiées',
      searchPlaceholder: 'Toyota RAV4, SUV automatique, diesel…',
      searchButton: 'Rechercher',
      trust: {
        inspection: 'Inspection en 150 points',
        sellers: 'Vendeurs vérifiés',
        contact: 'Contact direct, sans paiement',
      },
    },
    browse: {
      eyebrow: 'Parcourir',
      title: 'Commencez là où commencent les acheteurs',
      family: { suv: 'SUV', sedan: 'Berlines', hatchback: 'Compactes', pickup: 'Pick-up' },
      familyMeta: 'Certifié · Kigali',
      budget: {
        under: 'Moins de 10M RWF',
        band1: '10 – 20M RWF',
        band2: '20 – 35M RWF',
        top: '35M+ RWF',
      },
    },
    featured: {
      eyebrow: 'À l’instant',
      title: 'Certifiées et disponibles maintenant',
      description: 'Fraîchement inspectées dans nos centres de Kigali.',
      viewAll: 'Voir toutes les voitures',
      emptyTitle: 'Le marché est momentanément inaccessible',
      emptyDescription: 'Les voitures sont toujours là — parcourez directement ou revenez dans un instant.',
      emptyAction: 'Voir toutes les voitures',
    },
    topDeals: {
      eyebrow: 'Meilleures offres',
      title: 'Sélectionnées par notre équipe cette semaine',
      description:
        'Choisies parmi les voitures ayant réussi l’inspection en 150 points. Les placements payants sont signalés.',
      viewAll: 'Voir toutes les voitures',
    },
    howItWorks: {
      eyebrow: 'Comment ça marche',
      title: 'De la soumission à la demande directe, en cinq étapes',
      description:
        'Notre équipe gère les étapes de preuve et de publication. Le vendeur gère la négociation qui en découle.',
      link: 'Sécurité d’achat, transactions directes et fonctionnement de la vente',
    },
    trust: {
      eyebrow: 'Contrôles du marché',
      title: 'Les preuves avant le contact',
      description:
        'Sawa Cars gère la vérification et la publication. Les utilisateurs gardent le contrôle—et la responsabilité—de la transaction elle-même.',
      link: 'Voir les contrôles et leurs limites',
      fact: {
        inspection: 'points d’inspection, publiés intégralement',
        gallery: 'images de galerie prises en charge par annonce',
        payments: 'paiements traités par Sawa Cars',
        centers: 'centres d’inspection à Kigali',
      },
      ledger: {
        evidence: {
          claim: 'Preuves d’inspection',
          proof:
            'Les contrôles de publication exigent une inspection terminée lorsque la politique d’inspection de la plateforme est activée.',
        },
        seller: {
          claim: 'Statut de vendeur vérifié',
          proof:
            'Une annonce ne peut pas être mise en ligne pour un vendeur suspendu, supprimé ou non vérifié.',
        },
        guessing: {
          claim: 'Des preuves sans suppositions',
          proof:
            'La propriété, le kilométrage et le statut des droits RRA sont vérifiés — les inconnues sont indiquées comme inconnues, jamais devinées.',
        },
        publication: {
          claim: 'Publication contrôlée',
          proof:
            'Seuls des administrateurs autorisés publient, la décision et le résultat de conformité étant conservés dans l’historique d’audit.',
        },
        direct: {
          claim: 'Transactions directes',
          proof:
            'Sawa Cars n’accepte, ne détient ni n’achemine les fonds des utilisateurs et ne rédige pas le contrat des parties.',
        },
      },
    },
    finalCta: {
      headline:
        'Chaque voiture ici a réussi la même inspection en 150 points. Il n’existe aucune catégorie non inspectée.',
      browse: 'Voir les voitures certifiées',
      sell: 'Vendre votre voiture',
      body: 'Examinez les preuves de l’annonce, contactez le vendeur vérifié, puis inspectez, négociez et documentez vous-même votre accord. Sawa Cars ne prend jamais en charge les fonds de la transaction.',
      imageAlt: 'Un véhicule en cours de parallélisme des roues dans un atelier d’inspection professionnel',
    },
    faq: { eyebrow: 'Questions', title: 'Avant de vous engager' },
  },

  sw: {
    hero: {
      eyebrow: 'Soko la usafiri linaloaminika la Rwanda',
      title: 'Gari sahihi. Ujasiri wa kusonga.',
      subtitle:
        'Linganisha matangazo yaliyokaguliwa, wasiliana na wauzaji waliothibitishwa na ukubaliane mwenyewe kuhusu mauzo au ukodishaji wako kwa taarifa wazi tangu mwanzo.',
      navLabel: 'Chagua unachotaka kufanya',
      nav: { buy: 'Nunua', rent: 'Kodisha', sell: 'Uza', tools: 'Zana za gari' },
      searchLabel: 'Tafuta magari yaliyothibitishwa',
      searchPlaceholder: 'Toyota RAV4, SUV ya automatiki, dizeli…',
      searchButton: 'Tafuta',
      trust: {
        inspection: 'Ukaguzi wa pointi 150',
        sellers: 'Wauzaji waliothibitishwa',
        contact: 'Mawasiliano ya moja kwa moja, bila malipo',
      },
    },
    browse: {
      eyebrow: 'Vinjari',
      title: 'Anza pale wanunuzi wanapoanzia',
      family: { suv: 'SUV', sedan: 'Sedani', hatchback: 'Hatchback', pickup: 'Pikapu' },
      familyMeta: 'Imethibitishwa · Kigali',
      budget: {
        under: 'Chini ya 10M RWF',
        band1: '10 – 20M RWF',
        band2: '20 – 35M RWF',
        top: '35M+ RWF',
      },
    },
    featured: {
      eyebrow: 'Yametangazwa sasa',
      title: 'Yamethibitishwa na yanapatikana sasa',
      description: 'Mapya kutoka ukaguzi katika vituo vyetu vya Kigali.',
      viewAll: 'Angalia magari yote',
      emptyTitle: 'Soko halifikiki kwa muda mfupi',
      emptyDescription: 'Magari bado yapo — vinjari moja kwa moja, au rudi baada ya muda kidogo.',
      emptyAction: 'Angalia magari yote',
    },
    topDeals: {
      eyebrow: 'Ofa bora',
      title: 'Yaliyochaguliwa na timu yetu wiki hii',
      description:
        'Yalichaguliwa kutoka magari yaliyofaulu ukaguzi wa pointi 150. Nafasi zilizolipiwa zinaonyeshwa hivyo.',
      viewAll: 'Angalia magari yote',
    },
    howItWorks: {
      eyebrow: 'Jinsi inavyofanya kazi',
      title: 'Kutoka kuwasilisha hadi ombi la moja kwa moja, katika hatua tano',
      description:
        'Timu yetu inasimamia hatua za ushahidi na uchapishaji. Muuzaji anasimamia mazungumzo yanayofuata.',
      link: 'Usalama wa ununuzi, mikataba ya moja kwa moja, na jinsi uuzaji unavyofanya kazi',
    },
    trust: {
      eyebrow: 'Vidhibiti vya soko',
      title: 'Ushahidi kabla ya mawasiliano',
      description:
        'Sawa Cars inasimamia uthibitishaji na uchapishaji. Watumiaji wanabaki na udhibiti—na uwajibikaji—wa muamala wenyewe.',
      link: 'Ona vidhibiti na mipaka yake',
      fact: {
        inspection: 'pointi za ukaguzi, zilizochapishwa kikamilifu',
        gallery: 'picha za matunzio zinazoungwa mkono kwa kila tangazo',
        payments: 'malipo yaliyoshughulikiwa na Sawa Cars',
        centers: 'vituo vya ukaguzi Kigali',
      },
      ledger: {
        evidence: {
          claim: 'Ushahidi wa ukaguzi',
          proof:
            'Ukaguzi wa uchapishaji unahitaji ukaguzi uliokamilika wakati sera ya ukaguzi ya jukwaa imewashwa.',
        },
        seller: {
          claim: 'Hadhi ya muuzaji aliyethibitishwa',
          proof:
            'Tangazo haliwezi kuchapishwa kwa muuzaji aliyesimamishwa, aliyefutwa au ambaye hakuthibitishwa.',
        },
        guessing: {
          claim: 'Ushahidi bila kubahatisha',
          proof:
            'Umiliki, umbali na hali ya ushuru wa RRA vinakaguliwa — yasiyojulikana yanaandikwa kuwa hayajulikani, hayabahatishwi.',
        },
        publication: {
          claim: 'Uchapishaji unaodhibitiwa',
          proof:
            'Wasimamizi walioidhinishwa pekee ndio huchapisha, uamuzi na matokeo ya utayari yakihifadhiwa katika historia ya ukaguzi.',
        },
        direct: {
          claim: 'Miamala ya moja kwa moja',
          proof:
            'Sawa Cars haipokei, haihifadhi wala haipitishi fedha za miamala ya watumiaji na haiundi mkataba wa pande husika.',
        },
      },
    },
    finalCta: {
      headline:
        'Kila gari hapa limefaulu ukaguzi ule ule wa pointi 150. Hakuna kiwango cha magari yasiyokaguliwa.',
      browse: 'Angalia magari yaliyothibitishwa',
      sell: 'Uza gari lako',
      body: 'Kagua ushahidi wa tangazo, wasiliana na muuzaji aliyethibitishwa, kisha kagua, jadili na uandike makubaliano yako mwenyewe. Sawa Cars kamwe haishiki fedha za muamala.',
      imageAlt: 'Gari likifanyiwa upangaji wa magurudumu katika karakana ya ukaguzi ya kitaalamu',
    },
    faq: { eyebrow: 'Maswali', title: 'Kabla ya kujitolea' },
  },

  ko: {
    hero: {
      eyebrow: '르완다의 신뢰받는 모빌리티 마켓플레이스',
      title: '알맞은 차. 나아갈 자신감.',
      subtitle:
        '검토된 매물을 비교하고, 인증된 판매자에게 연락해, 처음부터 명확한 정보를 바탕으로 직접 판매나 렌트를 합의하세요.',
      navLabel: '원하는 작업을 선택하세요',
      nav: { buy: '구매', rent: '렌트', sell: '판매', tools: '차량 도구' },
      searchLabel: '인증 차량 검색',
      searchPlaceholder: 'Toyota RAV4, 자동 SUV, 디젤…',
      searchButton: '검색',
      trust: {
        inspection: '150개 항목 검사',
        sellers: '인증된 판매자',
        contact: '직접 연락, 결제 없음',
      },
    },
    browse: {
      eyebrow: '둘러보기',
      title: '구매자가 시작하는 곳에서 시작하세요',
      family: { suv: 'SUV', sedan: '세단', hatchback: '해치백', pickup: '픽업' },
      familyMeta: '인증 · 키갈리',
      budget: {
        under: '10M RWF 미만',
        band1: '10 – 20M RWF',
        band2: '20 – 35M RWF',
        top: '35M+ RWF',
      },
    },
    featured: {
      eyebrow: '방금 등록됨',
      title: '인증 완료, 지금 구매 가능',
      description: '키갈리 센터에서 갓 검사를 마쳤습니다.',
      viewAll: '모든 차량 보기',
      emptyTitle: '마켓플레이스에 잠시 연결할 수 없습니다',
      emptyDescription: '차량은 그대로 있습니다 — 바로 둘러보거나 잠시 후 다시 확인하세요.',
      emptyAction: '모든 차량 둘러보기',
    },
    topDeals: {
      eyebrow: '주요 매물',
      title: '이번 주 저희 팀이 선정했습니다',
      description: '150개 항목 검사를 통과한 차량 중에서 선정했습니다. 유료 노출은 표시됩니다.',
      viewAll: '모든 차량 보기',
    },
    howItWorks: {
      eyebrow: '이용 방법',
      title: '접수부터 직접 문의까지, 다섯 단계',
      description:
        '저희 팀이 증빙과 게시 단계를 관리합니다. 이후의 협상은 판매자가 관리합니다.',
      link: '안전한 구매, 직접 거래, 판매 방식 알아보기',
    },
    trust: {
      eyebrow: '마켓플레이스 관리',
      title: '연락에 앞서 증빙부터',
      description:
        'Sawa Cars는 검증과 게시를 관리합니다. 이용자는 거래 자체에 대한 통제권—그리고 책임—을 갖습니다.',
      link: '관리 항목과 그 한계 보기',
      fact: {
        inspection: '개 항목 검사, 전문 공개',
        gallery: '개 갤러리 이미지, 매물당 지원',
        payments: '건, Sawa Cars가 처리한 결제',
        centers: '개 키갈리 검사 센터',
      },
      ledger: {
        evidence: {
          claim: '검사 증빙',
          proof:
            '플랫폼 검사 정책이 활성화된 경우, 게시 확인에는 완료된 검사가 필요합니다.',
        },
        seller: {
          claim: '인증된 판매자 상태',
          proof:
            '정지·삭제되었거나 신원이 인증되지 않은 판매자의 매물은 게시될 수 없습니다.',
        },
        guessing: {
          claim: '추측 없는 증빙',
          proof:
            '소유권, 주행거리, RRA 관세 상태를 확인합니다 — 알 수 없는 항목은 알 수 없음으로 표시하며 결코 추측하지 않습니다.',
        },
        publication: {
          claim: '통제된 게시',
          proof:
            '승인된 관리자만 게시하며, 결정과 준비 상태 결과는 감사 기록에 보관됩니다.',
        },
        direct: {
          claim: '직접 거래',
          proof:
            'Sawa Cars는 이용자의 거래 자금을 받거나 보관하거나 전달하지 않으며, 당사자 간 계약을 작성하지 않습니다.',
        },
      },
    },
    finalCta: {
      headline:
        '여기 있는 모든 차량은 동일한 150개 항목 검사를 통과했습니다. 미검사 등급은 없습니다.',
      browse: '인증 차량 둘러보기',
      sell: '내 차량 판매',
      body: '매물 증빙을 검토하고 인증된 판매자에게 연락한 뒤, 직접 점검·협상하고 합의 내용을 문서로 남기세요. Sawa Cars는 결코 거래 자금을 보관하지 않습니다.',
      imageAlt: '전문 검사 작업장에서 휠 얼라인먼트를 받고 있는 차량',
    },
    faq: { eyebrow: '질문', title: '결정하기 전에' },
  },

  zh: {
    hero: {
      eyebrow: '卢旺达值得信赖的出行市场',
      title: '合适的车，出行的信心。',
      subtitle:
        '比较经过审核的车源，联系已验证的卖家，凭借提前掌握的清晰信息，自行达成买卖或租赁协议。',
      navLabel: '选择您想做的事',
      nav: { buy: '购买', rent: '租赁', sell: '出售', tools: '用车工具' },
      searchLabel: '搜索认证车辆',
      searchPlaceholder: '丰田 RAV4，自动挡SUV，柴油…',
      searchButton: '搜索',
      trust: {
        inspection: '150项检测',
        sellers: '已验证卖家',
        contact: '直接联系，无需结账',
      },
    },
    browse: {
      eyebrow: '浏览',
      title: '从买家的起点开始',
      family: { suv: 'SUV', sedan: '轿车', hatchback: '掀背车', pickup: '皮卡' },
      familyMeta: '认证 · 基加利',
      budget: {
        under: '低于 10M RWF',
        band1: '10 – 20M RWF',
        band2: '20 – 35M RWF',
        top: '35M+ RWF',
      },
    },
    featured: {
      eyebrow: '新上架',
      title: '已认证，现车在售',
      description: '刚从我们基加利中心完成检测。',
      viewAll: '查看所有车辆',
      emptyTitle: '市场暂时无法访问',
      emptyDescription: '车辆仍然都在——可直接浏览，或稍后再来查看。',
      emptyAction: '浏览所有车辆',
    },
    topDeals: {
      eyebrow: '精选优惠',
      title: '本周由我们团队精选',
      description: '从通过150项检测的车辆中挑选。付费展示位会明确标注。',
      viewAll: '查看所有车辆',
    },
    howItWorks: {
      eyebrow: '运作方式',
      title: '从提交到直接咨询，共五步',
      description:
        '我们的团队把控证据与发布环节，卖家把控后续的协商。',
      link: '了解购车安全、直接交易及卖车流程',
    },
    trust: {
      eyebrow: '市场管控',
      title: '先有证据，再联系',
      description:
        'Sawa Cars 负责核实与发布。用户则掌握——也承担——交易本身的控制权与责任。',
      link: '查看管控内容及其边界',
      fact: {
        inspection: '项检测，完整公开',
        gallery: '张相册图片，每个车源均可上传',
        payments: '笔由 Sawa Cars 处理的付款',
        centers: '个基加利检测中心',
      },
      ledger: {
        evidence: {
          claim: '检测证据',
          proof:
            '当平台检测政策启用时，发布审核要求已完成的检测。',
        },
        seller: {
          claim: '已验证的卖家状态',
          proof:
            '被暂停、已删除或身份未验证的卖家，其车源无法上线。',
        },
        guessing: {
          claim: '有据可查，绝不臆测',
          proof:
            '车辆归属、里程及RRA关税状态均经过核查——未知信息标注为未知，绝不臆测。',
        },
        publication: {
          claim: '受控发布',
          proof:
            '只有获授权的管理员才能发布，决定及就绪结果均保留在审计记录中。',
        },
        direct: {
          claim: '直接交易',
          proof:
            'Sawa Cars 不接收、不持有、也不转移用户的交易资金，也不代双方拟定合同。',
        },
      },
    },
    finalCta: {
      headline:
        '这里的每一辆车都通过了同样的150项检测，没有未经检测的等级。',
      browse: '浏览认证车辆',
      sell: '出售您的车辆',
      body: '查看车源证据，联系已验证的卖家，然后自行检测、协商并记录您的协议。Sawa Cars 绝不持有交易资金。',
      imageAlt: '一辆车正在专业检测车间接受车轮定位检测',
    },
    faq: { eyebrow: '常见问题', title: '在您决定之前' },
  },
}
