// Message section: home. One subtree per locale, all sharing the shape of `en`.
// English is complete first; other locales fall back to it per missing key.
import type { Locale } from '../config'

export const home: Record<Locale, Record<string, unknown>> = {
  en: {
    inspection: {
      eyebrow: 'The 150-point check',
      title: 'What the score is made of',
      description:
        'Seven categories, weighted as the checklist weights them.',
      category: {
        engine: 'Engine & drivetrain',
        brakes: 'Brakes & steering',
        body: 'Body & exterior',
        interior: 'Interior & comfort',
        electronics: 'Electronics & safety',
        tyres: 'Tyres & wheels',
        documentation: 'Documentation & roadworthiness',
      },
      criticalCount: '{{count}} critical',
      ruleScore:
        'Each item is one point, so a car is scored out of {{total}}. A listing needs {{threshold}} to be published.',
      ruleCritical:
        '{{critical}} items are critical. One failure blocks publication at any score.',
      link: 'Read the full inspection standard',
    },
    hero: {
      photoAlt:
        'A car raised on a workshop lift with wheel-alignment heads clamped to its wheels',
      eyebrow: "Rwanda's trusted mobility marketplace",
      title: 'The right car. The confidence to move.',
      subtitle:
        'Every car inspected at our Kigali centres. You deal with the seller directly.',
      navLabel: 'Choose what you want to do',
      nav: { buy: 'Buy', rent: 'Rent', sell: 'Sell', tools: 'Car tools' },
      searchLabel: 'Search certified cars',
      searchPlaceholder: 'Toyota RAV4, automatic SUV, diesel…',
      searchButton: 'Search',
      stockEyebrow: 'Just published',
      stockAll: 'See all',
      photoCaption: 'Wheel alignment rig — Sawa inspection centre, Kigali',
      metric: {
        points: 'Inspection points',
        threshold: 'Needed to publish',
        critical: 'Critical items',
      },
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
        independent: {
          claim: 'Independent inspection',
          proof:
            'Sawa Cars inspects the car but never sells it, and earns nothing from the sale.',
        },
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
      imageAlt: 'A row of inspected cars parked at a Sawa lot in Kigali',
    },
    front: {
      headline: 'Cars that passed 150 checks before you saw them.',
      lede: 'Buy, rent or import in Rwanda. Every listing is inspected at our Kigali centres, then you deal with the seller directly.',
      tabsLabel: 'What do you want to do?',
      tab: {
        buy: 'Buy',
        rent: 'Rent',
        import: 'Import',
      },
      make: 'Make',
      anyMake: 'Any make',
      model: 'Model',
      anyModel: 'Any model',
      budget: 'Budget',
      anyBudget: 'Any budget',
      upTo: 'Up to {{amount}}',
      showCars: 'Show cars',
      popular: 'Popular',
      rentLede: 'Inspected cars from verified rental providers, by the day. Ask for your dates; the provider confirms with you directly.',
      rentCount: '{{count}} rental cars available',
      rentCta: 'See rental cars',
      importLede: 'Have a car in mind from Japan or the UAE? See what it costs landed in Kigali, duty included, before you commit.',
      importYear: 'Year',
      importPrice: 'Price abroad (USD)',
      importCta: 'Estimate landed cost',
      cert: {
        title: 'Inspection report',
        best: 'Highest score in stock',
        noCritical: 'No critical failures',
        inspected: 'Inspected {{date}}',
        view: 'View this car',
        bar: 'Publication bar: {{threshold}}',
      },
      stock: {
        title: '{{count}} inspected cars in stock',
        titleOne: '1 inspected car in stock',
        byMake: 'By make',
        byBudget: 'By budget',
        byBody: 'By body type',
        under: 'Under {{amount}}',
        range: '{{from}} to {{to}}',
        over: '{{amount}} and up',
        all: 'See all cars',
      },
      ways: {
        title: 'Three ways to get on the road',
        buyTitle: 'Buy a certified car',
        buyBody: 'Inspected, scored and published by our team. You agree the price with the seller.',
        rentTitle: 'Rent by the day',
        rentBody: 'Inspected rental cars from verified providers in Kigali. Ask for dates; the provider confirms.',
        importTitle: 'Import from Japan or the UAE',
        importBody: 'A quoted order, a signed agreement, and two milestone payments you evidence with bank-transfer proof.',
        buyCta: 'Browse cars',
        rentCta: 'See rentals',
        importCta: 'How importing works',
      },
    },
    faq: { eyebrow: 'Questions', title: 'Before you commit' },
  },

  rw: {
    inspection: {
      eyebrow: 'Isuzuma ry’ingingo 150',
      title: 'Ibigize amanota',
      description:
        'Ibyiciro birindwi, bipimwe nk’uko urutonde rw’isuzuma rubipima.',
      category: {
        engine: 'Moteri n’ibiyikwereza',
        brakes: 'Feri n’ubuyobozi',
        body: 'Umubiri n’inyuma',
        interior: 'Imbere n’ineza',
        electronics: 'Amashanyarazi n’umutekano',
        tyres: 'Amapine n’amapfundo',
        documentation: 'Impapuro n’ubushobozi bwo kugenda',
      },
      criticalCount: '{{count}} by’ingenzi',
      ruleScore:
        'Buri kintu ni inota rimwe, bityo imodoka ipimwa kuri {{total}}. Itangazo risaba {{threshold}} kugira ngo ritangazwe.',
      ruleCritical:
        'Ibintu {{critical}} ni by’ingenzi. Kimwe kidatsinze kibuza gutangaza uko amanota ari.',
      link: 'Soma urwego rw’isuzuma rwuzuye',
    },
    hero: {
      photoAlt:
        'Imodoka izamuwe ku gikoresho cyo mu ruganda, ifite ibyuma bipima ubushyuhe bw’amapine bifatanye n’amapine yayo',
      eyebrow: 'Isoko ry’imodoka ryizewe mu Rwanda',
      title: 'Imodoka ikwiye. Icyizere cyo kugenda.',
      subtitle:
        'Imodoka zose zisuzumwa mu bigo byacu i Kigali. Uvugana n’umugurisha ku buryo butaziguye.',
      navLabel: 'Hitamo icyo ushaka gukora',
      nav: { buy: 'Gura', rent: 'Kodesha', sell: 'Gurisha', tools: 'Ibikoresho' },
      searchLabel: 'Shakisha imodoka zemewe',
      searchPlaceholder: 'Toyota RAV4, SUV ya automatique, mazutu…',
      searchButton: 'Shakisha',
      stockEyebrow: 'Biheruka gushyirwaho',
      stockAll: 'Reba byose',
      photoCaption: 'Igikoresho cy’iringaniza ry’amapine — ikigo cy’isuzuma cya Sawa, Kigali',
      metric: {
        points: 'Ingingo z’isuzuma',
        threshold: 'Bisabwa kugira bitangazwe',
        critical: 'Ingingo z’ingenzi',
      },
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
        independent: {
          claim: 'Isuzuma ryigenga',
          proof:
            'Sawa Cars isuzuma imodoka ariko ntiyigurisha, kandi nta nyungu ibona ku igurishwa.',
        },
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
      imageAlt: 'Umurongo w’imodoka zasuzumwe ziparitse ku kibuga cya Sawa i Kigali',
    },
    front: {
      headline: 'Imodoka zatsinze isuzuma 150 mbere y’uko uzibona.',
      lede: 'Gura, kodesha cyangwa utumize imodoka mu Rwanda. Buri modoka isuzumirwa mu bigo byacu i Kigali, hanyuma ukavugana n’umugurisha ubwawe.',
      tabsLabel: 'Urashaka gukora iki?',
      tab: {
        buy: 'Gura',
        rent: 'Kodesha',
        import: 'Tumiza',
      },
      make: 'Ubwoko',
      anyMake: 'Ubwoko bwose',
      model: 'Moderi',
      anyModel: 'Moderi yose',
      budget: 'Ingengo y’imari',
      anyBudget: 'Igiciro cyose',
      upTo: 'Kugeza kuri {{amount}}',
      showCars: 'Erekana imodoka',
      popular: 'Izikunzwe',
      rentLede: 'Imodoka zasuzumwe z’abakodesha bemewe, ku munsi. Saba amatariki yawe; umukodesha akwemeza ubwe.',
      rentCount: 'Imodoka {{count}} zo gukodesha zirahari',
      rentCta: 'Reba imodoka zikodeshwa',
      importLede: 'Hari imodoka wifuza yo mu Buyapani cyangwa UAE? Reba igiciro cyayo igeze i Kigali, harimo n’imisoro, mbere yo kwiyemeza.',
      importYear: 'Umwaka',
      importPrice: 'Igiciro hanze (USD)',
      importCta: 'Bara igiciro igeze hano',
      cert: {
        title: 'Raporo y’isuzuma',
        best: 'Amanota menshi mu zihari',
        noCritical: 'Nta kosa rikomeye',
        inspected: 'Yasuzumwe {{date}}',
        view: 'Reba iyi modoka',
        bar: 'Igipimo cyo gutangaza: {{threshold}}',
      },
      stock: {
        title: 'Imodoka {{count}} zasuzumwe zirahari',
        titleOne: 'Imodoka 1 yasuzumwe irahari',
        byMake: 'Ku bwoko',
        byBudget: 'Ku giciro',
        byBody: 'Ku miterere',
        under: 'Munsi ya {{amount}}',
        range: '{{from}} kugeza {{to}}',
        over: '{{amount}} no hejuru',
        all: 'Reba imodoka zose',
      },
      ways: {
        title: 'Uburyo butatu bwo kubona imodoka',
        buyTitle: 'Gura imodoka yemejwe',
        buyBody: 'Isuzumwa, igahabwa amanota kandi igatangazwa n’itsinda ryacu. Wumvikana igiciro n’umugurisha.',
        rentTitle: 'Kodesha ku munsi',
        rentBody: 'Imodoka zikodeshwa zasuzumwe z’abakodesha bemewe i Kigali. Saba amatariki; umukodesha arakwemeza.',
        importTitle: 'Tumiza mu Buyapani cyangwa UAE',
        importBody: 'Itumiza rifite igiciro cyemejwe, amasezerano yasinywe, n’ibyiciro bibiri byo kwishyura ugaragaza n’inyemezabwishyu ya banki.',
        buyCta: 'Reba imodoka',
        rentCta: 'Reba izikodeshwa',
        importCta: 'Uko gutumiza bikorwa',
      },
    },
    faq: { eyebrow: 'Ibibazo', title: 'Mbere yo kwiyemeza' },
  },

  fr: {
    inspection: {
      eyebrow: 'Le contrôle en 150 points',
      title: 'De quoi la note est faite',
      description:
        'Sept catégories, pondérées comme la liste de contrôle les pondère.',
      category: {
        engine: 'Moteur et transmission',
        brakes: 'Freins et direction',
        body: 'Carrosserie et extérieur',
        interior: 'Intérieur et confort',
        electronics: 'Électronique et sécurité',
        tyres: 'Pneus et roues',
        documentation: 'Documents et conformité',
      },
      criticalCount: '{{count}} critiques',
      ruleScore:
        'Chaque point vaut un point, la voiture est donc notée sur {{total}}. Une annonce doit atteindre {{threshold}} pour être publiée.',
      ruleCritical:
        '{{critical}} points sont critiques. Un seul échec bloque la publication, quelle que soit la note.',
      link: 'Lire la norme d’inspection complète',
    },
    hero: {
      photoAlt:
        'Une voiture levée sur un pont d’atelier, têtes de géométrie fixées à ses roues',
      eyebrow: 'Le marché de la mobilité de confiance au Rwanda',
      title: 'La bonne voiture. La confiance d’avancer.',
      subtitle:
        'Chaque voiture inspectée dans nos centres de Kigali. Vous traitez directement avec le vendeur.',
      navLabel: 'Choisissez ce que vous voulez faire',
      nav: { buy: 'Acheter', rent: 'Louer', sell: 'Vendre', tools: 'Outils auto' },
      searchLabel: 'Rechercher des voitures certifiées',
      searchPlaceholder: 'Toyota RAV4, SUV automatique, diesel…',
      searchButton: 'Rechercher',
      stockEyebrow: 'Publiées récemment',
      stockAll: 'Voir tout',
      photoCaption: 'Banc de parallélisme — centre d’inspection Sawa, Kigali',
      metric: {
        points: 'Points d’inspection',
        threshold: 'Requis pour publier',
        critical: 'Points critiques',
      },
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
        independent: {
          claim: 'Inspection indépendante',
          proof:
            'Sawa Cars inspecte la voiture sans jamais la vendre, et ne gagne rien sur la vente.',
        },
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
      imageAlt: 'Une rangée de voitures inspectées stationnées sur un parc Sawa à Kigali',
    },
    front: {
      headline: 'Des voitures qui ont réussi 150 contrôles avant que vous ne les voyiez.',
      lede: 'Achetez, louez ou importez au Rwanda. Chaque annonce est inspectée dans nos centres de Kigali, puis vous traitez directement avec le vendeur.',
      tabsLabel: 'Que voulez-vous faire ?',
      tab: {
        buy: 'Acheter',
        rent: 'Louer',
        import: 'Importer',
      },
      make: 'Marque',
      anyMake: 'Toutes marques',
      model: 'Modèle',
      anyModel: 'Tous modèles',
      budget: 'Budget',
      anyBudget: 'Tout budget',
      upTo: 'Jusqu’à {{amount}}',
      showCars: 'Voir les voitures',
      popular: 'Populaire',
      rentLede: 'Des voitures inspectées de loueurs vérifiés, à la journée. Demandez vos dates ; le loueur vous confirme directement.',
      rentCount: '{{count}} voitures de location disponibles',
      rentCta: 'Voir les locations',
      importLede: 'Une voiture en vue au Japon ou aux Émirats ? Voyez son coût rendu à Kigali, droits compris, avant de vous engager.',
      importYear: 'Année',
      importPrice: 'Prix à l’étranger (USD)',
      importCta: 'Estimer le coût rendu',
      cert: {
        title: 'Rapport d’inspection',
        best: 'Meilleur score en stock',
        noCritical: 'Aucun défaut critique',
        inspected: 'Inspectée le {{date}}',
        view: 'Voir cette voiture',
        bar: 'Seuil de publication : {{threshold}}',
      },
      stock: {
        title: '{{count}} voitures inspectées en stock',
        titleOne: '1 voiture inspectée en stock',
        byMake: 'Par marque',
        byBudget: 'Par budget',
        byBody: 'Par carrosserie',
        under: 'Moins de {{amount}}',
        range: '{{from}} à {{to}}',
        over: '{{amount}} et plus',
        all: 'Voir toutes les voitures',
      },
      ways: {
        title: 'Trois façons de prendre la route',
        buyTitle: 'Acheter une voiture certifiée',
        buyBody: 'Inspectée, notée et publiée par notre équipe. Vous convenez du prix avec le vendeur.',
        rentTitle: 'Louer à la journée',
        rentBody: 'Voitures de location inspectées de loueurs vérifiés à Kigali. Demandez des dates ; le loueur confirme.',
        importTitle: 'Importer du Japon ou des Émirats',
        importBody: 'Une commande chiffrée, un accord signé et deux paiements par étapes justifiés par preuve de virement.',
        buyCta: 'Voir les voitures',
        rentCta: 'Voir les locations',
        importCta: 'Comment importer',
      },
    },
    faq: { eyebrow: 'Questions', title: 'Avant de vous engager' },
  },

  sw: {
    inspection: {
      eyebrow: 'Ukaguzi wa pointi 150',
      title: 'Alama inaundwa na nini',
      description:
        'Kategoria saba, zenye uzito kama orodha ya ukaguzi inavyoziweka.',
      category: {
        engine: 'Injini na usafirishaji',
        brakes: 'Breki na uelekezaji',
        body: 'Mwili na nje',
        interior: 'Ndani na starehe',
        electronics: 'Elektroniki na usalama',
        tyres: 'Matairi na magurudumu',
        documentation: 'Nyaraka na ubora wa barabara',
      },
      criticalCount: '{{count}} muhimu',
      ruleScore:
        'Kila kipengele ni pointi moja, hivyo gari hupimwa kwa {{total}}. Tangazo linahitaji {{threshold}} kuchapishwa.',
      ruleCritical:
        'Vipengele {{critical}} ni muhimu sana. Kushindwa kimoja kuzuia uchapishaji bila kujali alama.',
      link: 'Soma kiwango kamili cha ukaguzi',
    },
    hero: {
      photoAlt:
        'Gari lililoinuliwa kwenye lifti ya karakana, vichwa vya kupima mpangilio wa magurudumu vimebanwa kwenye magurudumu yake',
      eyebrow: 'Soko la usafiri linaloaminika la Rwanda',
      title: 'Gari sahihi. Ujasiri wa kusonga.',
      subtitle:
        'Kila gari hukaguliwa katika vituo vyetu vya Kigali. Unashughulika na muuzaji moja kwa moja.',
      navLabel: 'Chagua unachotaka kufanya',
      nav: { buy: 'Nunua', rent: 'Kodisha', sell: 'Uza', tools: 'Zana za gari' },
      searchLabel: 'Tafuta magari yaliyothibitishwa',
      searchPlaceholder: 'Toyota RAV4, SUV ya automatiki, dizeli…',
      searchButton: 'Tafuta',
      stockEyebrow: 'Zilizochapishwa hivi karibuni',
      stockAll: 'Tazama zote',
      photoCaption: 'Kifaa cha upangaji magurudumu — kituo cha ukaguzi cha Sawa, Kigali',
      metric: {
        points: 'Vipengele vya ukaguzi',
        threshold: 'Inayohitajika kuchapishwa',
        critical: 'Vipengele muhimu',
      },
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
        independent: {
          claim: 'Ukaguzi huru',
          proof:
            'Sawa Cars hukagua gari lakini haliuzi kamwe, na haipati faida yoyote kutokana na mauzo.',
        },
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
      imageAlt: 'Safu ya magari yaliyokaguliwa yakiwa yameegeshwa katika kiwanja cha Sawa, Kigali',
    },
    front: {
      headline: 'Magari yaliyopita ukaguzi 150 kabla hujayaona.',
      lede: 'Nunua, kodi au agiza gari nchini Rwanda. Kila tangazo hukaguliwa katika vituo vyetu vya Kigali, kisha unashughulika na muuzaji moja kwa moja.',
      tabsLabel: 'Unataka kufanya nini?',
      tab: {
        buy: 'Nunua',
        rent: 'Kodi',
        import: 'Agiza',
      },
      make: 'Aina',
      anyMake: 'Aina yoyote',
      model: 'Modeli',
      anyModel: 'Modeli yoyote',
      budget: 'Bajeti',
      anyBudget: 'Bajeti yoyote',
      upTo: 'Hadi {{amount}}',
      showCars: 'Onyesha magari',
      popular: 'Maarufu',
      rentLede: 'Magari yaliyokaguliwa kutoka kwa wakodishaji waliothibitishwa, kwa siku. Omba tarehe zako; mkodishaji anakuthibitishia moja kwa moja.',
      rentCount: 'Magari {{count}} ya kukodi yanapatikana',
      rentCta: 'Angalia magari ya kukodi',
      importLede: 'Una gari akilini kutoka Japani au UAE? Ona gharama yake likifika Kigali, pamoja na ushuru, kabla ya kujitolea.',
      importYear: 'Mwaka',
      importPrice: 'Bei nje (USD)',
      importCta: 'Kadiria gharama ikifika',
      cert: {
        title: 'Ripoti ya ukaguzi',
        best: 'Alama ya juu iliyopo',
        noCritical: 'Hakuna kasoro kubwa',
        inspected: 'Ilikaguliwa {{date}}',
        view: 'Tazama gari hili',
        bar: 'Kiwango cha kuchapisha: {{threshold}}',
      },
      stock: {
        title: 'Magari {{count}} yaliyokaguliwa yapo',
        titleOne: 'Gari 1 lililokaguliwa lipo',
        byMake: 'Kwa aina',
        byBudget: 'Kwa bajeti',
        byBody: 'Kwa umbo',
        under: 'Chini ya {{amount}}',
        range: '{{from}} hadi {{to}}',
        over: '{{amount}} na zaidi',
        all: 'Angalia magari yote',
      },
      ways: {
        title: 'Njia tatu za kuingia barabarani',
        buyTitle: 'Nunua gari lililothibitishwa',
        buyBody: 'Imekaguliwa, imepewa alama na kuchapishwa na timu yetu. Mnakubaliana bei na muuzaji.',
        rentTitle: 'Kodi kwa siku',
        rentBody: 'Magari ya kukodi yaliyokaguliwa kutoka kwa wakodishaji waliothibitishwa Kigali. Omba tarehe; mkodishaji anathibitisha.',
        importTitle: 'Agiza kutoka Japani au UAE',
        importBody: 'Oda yenye bei, makubaliano yaliyosainiwa, na malipo mawili ya hatua unayothibitisha kwa uthibitisho wa uhamisho wa benki.',
        buyCta: 'Angalia magari',
        rentCta: 'Angalia za kukodi',
        importCta: 'Jinsi kuagiza kunavyofanya kazi',
      },
    },
    faq: { eyebrow: 'Maswali', title: 'Kabla ya kujitolea' },
  },

  ko: {
    inspection: {
      eyebrow: '150개 항목 점검',
      title: '점수를 구성하는 항목',
      description:
        '체크리스트가 부여한 비중에 따른 일곱 개 항목군입니다.',
      category: {
        engine: '엔진 및 구동계',
        brakes: '제동 및 조향',
        body: '차체 및 외관',
        interior: '실내 및 편의',
        electronics: '전자장치 및 안전',
        tyres: '타이어 및 휠',
        documentation: '서류 및 운행 적합성',
      },
      criticalCount: '중대 {{count}}건',
      ruleScore:
        '항목당 1점이므로 차량은 {{total}}점 만점으로 채점됩니다. 매물 게시에는 {{threshold}}점이 필요합니다.',
      ruleCritical:
        '{{critical}}개 항목은 중대 항목입니다. 하나만 불합격해도 점수와 무관하게 게시가 차단됩니다.',
      link: '전체 점검 기준 보기',
    },
    hero: {
      photoAlt:
        '정비소 리프트에 올려진 차량, 바퀴에 휠 얼라인먼트 헤드가 장착되어 있습니다',
      eyebrow: '르완다의 신뢰받는 모빌리티 마켓플레이스',
      title: '알맞은 차. 나아갈 자신감.',
      subtitle:
        '모든 차량은 키갈리 센터에서 점검합니다. 판매자와 직접 거래하십시오.',
      navLabel: '원하는 작업을 선택하세요',
      nav: { buy: '구매', rent: '렌트', sell: '판매', tools: '차량 도구' },
      searchLabel: '인증 차량 검색',
      searchPlaceholder: 'Toyota RAV4, 자동 SUV, 디젤…',
      searchButton: '검색',
      stockEyebrow: '최근 등록',
      stockAll: '전체 보기',
      photoCaption: '휠 얼라인먼트 장비 — 사와 검사 센터, 키갈리',
      metric: {
        points: '검사 항목',
        threshold: '게시 최소 점수',
        critical: '필수 항목',
      },
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
        independent: {
          claim: '독립적인 점검',
          proof:
            'Sawa Cars는 차량을 점검하지만 판매하지 않으며, 판매로 어떠한 수익도 얻지 않습니다.',
        },
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
      imageAlt: '키갈리의 사와 주차장에 나란히 세워진 검사 완료 차량들',
    },
    front: {
      headline: '당신이 보기 전에 150개 항목 검사를 통과한 차량.',
      lede: '르완다에서 구매, 렌트, 수입까지. 모든 매물은 키갈리 센터에서 검사를 거치며, 거래는 판매자와 직접 진행합니다.',
      tabsLabel: '무엇을 하시겠어요?',
      tab: {
        buy: '구매',
        rent: '렌트',
        import: '수입',
      },
      make: '제조사',
      anyMake: '모든 제조사',
      model: '모델',
      anyModel: '모든 모델',
      budget: '예산',
      anyBudget: '예산 무관',
      upTo: '{{amount}} 이하',
      showCars: '차량 보기',
      popular: '인기',
      rentLede: '검증된 렌터카 업체의 검사 완료 차량을 일 단위로. 날짜를 문의하면 업체가 직접 확인해 드립니다.',
      rentCount: '렌트 가능 차량 {{count}}대',
      rentCta: '렌트 차량 보기',
      importLede: '일본이나 UAE에서 원하는 차가 있나요? 계약 전에 관세 포함 키갈리 도착 비용을 확인하세요.',
      importYear: '연식',
      importPrice: '현지 가격 (USD)',
      importCta: '도착 비용 계산',
      cert: {
        title: '검사 보고서',
        best: '재고 중 최고 점수',
        noCritical: '치명적 결함 없음',
        inspected: '{{date}} 검사',
        view: '이 차량 보기',
        bar: '게시 기준: {{threshold}}',
      },
      stock: {
        title: '검사 완료 재고 {{count}}대',
        titleOne: '검사 완료 재고 1대',
        byMake: '제조사별',
        byBudget: '예산별',
        byBody: '차종별',
        under: '{{amount}} 미만',
        range: '{{from}}~{{to}}',
        over: '{{amount}} 이상',
        all: '전체 차량 보기',
      },
      ways: {
        title: '도로에 나서는 세 가지 방법',
        buyTitle: '인증 차량 구매',
        buyBody: '저희 팀이 검사하고 점수를 매겨 게시합니다. 가격은 판매자와 직접 협의합니다.',
        rentTitle: '일 단위 렌트',
        rentBody: '키갈리의 검증된 업체가 제공하는 검사 완료 렌터카. 날짜를 문의하면 업체가 확인합니다.',
        importTitle: '일본·UAE에서 수입',
        importBody: '견적 주문, 서명된 계약, 그리고 은행 송금 증빙으로 확인하는 두 차례의 단계별 결제.',
        buyCta: '차량 보기',
        rentCta: '렌트 보기',
        importCta: '수입 절차 보기',
      },
    },
    faq: { eyebrow: '질문', title: '결정하기 전에' },
  },

  zh: {
    inspection: {
      eyebrow: '150 项检测',
      title: '评分由什么构成',
      description:
        '七个类别，权重与检查清单一致。',
      category: {
        engine: '发动机与传动',
        brakes: '制动与转向',
        body: '车身与外观',
        interior: '内饰与舒适',
        electronics: '电子与安全',
        tyres: '轮胎与轮毂',
        documentation: '文件与适路性',
      },
      criticalCount: '{{count}} 项关键',
      ruleScore:
        '每项计 1 分，因此车辆满分为 {{total}} 分。房源需达到 {{threshold}} 分方可发布。',
      ruleCritical:
        '其中 {{critical}} 项为关键项。任一项不合格，无论总分多少均不得发布。',
      link: '阅读完整检测标准',
    },
    hero: {
      photoAlt:
        '车辆被举升在维修车间的举升机上，车轮上夹装着四轮定位仪',
      eyebrow: '卢旺达值得信赖的出行市场',
      title: '合适的车，出行的信心。',
      subtitle:
        '每辆车都在我们的基加利中心完成检测。您与卖家直接交易。',
      navLabel: '选择您想做的事',
      nav: { buy: '购买', rent: '租赁', sell: '出售', tools: '用车工具' },
      searchLabel: '搜索认证车辆',
      searchPlaceholder: '丰田 RAV4，自动挡SUV，柴油…',
      searchButton: '搜索',
      stockEyebrow: '最新发布',
      stockAll: '查看全部',
      photoCaption: '车轮定位设备 — Sawa 检测中心，基加利',
      metric: {
        points: '检测项目',
        threshold: '发布最低分',
        critical: '关键项目',
      },
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
        independent: {
          claim: '独立检测',
          proof:
            'Sawa Cars 检测车辆，但从不出售车辆，也不从交易中获取任何收益。',
        },
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
      imageAlt: '一排通过检测的车辆停放在基加利的 Sawa 车场',
    },
    front: {
      headline: '在您看到之前，每辆车都已通过 150 项检查。',
      lede: '在卢旺达购车、租车或进口。每个车源都在我们的基加利中心检测，之后您直接与卖家交易。',
      tabsLabel: '您想做什么？',
      tab: {
        buy: '购买',
        rent: '租车',
        import: '进口',
      },
      make: '品牌',
      anyMake: '所有品牌',
      model: '车型',
      anyModel: '所有车型',
      budget: '预算',
      anyBudget: '不限预算',
      upTo: '{{amount}} 以内',
      showCars: '查看车辆',
      popular: '热门',
      rentLede: '来自认证租赁商、经过检测的车辆，按天租用。提交日期，租赁商将直接与您确认。',
      rentCount: '{{count}} 辆可租车辆',
      rentCta: '查看租赁车辆',
      importLede: '看中了日本或阿联酋的车？在决定前，先看看含关税运抵基加利的总成本。',
      importYear: '年份',
      importPrice: '海外价格（美元）',
      importCta: '估算到岸成本',
      cert: {
        title: '检测报告',
        best: '在售最高分',
        noCritical: '无严重缺陷',
        inspected: '{{date}} 检测',
        view: '查看此车',
        bar: '发布门槛：{{threshold}}',
      },
      stock: {
        title: '{{count}} 辆已检测车辆在售',
        titleOne: '1 辆已检测车辆在售',
        byMake: '按品牌',
        byBudget: '按预算',
        byBody: '按车身',
        under: '{{amount}} 以下',
        range: '{{from}} 至 {{to}}',
        over: '{{amount}} 及以上',
        all: '查看全部车辆',
      },
      ways: {
        title: '三种上路方式',
        buyTitle: '购买认证车辆',
        buyBody: '由我们团队检测、评分并发布。价格由您与卖家商定。',
        rentTitle: '按天租车',
        rentBody: '基加利认证租赁商提供的已检测租车。提交日期，由租赁商确认。',
        importTitle: '从日本或阿联酋进口',
        importBody: '报价订单、签署协议，以及两次凭银行转账凭证确认的阶段付款。',
        buyCta: '浏览车辆',
        rentCta: '查看租车',
        importCta: '进口流程',
      },
    },
    faq: { eyebrow: '常见问题', title: '在您决定之前' },
  },
}
