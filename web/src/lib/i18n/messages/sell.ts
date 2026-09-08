// Message section: sell. One subtree per locale, all sharing the shape of `en`.
// English is complete first; other locales fall back to it per missing key.
import type { Locale } from '../config'

export const sell: Record<Locale, Record<string, unknown>> = {
  en: {
    metaTitle: 'Sell your car in Kigali, Rwanda — valuation and inspection',
    metaDescription:
      'Submit your vehicle for seller verification, inspection and controlled publication on Sawa Cars. Manage direct buyer enquiries and keep control of your price.',
    metaOgTitle: 'Sell your car with {{name}}',
    metaOgDescription:
      'We review, inspect and publish verified listings. You communicate and agree any sale directly with the buyer.',
    hero: {
      eyebrow: 'Sell your car',
      title: "What's your car worth in Kigali?",
      subtitle:
        'Priced from cars actually listed and sold here, never a lookup table. If the number works, we inspect the car and publish it after an admin review. You then deal with buyers directly.',
      bullet1: 'The valuation takes about ten seconds and needs no account',
      bullet2: 'You keep control of the price the whole way',
      bullet3: 'You control whether buyers can request phone or WhatsApp contact',
      seeCost: 'See what selling costs',
      costNote: '— two charges, both quoted before you commit.',
      freeValuation: 'Free valuation',
    },
    work: {
      eyebrow: 'The work we do',
      title: 'Six jobs you no longer have to do yourself',
      description:
        'Selling privately means photographing the car, fielding calls and meeting strangers. This is the same sale without any of that.',
      inspect: {
        title: 'We inspect it properly',
        body: 'A 150-point check across engine and drivetrain, brakes and steering, body, interior, electronics, tyres and documentation. Every item is graded pass, flag or fail, and the full report is published with your listing.',
      },
      photograph: {
        title: 'We photograph it',
        body: 'We add a clear, truthful gallery with the useful exterior, interior, document and defect views this particular vehicle needs. There is no fixed angle count.',
      },
      price: {
        title: 'We price it on evidence',
        body: 'We show you what comparable cars are listed and sold for on Sawa Cars, then you set the asking price. You can change it at any time while the car is live.',
      },
      contact: {
        title: 'You choose your contact channels',
        body: 'Use in-app messages, or opt in to phone and WhatsApp disclosure. Direct details are released only after a signed-in buyer acknowledges the marketplace notice.',
      },
      agree: {
        title: 'You agree the sale directly',
        body: 'You and the buyer decide the price, payment, viewing, written contract, ownership transfer and delivery without making Sawa Cars a party.',
      },
      payment: {
        title: 'Sawa never holds the payment',
        body: 'There is no platform checkout or escrow. Verify the buyer and recipient, document your terms and retain proof of any independent payment.',
      },
    },
    pipeline: {
      eyebrow: 'How selling works',
      title: 'Five steps, and you know where you are at every one',
      description:
        'Your submission carries a status from verification through inspection, publication and any seller-reported close.',
    },
    boundaries: {
      eyebrow: 'Clear boundaries',
      title: 'What the platform controls—and what you control',
      description:
        'The publication workflow is managed by Sawa Cars. The transaction workflow belongs to you and the buyer.',
      platform: 'Platform',
      pubReqTitle: 'Publication requirements',
      pubReqBody:
        'Your account must be active and verified, the required inspection must be complete, and the listing needs a valid gallery before an administrator can make it public.',
      seller: 'Seller',
      commTitle: 'Direct buyer communication',
      commBody:
        'Reply in the platform or enable phone and WhatsApp. Keep the listing accurate, disclose material changes and pause or mark it sold when it is no longer available.',
      independent: 'Independent',
      contractTitle: 'Contract and payment',
      contractBody:
        'You and the buyer are responsible for inspection, price, payment, ownership transfer, delivery and written terms. Sawa Cars does not hold money or guarantee the deal.',
      noCheckoutBold: 'No Sawa transaction checkout.',
      noCheckoutBody:
        ' Contacting you is an inquiry only; it does not reserve the vehicle or create a contract with Sawa Cars.',
    },
    app: {
      eyebrow: 'Before you start',
      title: 'One step has to happen in the app',
      body1:
        'You can submit the car first. Before the listing or your contact details go public, you complete a one-time identity check. It needs a photo of your national ID, front and back, plus a selfie. The capture happens in the app and is approved once.',
      body2:
        'It is also the reason there are no fake listings on Sawa Cars. Every seller on this marketplace is a verified person, checked by our team.',
      whereTitle: 'Where each step happens',
      whereApp: 'App',
      whereWeb: 'Web',
      whereBoth: 'Both',
      whereCenter: 'Center',
      whereDirect: 'Direct',
      step1: 'Identity verification and submitting a car',
      step2: 'Free valuation and browsing the market',
      step3: 'Tracking your submission through the pipeline',
      step4: 'Messages from buyers, and changing your price',
      step5: 'Vehicle inspection and listing evidence where required',
      step6: 'Viewing, negotiation, contract, payment, transfer and delivery',
      alreadyHaveApp: 'Already have the app?',
      openSellerFlow: 'Open the seller flow',
    },
    centers: {
      eyebrow: 'Where you bring it',
      title: 'Inspection centers across Kigali',
      description:
        'Inspection services happen at the center you choose. Bring the car, your ID and any service records you have.',
    },
    faq: { eyebrow: 'Questions', title: 'What sellers ask us first' },
    close: {
      headline: 'Find out what it is worth first',
      valueMy: 'Value my car',
      getApp: 'Get the app to submit',
      body: 'The valuation costs nothing and commits you to nothing. If the number works, verify your ID in the app and book an inspection at the center nearest you.',
    },
  },

  rw: {
    metaTitle: 'Gurisha imodoka yawe i Kigali, mu Rwanda — isuzuma ry’agaciro n’isuzuma ry’imodoka',
    metaDescription:
      'Tanga imodoka yawe kugira ngo umugurisha yemezwe, isuzumwe kandi itangazwe kugenzuwe kuri Sawa Cars. Yobora ibibazo by’abaguzi butaziguye kandi ugumane igiciro cyawe.',
    metaOgTitle: 'Gurisha imodoka yawe na {{name}}',
    metaOgDescription:
      'Turasuzuma, tugasuzuma imodoka kandi tugatangaza amatangazo yemejwe. Wowe uvugana kandi wumvikana igurisha iryo ari ryo ryose n’umuguzi butaziguye.',
    hero: {
      eyebrow: 'Gurisha imodoka yawe',
      title: 'Imodoka yawe igira agaciro kangahe i Kigali?',
      subtitle:
        'Igiciro gituruka ku modoka zatangajwe kandi zagurishijwe koko kuri Sawa Cars — atari imbonerahamwe. Niba umubare ukwiye, turayisuzuma, tugakora ububiko bw’amafoto bw’ingirakamaro kandi tugatangaza gusa nyuma y’isuzuma ry’ubuyobozi. Hanyuma uyobora ibibazo by’abaguzi bemejwe n’isezerano iryo ari ryo ryose butaziguye.',
      bullet1: 'Isuzuma ry’agaciro rimara nk’amasegonda cumi kandi ntirisaba konti',
      bullet2: 'Ukomeza kugenzura igiciro inzira yose',
      bullet3: 'Ni wowe ugenzura niba abaguzi bashobora gusaba kuvugana kuri telefone cyangwa WhatsApp',
      seeCost: 'Reba igurisha gitwara iki',
      costNote: '— amafaranga abiri, yombi atangwa mbere yo kwiyemeza.',
      freeValuation: 'Isuzuma ry’agaciro ku buntu',
    },
    work: {
      eyebrow: 'Akazi dukora',
      title: 'Imirimo itandatu utakiri gukora ubwawe',
      description:
        'Kugurisha wenyine i Kigali bisobanura gufata imodoka amafoto, gusubiza amasimu, guhura n’abantu utazi, no kwizera ko impapuro zizakunda. Iri ni igurisha rimwe nta na kimwe muri ibyo.',
      inspect: {
        title: 'Turayisuzuma neza',
        body: 'Isuzuma ry’ingingo 150 kuri moteri n’ibiyikwereza, feri n’ubuyobozi, umubiri, imbere, amashanyarazi, pine n’impapuro. Buri kintu kironderwa amanota atsinze, ararindwa cyangwa aratsindwa, kandi raporo yuzuye itangazwa hamwe n’itangazo ryawe.',
      },
      photograph: {
        title: 'Turayifata amafoto',
        body: 'Twongeraho ububiko bw’amafoto asobanutse, y’ukuri afite amashusho y’inyuma, imbere, impapuro n’ibyangiritse iyi modoka ikeneye. Nta mubare uhoraho w’imisozo.',
      },
      price: {
        title: 'Tuyihera igiciro ku bimenyetso',
        body: 'Tukwereka uko imodoka zisa zatangajwe kandi zagurishijwe kuri Sawa Cars, hanyuma wowe ushyiraho igiciro usaba. Ushobora kucyhindura igihe cyose imodoka ikiri ku mugaragaro.',
      },
      contact: {
        title: 'Uhitamo uburyo bwo kuvugana',
        body: 'Koresha ubutumwa bwo muri porogaramu, cyangwa wemere gutanga telefone na WhatsApp. Amakuru ataziguye atangwa gusa nyuma y’uko umuguzi winjiye yemera itangazo ry’isoko.',
      },
      agree: {
        title: 'Wumvikana igurisha butaziguye',
        body: 'Wowe n’umuguzi mugena igiciro, ubwishyu, kureba, amasezerano yanditse, guhindura nyir’ubwite no gutanga nta kugira Sawa Cars uruhande.',
      },
      payment: {
        title: 'Sawa ntibika na rimwe ubwishyu',
        body: 'Nta kwishyura cyangwa kubika amafaranga kw’urubuga. Genzura umuguzi n’uwakira, andika amabwiriza yawe kandi ugumane ikimenyetso cy’ubwishyu ubwo ari bwo bwose bwikorewe.',
      },
    },
    pipeline: {
      eyebrow: 'Uko kugurisha bikorwa',
      title: 'Intambwe eshanu, kandi umenya aho ugeze kuri buri imwe',
      description:
        'Isaba ryawe rifite imiterere kuva ku kwemeza kugeza ku isuzuma, gutangaza n’ifungwa iryo ari ryo ryose ryatangajwe n’umugurisha.',
    },
    boundaries: {
      eyebrow: 'Imbibi zisobanutse',
      title: 'Icyo urubuga rugenzura—n’icyo ugenzura',
      description:
        'Uburyo bwo gutangaza buyoborwa na Sawa Cars. Uburyo bw’ubucuruzi ni ubwawe n’umuguzi.',
      platform: 'Urubuga',
      pubReqTitle: 'Ibisabwa mu gutangaza',
      pubReqBody:
        'Konti yawe igomba kuba ikora kandi yemejwe, isuzuma risabwa rigomba kuba ryarangiye, kandi itangazo rigomba kugira ububiko bw’amafoto bwemewe mbere y’uko umuyobozi arishyira ku mugaragaro.',
      seller: 'Umugurisha',
      commTitle: 'Ukuvugana n’umuguzi butaziguye',
      commBody:
        'Subiza kuri urubuga cyangwa ufungure telefone na WhatsApp. Gumana itangazo ry’ukuri, tangaza impinduka z’ingenzi kandi uhagarike cyangwa uranga ko ryagurishijwe iyo ritakiboneka.',
      independent: 'Ryigenga',
      contractTitle: 'Amasezerano n’ubwishyu',
      contractBody:
        'Wowe n’umuguzi mushinzwe isuzuma, igiciro, ubwishyu, guhindura nyir’ubwite, gutanga n’amabwiriza yanditse. Sawa Cars ntibika amafaranga cyangwa ngo yishingire isezerano.',
      noCheckoutBold: 'Nta kwishyura kwa Sawa mu bucuruzi.',
      noCheckoutBody:
        ' Kukuvugana ni ikibazo gusa; ntibibika imodoka cyangwa ngo bikore amasezerano na Sawa Cars.',
    },
    app: {
      eyebrow: 'Mbere yo gutangira',
      title: 'Intambwe imwe igomba kubera muri porogaramu',
      body1:
        'Ushobora gutanga imodoka mbere. Mbere y’uko itangazo cyangwa amakuru yawe yo kuvugana biba ku mugaragaro, uzuza isuzuma ry’umwirondoro rimwe gusa: ifoto y’indangamuntu yawe, imbere n’inyuma, na selfie. Bifatirwa muri porogaramu ya Sawa Cars, bimara nk’iminota ibiri, kandi bisaba kwemezwa rimwe gusa.',
      body2:
        'Ni na yo mpamvu nta matangazo y’ibinyoma abaho kuri Sawa Cars. Buri mugurisha kuri iri soko ni umuntu wemejwe, wagenzuwe n’ikipe yacu.',
      whereTitle: 'Aho buri ntambwe ibera',
      whereApp: 'Porogaramu',
      whereWeb: 'Urubuga',
      whereBoth: 'Byombi',
      whereCenter: 'Ikigo',
      whereDirect: 'Butaziguye',
      step1: 'Kwemeza umwirondoro no gutanga imodoka',
      step2: 'Isuzuma ry’agaciro ku buntu no kureba isoko',
      step3: 'Gukurikirana isaba ryawe mu nzira',
      step4: 'Ubutumwa bw’abaguzi, no guhindura igiciro cyawe',
      step5: 'Isuzuma ry’imodoka n’ibimenyetso by’itangazo aho bisabwa',
      step6: 'Kureba, imishyikirano, amasezerano, ubwishyu, guhindura no gutanga',
      alreadyHaveApp: 'Usanzwe ufite porogaramu?',
      openSellerFlow: 'Fungura inzira y’umugurisha',
    },
    centers: {
      eyebrow: 'Aho uyizana',
      title: 'Ibigo by’isuzuma i Kigali hose',
      description:
        'Serivisi z’isuzuma zibera mu kigo wihitiyemo. Zana imodoka, indangamuntu yawe n’inyandiko z’isana uzifite.',
    },
    faq: { eyebrow: 'Ibibazo', title: 'Ibyo abagurisha babanza kutubaza' },
    close: {
      headline: 'Banza umenye agaciro kayo',
      valueMy: 'Menya agaciro k’imodoka yanjye',
      getApp: 'Kura porogaramu utange',
      body: 'Isuzuma ry’agaciro nta kigura kandi nta cyo rigusaba. Niba umubare ukwiye, emeza indangamuntu yawe muri porogaramu kandi ufate igihe cy’isuzuma mu kigo kiri hafi yawe.',
    },
  },

  fr: {
    metaTitle: 'Vendez votre voiture à Kigali, Rwanda — estimation et inspection',
    metaDescription:
      'Soumettez votre véhicule pour la vérification du vendeur, l’inspection et une publication contrôlée sur Sawa Cars. Gérez les demandes directes des acheteurs et gardez le contrôle de votre prix.',
    metaOgTitle: 'Vendez votre voiture avec {{name}}',
    metaOgDescription:
      'Nous examinons, inspectons et publions des annonces vérifiées. Vous communiquez et convenez de toute vente directement avec l’acheteur.',
    hero: {
      eyebrow: 'Vendez votre voiture',
      title: 'Combien vaut votre voiture à Kigali ?',
      subtitle:
        'Un prix établi à partir de voitures réellement mises en vente et vendues sur Sawa Cars — jamais un barème. Si le montant convient, nous l’inspectons, créons une galerie utile et ne publions qu’après examen par un administrateur. Vous gérez ensuite les demandes d’acheteurs vérifiés et tout accord directement.',
      bullet1: 'L’estimation prend environ dix secondes et ne nécessite aucun compte',
      bullet2: 'Vous gardez le contrôle du prix tout au long',
      bullet3: 'Vous décidez si les acheteurs peuvent demander un contact par téléphone ou WhatsApp',
      seeCost: 'Voir ce que coûte la vente',
      costNote: '— deux frais, tous deux annoncés avant votre engagement.',
      freeValuation: 'Estimation gratuite',
    },
    work: {
      eyebrow: 'Le travail que nous faisons',
      title: 'Six tâches que vous n’avez plus à faire vous-même',
      description:
        'Vendre en particulier à Kigali, c’est photographier la voiture, gérer les appels, rencontrer des inconnus et espérer que les papiers passent. C’est la même vente, sans rien de tout cela.',
      inspect: {
        title: 'Nous l’inspectons correctement',
        body: 'Un contrôle en 150 points couvrant le moteur et la transmission, les freins et la direction, la carrosserie, l’intérieur, l’électronique, les pneus et les documents. Chaque point est noté réussi, signalé ou échoué, et le rapport complet est publié avec votre annonce.',
      },
      photograph: {
        title: 'Nous la photographions',
        body: 'Nous ajoutons une galerie claire et honnête avec les vues extérieures, intérieures, documentaires et de défauts utiles à ce véhicule précis. Il n’y a pas de nombre d’angles fixe.',
      },
      price: {
        title: 'Nous la valorisons sur des preuves',
        body: 'Nous vous montrons à quels prix des voitures comparables sont mises en vente et vendues sur Sawa Cars, puis vous fixez le prix demandé. Vous pouvez le modifier à tout moment tant que la voiture est en ligne.',
      },
      contact: {
        title: 'Vous choisissez vos canaux de contact',
        body: 'Utilisez les messages dans l’app, ou activez la divulgation par téléphone et WhatsApp. Les coordonnées directes ne sont communiquées qu’après qu’un acheteur connecté a accepté l’avis du marché.',
      },
      agree: {
        title: 'Vous convenez de la vente directement',
        body: 'Vous et l’acheteur décidez du prix, du paiement, de la visite, du contrat écrit, du transfert de propriété et de la livraison sans faire de Sawa Cars une partie.',
      },
      payment: {
        title: 'Sawa ne détient jamais le paiement',
        body: 'Il n’y a ni paiement ni séquestre sur la plateforme. Vérifiez l’acheteur et le destinataire, documentez vos conditions et conservez la preuve de tout paiement indépendant.',
      },
    },
    pipeline: {
      eyebrow: 'Comment se déroule la vente',
      title: 'Cinq étapes, et vous savez où vous en êtes à chacune',
      description:
        'Votre soumission porte un statut, de la vérification à l’inspection, à la publication et à toute clôture signalée par le vendeur.',
    },
    boundaries: {
      eyebrow: 'Des limites claires',
      title: 'Ce que la plateforme contrôle—et ce que vous contrôlez',
      description:
        'Le processus de publication est géré par Sawa Cars. Le processus de transaction vous appartient, à vous et à l’acheteur.',
      platform: 'Plateforme',
      pubReqTitle: 'Conditions de publication',
      pubReqBody:
        'Votre compte doit être actif et vérifié, l’inspection requise doit être terminée, et l’annonce doit disposer d’une galerie valide avant qu’un administrateur puisse la rendre publique.',
      seller: 'Vendeur',
      commTitle: 'Communication directe avec l’acheteur',
      commBody:
        'Répondez sur la plateforme ou activez le téléphone et WhatsApp. Gardez l’annonce exacte, signalez les changements importants et mettez-la en pause ou marquez-la vendue lorsqu’elle n’est plus disponible.',
      independent: 'Indépendant',
      contractTitle: 'Contrat et paiement',
      contractBody:
        'Vous et l’acheteur êtes responsables de l’inspection, du prix, du paiement, du transfert de propriété, de la livraison et des conditions écrites. Sawa Cars ne détient pas d’argent et ne garantit pas la transaction.',
      noCheckoutBold: 'Aucun paiement de transaction Sawa.',
      noCheckoutBody:
        ' Vous contacter n’est qu’une demande ; cela ne réserve pas le véhicule et ne crée aucun contrat avec Sawa Cars.',
    },
    app: {
      eyebrow: 'Avant de commencer',
      title: 'Une étape doit se faire dans l’application',
      body1:
        'Vous pouvez d’abord soumettre la voiture. Avant que l’annonce ou vos coordonnées directes puissent devenir publiques, effectuez une vérification d’identité unique : une photo de votre carte nationale d’identité, recto et verso, et un selfie. La capture se fait dans l’app Sawa Cars, prend environ deux minutes et ne doit être approuvée qu’une seule fois.',
      body2:
        'C’est aussi pourquoi il n’y a pas de fausses annonces sur Sawa Cars. Chaque vendeur de ce marché est une personne vérifiée, contrôlée par notre équipe.',
      whereTitle: 'Où se déroule chaque étape',
      whereApp: 'App',
      whereWeb: 'Web',
      whereBoth: 'Les deux',
      whereCenter: 'Centre',
      whereDirect: 'Direct',
      step1: 'Vérification d’identité et soumission d’une voiture',
      step2: 'Estimation gratuite et parcours du marché',
      step3: 'Suivi de votre soumission tout au long du processus',
      step4: 'Messages des acheteurs et modification de votre prix',
      step5: 'Inspection du véhicule et preuves de l’annonce le cas échéant',
      step6: 'Visite, négociation, contrat, paiement, transfert et livraison',
      alreadyHaveApp: 'Vous avez déjà l’application ?',
      openSellerFlow: 'Ouvrir le parcours vendeur',
    },
    centers: {
      eyebrow: 'Où l’apporter',
      title: 'Centres d’inspection à travers Kigali',
      description:
        'Les services d’inspection ont lieu au centre que vous choisissez. Apportez la voiture, votre pièce d’identité et tout carnet d’entretien que vous avez.',
    },
    faq: { eyebrow: 'Questions', title: 'Ce que les vendeurs nous demandent en premier' },
    close: {
      headline: 'Découvrez d’abord sa valeur',
      valueMy: 'Estimer ma voiture',
      getApp: 'Obtenir l’app pour soumettre',
      body: 'L’estimation ne coûte rien et ne vous engage à rien. Si le montant convient, vérifiez votre identité dans l’app et réservez une inspection au centre le plus proche.',
    },
  },

  sw: {
    metaTitle: 'Uza gari lako Kigali, Rwanda — ukadiriaji na ukaguzi',
    metaDescription:
      'Wasilisha gari lako kwa uthibitishaji wa muuzaji, ukaguzi na uchapishaji unaodhibitiwa kwenye Sawa Cars. Simamia maswali ya wanunuzi ya moja kwa moja na ubaki na udhibiti wa bei yako.',
    metaOgTitle: 'Uza gari lako na {{name}}',
    metaOgDescription:
      'Tunakagua, tunachunguza na kuchapisha matangazo yaliyothibitishwa. Wewe unawasiliana na kukubaliana mauzo yoyote moja kwa moja na mnunuzi.',
    hero: {
      eyebrow: 'Uza gari lako',
      title: 'Gari lako lina thamani gani Kigali?',
      subtitle:
        'Bei inayotokana na magari yaliyotangazwa na kuuzwa kweli kwenye Sawa Cars — si jedwali la kutafuta. Ikiwa namba inafaa, tunalikagua, tunatengeneza matunzio yenye manufaa na kuchapisha tu baada ya ukaguzi wa msimamizi. Kisha wewe unasimamia maswali ya wanunuzi waliothibitishwa na makubaliano yoyote moja kwa moja.',
      bullet1: 'Ukadiriaji huchukua kama sekunde kumi na hauhitaji akaunti',
      bullet2: 'Unabaki na udhibiti wa bei njia nzima',
      bullet3: 'Wewe unadhibiti iwapo wanunuzi wanaweza kuomba mawasiliano ya simu au WhatsApp',
      seeCost: 'Ona gharama za kuuza',
      costNote: '— malipo mawili, yote yakitajwa kabla hujajitolea.',
      freeValuation: 'Ukadiriaji bila malipo',
    },
    work: {
      eyebrow: 'Kazi tunayofanya',
      title: 'Kazi sita ambazo hutakiwi tena kufanya mwenyewe',
      description:
        'Kuuza binafsi Kigali ni kupiga gari picha, kupokea simu, kukutana na wageni, na kutumaini kuwa nyaraka zitapita. Haya ni mauzo yale yale bila mojawapo ya hayo.',
      inspect: {
        title: 'Tunalikagua ipasavyo',
        body: 'Ukaguzi wa pointi 150 kwenye injini na mfumo wa uendeshaji, breki na usukani, mwili, ndani, elektroniki, matairi na nyaraka. Kila kipengele hupewa daraja la kufaulu, kuripotiwa au kushindwa, na ripoti kamili huchapishwa pamoja na tangazo lako.',
      },
      photograph: {
        title: 'Tunalipiga picha',
        body: 'Tunaongeza matunzio wazi na ya kweli yenye mionekano ya nje, ndani, nyaraka na kasoro inayohitajika kwa gari hili mahususi. Hakuna idadi maalum ya pembe.',
      },
      price: {
        title: 'Tunaipa bei kwa ushahidi',
        body: 'Tunakuonyesha magari yanayofanana yanauzwa na kuuzwa kwa bei gani kwenye Sawa Cars, kisha wewe unaweka bei unayoomba. Unaweza kuibadilisha wakati wowote gari likiwa mtandaoni.',
      },
      contact: {
        title: 'Wewe unachagua njia zako za mawasiliano',
        body: 'Tumia ujumbe ndani ya programu, au ruhusu kufichua simu na WhatsApp. Maelezo ya moja kwa moja hutolewa tu baada ya mnunuzi aliyeingia kukubali ilani ya soko.',
      },
      agree: {
        title: 'Wewe unakubaliana mauzo moja kwa moja',
        body: 'Wewe na mnunuzi mnaamua bei, malipo, kuangalia, mkataba wa maandishi, uhamishaji wa umiliki na utoaji bila kumfanya Sawa Cars kuwa mshirika.',
      },
      payment: {
        title: 'Sawa kamwe haishiki malipo',
        body: 'Hakuna malipo wala udhamini wa jukwaa. Thibitisha mnunuzi na mpokeaji, andika masharti yako na uhifadhi ushahidi wa malipo yoyote ya kujitegemea.',
      },
    },
    pipeline: {
      eyebrow: 'Jinsi uuzaji unavyofanya kazi',
      title: 'Hatua tano, na unajua ulipo kwa kila moja',
      description:
        'Uwasilishaji wako hubeba hali kutoka uthibitishaji hadi ukaguzi, uchapishaji na ufungaji wowote ulioripotiwa na muuzaji.',
    },
    boundaries: {
      eyebrow: 'Mipaka iliyo wazi',
      title: 'Kile jukwaa linachodhibiti—na kile unachodhibiti',
      description:
        'Mtiririko wa uchapishaji unasimamiwa na Sawa Cars. Mtiririko wa muamala ni wako na mnunuzi.',
      platform: 'Jukwaa',
      pubReqTitle: 'Mahitaji ya uchapishaji',
      pubReqBody:
        'Akaunti yako lazima iwe hai na imethibitishwa, ukaguzi unaohitajika lazima ukamilike, na tangazo linahitaji matunzio halali kabla msimamizi hajaliweka hadharani.',
      seller: 'Muuzaji',
      commTitle: 'Mawasiliano ya moja kwa moja na mnunuzi',
      commBody:
        'Jibu kwenye jukwaa au wezesha simu na WhatsApp. Weka tangazo sahihi, funua mabadiliko muhimu na usitishe au liweke alama ya kuuzwa likiwa halipatikani tena.',
      independent: 'Kujitegemea',
      contractTitle: 'Mkataba na malipo',
      contractBody:
        'Wewe na mnunuzi mnawajibika kwa ukaguzi, bei, malipo, uhamishaji wa umiliki, utoaji na masharti ya maandishi. Sawa Cars haishiki pesa wala haidhamini muamala.',
      noCheckoutBold: 'Hakuna malipo ya muamala ya Sawa.',
      noCheckoutBody:
        ' Kuwasiliana nawe ni ombi tu; halihifadhi gari wala halitengenezi mkataba na Sawa Cars.',
    },
    app: {
      eyebrow: 'Kabla ya kuanza',
      title: 'Hatua moja lazima ifanyike kwenye programu',
      body1:
        'Unaweza kuwasilisha gari kwanza. Kabla tangazo au maelezo yako ya moja kwa moja hayajaweza kuwa hadharani, kamilisha ukaguzi wa utambulisho wa mara moja: picha ya kitambulisho chako cha taifa, mbele na nyuma, na selfie. Kupiga hufanyika ndani ya programu ya Sawa Cars, huchukua kama dakika mbili, na huhitaji kuidhinishwa mara moja tu.',
      body2:
        'Ndiyo pia sababu hakuna matangazo bandia kwenye Sawa Cars. Kila muuzaji kwenye soko hili ni mtu aliyethibitishwa, aliyekaguliwa na timu yetu.',
      whereTitle: 'Mahali kila hatua hufanyika',
      whereApp: 'Programu',
      whereWeb: 'Wavuti',
      whereBoth: 'Zote',
      whereCenter: 'Kituo',
      whereDirect: 'Moja kwa moja',
      step1: 'Uthibitishaji wa utambulisho na kuwasilisha gari',
      step2: 'Ukadiriaji bila malipo na kuvinjari soko',
      step3: 'Kufuatilia uwasilishaji wako kupitia mchakato',
      step4: 'Ujumbe kutoka kwa wanunuzi, na kubadilisha bei yako',
      step5: 'Ukaguzi wa gari na ushahidi wa tangazo pale inapohitajika',
      step6: 'Kuangalia, mazungumzo, mkataba, malipo, uhamishaji na utoaji',
      alreadyHaveApp: 'Tayari una programu?',
      openSellerFlow: 'Fungua mchakato wa muuzaji',
    },
    centers: {
      eyebrow: 'Mahali unapolileta',
      title: 'Vituo vya ukaguzi kote Kigali',
      description:
        'Huduma za ukaguzi hufanyika katika kituo unachochagua. Leta gari, kitambulisho chako na kumbukumbu zozote za matengenezo ulizonazo.',
    },
    faq: { eyebrow: 'Maswali', title: 'Kile wauzaji hutuuliza kwanza' },
    close: {
      headline: 'Gundua thamani yake kwanza',
      valueMy: 'Kadiria gari langu',
      getApp: 'Pata programu ili kuwasilisha',
      body: 'Ukadiriaji haugharimu chochote na haukulazimishi chochote. Ikiwa namba inafaa, thibitisha kitambulisho chako kwenye programu na uweke miadi ya ukaguzi katika kituo kilicho karibu nawe.',
    },
  },

  ko: {
    metaTitle: '르완다 키갈리에서 내 차 판매 — 시세 평가 및 검사',
    metaDescription:
      '판매자 인증, 검사, 통제된 게시를 위해 Sawa Cars에 차량을 접수하세요. 구매자 문의를 직접 관리하고 가격 결정권을 유지하세요.',
    metaOgTitle: '{{name}}와(과) 함께 내 차 판매',
    metaOgDescription:
      '저희가 인증 매물을 검토·검사·게시합니다. 모든 판매는 구매자와 직접 소통하고 합의합니다.',
    hero: {
      eyebrow: '내 차 판매',
      title: '키갈리에서 내 차의 가치는 얼마일까요?',
      subtitle:
        '조회표가 아니라 Sawa Cars에 실제로 등록되고 판매된 차량을 기준으로 가격을 산정합니다. 금액이 맞으면 검사하고 유용한 갤러리를 만들며 관리자 검토 후에만 게시합니다. 이후 인증된 구매자 문의와 모든 합의를 직접 관리합니다.',
      bullet1: '시세 평가는 약 10초 걸리며 계정이 필요 없습니다',
      bullet2: '가격 결정권을 처음부터 끝까지 유지합니다',
      bullet3: '구매자가 전화나 WhatsApp 연락을 요청할 수 있는지 직접 정합니다',
      seeCost: '판매 비용 보기',
      costNote: '— 두 가지 비용, 모두 약속 전에 안내됩니다.',
      freeValuation: '무료 시세 평가',
    },
    work: {
      eyebrow: '저희가 하는 일',
      title: '더 이상 직접 하지 않아도 되는 여섯 가지',
      description:
        '키갈리에서 개인이 직접 판매하려면 차를 촬영하고, 전화를 받고, 낯선 사람을 만나고, 서류가 통과되기를 바라야 합니다. 이 모든 것 없이 같은 판매를 하는 것입니다.',
      inspect: {
        title: '제대로 검사합니다',
        body: '엔진과 구동계, 브레이크와 조향, 차체, 실내, 전자장치, 타이어, 서류에 걸친 150개 항목 점검. 모든 항목은 통과·주의·실패로 평가되며 전체 보고서가 매물과 함께 게시됩니다.',
      },
      photograph: {
        title: '촬영합니다',
        body: '이 차량에 필요한 외관, 실내, 서류, 결함 사진을 담은 명확하고 정직한 갤러리를 추가합니다. 정해진 각도 수는 없습니다.',
      },
      price: {
        title: '증거를 바탕으로 가격을 매깁니다',
        body: 'Sawa Cars에서 비슷한 차량이 어느 가격에 등록·판매되는지 보여드리면 회원님이 호가를 정합니다. 차량이 게시된 동안 언제든 변경할 수 있습니다.',
      },
      contact: {
        title: '연락 수단을 직접 선택합니다',
        body: '앱 내 메시지를 사용하거나 전화·WhatsApp 공개를 허용하세요. 직접 연락처는 로그인한 구매자가 마켓플레이스 안내에 동의한 후에만 공개됩니다.',
      },
      agree: {
        title: '판매를 직접 합의합니다',
        body: '회원님과 구매자가 가격, 결제, 차량 확인, 서면 계약, 소유권 이전, 인도를 정하며 Sawa Cars를 당사자로 두지 않습니다.',
      },
      payment: {
        title: 'Sawa는 결코 대금을 보관하지 않습니다',
        body: '플랫폼 결제나 에스크로가 없습니다. 구매자와 수령인을 확인하고, 조건을 문서로 남기며, 별도 결제의 증빙을 보관하세요.',
      },
    },
    pipeline: {
      eyebrow: '판매 방식',
      title: '다섯 단계, 매 단계마다 진행 상황을 알 수 있습니다',
      description:
        '접수 건은 검증부터 검사, 게시, 판매자가 알린 마감까지 상태를 나타냅니다.',
    },
    boundaries: {
      eyebrow: '명확한 경계',
      title: '플랫폼이 관리하는 것—그리고 회원님이 관리하는 것',
      description:
        '게시 절차는 Sawa Cars가 관리합니다. 거래 절차는 회원님과 구매자의 몫입니다.',
      platform: '플랫폼',
      pubReqTitle: '게시 요건',
      pubReqBody:
        '관리자가 공개하기 전에 계정이 활성·인증 상태여야 하고, 필수 검사가 완료되어야 하며, 매물에 유효한 갤러리가 있어야 합니다.',
      seller: '판매자',
      commTitle: '구매자와 직접 소통',
      commBody:
        '플랫폼에서 답하거나 전화·WhatsApp을 활성화하세요. 매물을 정확하게 유지하고, 중요한 변경을 알리며, 더 이상 판매하지 않으면 일시중지하거나 판매 완료로 표시하세요.',
      independent: '독립',
      contractTitle: '계약과 결제',
      contractBody:
        '회원님과 구매자가 점검, 가격, 결제, 소유권 이전, 인도, 서면 조건에 대한 책임을 집니다. Sawa Cars는 돈을 보관하거나 거래를 보증하지 않습니다.',
      noCheckoutBold: 'Sawa 거래 결제는 없습니다.',
      noCheckoutBody:
        ' 회원님에게 연락하는 것은 문의일 뿐이며, 차량을 예약하거나 Sawa Cars와 계약을 만들지 않습니다.',
    },
    app: {
      eyebrow: '시작하기 전에',
      title: '한 단계는 앱에서 진행해야 합니다',
      body1:
        '차량을 먼저 접수할 수 있습니다. 매물이나 직접 연락처가 공개되기 전에 일회성 신원 확인을 완료하세요: 국가 신분증 앞뒷면 사진과 셀피. Sawa Cars 앱에서 촬영하며 약 2분이 걸리고, 한 번만 승인받으면 됩니다.',
      body2:
        '이것이 Sawa Cars에 허위 매물이 없는 이유이기도 합니다. 이 마켓플레이스의 모든 판매자는 저희 팀이 확인한 인증된 사람입니다.',
      whereTitle: '각 단계가 이루어지는 곳',
      whereApp: '앱',
      whereWeb: '웹',
      whereBoth: '둘 다',
      whereCenter: '센터',
      whereDirect: '직접',
      step1: '신원 확인 및 차량 접수',
      step2: '무료 시세 평가 및 시장 둘러보기',
      step3: '접수 건의 진행 상황 추적',
      step4: '구매자 메시지 및 가격 변경',
      step5: '필요한 경우 차량 검사 및 매물 증빙',
      step6: '차량 확인, 협상, 계약, 결제, 이전 및 인도',
      alreadyHaveApp: '이미 앱이 있으신가요?',
      openSellerFlow: '판매자 흐름 열기',
    },
    centers: {
      eyebrow: '차를 가져오는 곳',
      title: '키갈리 전역의 검사 센터',
      description:
        '검사 서비스는 회원님이 선택한 센터에서 진행됩니다. 차량, 신분증, 보유한 정비 기록을 가져오세요.',
    },
    faq: { eyebrow: '질문', title: '판매자가 가장 먼저 묻는 것' },
    close: {
      headline: '먼저 가치를 확인하세요',
      valueMy: '내 차 시세 평가',
      getApp: '접수하려면 앱 받기',
      body: '시세 평가는 무료이며 어떤 의무도 없습니다. 금액이 맞으면 앱에서 신원을 인증하고 가장 가까운 센터에서 검사를 예약하세요.',
    },
  },

  zh: {
    metaTitle: '在卢旺达基加利出售您的车辆 — 估价与检测',
    metaDescription:
      '提交您的车辆，接受卖家身份验证、检测，并在 Sawa Cars 上受控发布。直接管理买家咨询，价格由您掌控。',
    metaOgTitle: '与 {{name}} 一起出售您的车辆',
    metaOgDescription:
      '我们负责审核、检测并发布已验证的车源。您直接与买家沟通并达成任何买卖协议。',
    hero: {
      eyebrow: '出售您的车辆',
      title: '您的车在基加利值多少钱？',
      subtitle:
        '价格依据 Sawa Cars 上实际上架并成交的车辆——绝非查价表。如果价格合适，我们会检测车辆、制作实用的图片相册，并仅在管理员审核后发布。之后您将直接管理已验证买家的咨询及任何协议。',
      bullet1: '估价大约只需十秒，无需注册账户',
      bullet2: '全程由您掌握价格',
      bullet3: '是否允许买家索取电话或WhatsApp联系方式，由您决定',
      seeCost: '查看出售需要哪些费用',
      costNote: '——两项费用，均在您决定前明确告知。',
      freeValuation: '免费估价',
    },
    work: {
      eyebrow: '我们为您做的事',
      title: '六件您不再需要亲自动手的事',
      description:
        '在基加利私下出售车辆意味着自己拍照、接听电话、与陌生人见面，还要祈祷手续顺利过关。同样的出售，却不必经历这些。',
      inspect: {
        title: '我们妥善检测车辆',
        body: '涵盖发动机与传动系统、制动与转向、车身、内饰、电子系统、轮胎及证件的150项检测。每一项均评为通过、警示或不合格，完整报告将随车源一同发布。',
      },
      photograph: {
        title: '我们为车辆拍摄照片',
        body: '我们会添加清晰、真实的相册，包含这辆车所需的外观、内饰、证件及瑕疵照片。拍摄角度数量不固定。',
      },
      price: {
        title: '我们依据实据为车辆定价',
        body: '我们向您展示 Sawa Cars 上同类车辆的上架及成交价格，再由您设定标价。车辆在售期间您可随时更改价格。',
      },
      contact: {
        title: '联系方式由您选择',
        body: '可使用应用内消息，或选择公开电话与WhatsApp联系方式。直接联系方式只有在已登录的买家确认市场须知后才会公开。',
      },
      agree: {
        title: '买卖协议由您直接达成',
        body: '您与买家自行决定价格、付款、看车、书面合同、所有权转移及交付，Sawa Cars 不作为交易的一方。',
      },
      payment: {
        title: 'Sawa 绝不持有付款',
        body: '平台没有结账或托管功能。请核实买家与收款方身份，将条款记录在案，并保留任何独立付款的凭证。',
      },
    },
    pipeline: {
      eyebrow: '出售流程说明',
      title: '五个步骤，每一步您都清楚进展',
      description:
        '您的提交会显示状态，从验证到检测、发布，以及卖家上报的任何成交结案。',
    },
    boundaries: {
      eyebrow: '清晰的边界',
      title: '平台管控的内容——与您掌控的内容',
      description:
        '发布流程由 Sawa Cars 管理，交易流程则属于您与买家。',
      platform: '平台',
      pubReqTitle: '发布要求',
      pubReqBody:
        '在管理员将其公开发布前，您的账户必须处于活跃且已验证状态，所需的检测必须已完成，且车源需具备有效的相册。',
      seller: '卖家',
      commTitle: '与买家直接沟通',
      commBody:
        '在平台内回复，或开启电话与WhatsApp联系方式。请保持车源信息准确，披露重大变动，并在车辆不再可售时暂停或标记为已售。',
      independent: '独立',
      contractTitle: '合同与付款',
      contractBody:
        '您与买家共同负责检测、价格、付款、所有权转移、交付及书面条款。Sawa Cars 不持有资金，也不为交易提供担保。',
      noCheckoutBold: 'Sawa 不提供交易结账服务。',
      noCheckoutBody:
        ' 联系您仅是一次咨询，并不预留车辆，也不构成与 Sawa Cars 的任何合同关系。',
    },
    app: {
      eyebrow: '开始之前',
      title: '有一个步骤必须在应用内完成',
      body1:
        '您可以先提交车辆信息。在车源或您的直接联系方式公开之前，需完成一次性身份验证：拍摄国民身份证正反面照片及一张自拍照。该操作在 Sawa Cars 应用内完成，大约需要两分钟，且只需批准一次。',
      body2:
        '这也是 Sawa Cars 上没有虚假车源的原因。这个市场上的每一位卖家，都是经过我们团队核实的真实身份用户。',
      whereTitle: '每个步骤在哪里完成',
      whereApp: '应用',
      whereWeb: '网页',
      whereBoth: '两者皆可',
      whereCenter: '中心',
      whereDirect: '直接',
      step1: '身份验证及提交车辆',
      step2: '免费估价及浏览市场',
      step3: '追踪您的提交在流程中的进展',
      step4: '买家消息，及修改您的价格',
      step5: '车辆检测及车源证据（如有需要）',
      step6: '看车、协商、合同、付款、过户及交付',
      alreadyHaveApp: '已经安装应用了吗？',
      openSellerFlow: '打开卖家流程',
    },
    centers: {
      eyebrow: '车辆送检地点',
      title: '基加利各地的检测中心',
      description:
        '检测服务在您选择的中心进行。请携带车辆、您的身份证件以及您掌握的任何维修记录。',
    },
    faq: { eyebrow: '常见问题', title: '卖家最先问我们的问题' },
    close: {
      headline: '先了解它的价值',
      valueMy: '为我的车估价',
      getApp: '获取应用以提交车辆',
      body: '估价不收取任何费用，也不构成任何承诺。如果价格合适，请在应用内验证您的身份，并在离您最近的中心预约检测。',
    },
  },
}
