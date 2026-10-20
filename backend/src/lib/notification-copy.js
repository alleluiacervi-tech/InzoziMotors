// The wording of pushes Sawa sends on its own initiative, in each person's
// language. The notification ROW (what Notification Center shows) keeps the
// English text it was written with; only the push, which is the part a person
// reads first, is rendered per recipient from users.preferred_language.
//
// Scope is deliberate: the kinds that reach the most people (messages and the
// alerts). Every other notification keeps its stored English text until it is
// added here, so a missing entry is never an error and never a blank push.
//
// English is the source and the fallback. The Kinyarwanda and Kiswahili wording
// is a first draft that a native speaker must read before release
// (docs/PUSH-NOTIFICATIONS-TODO.md, Phase 3).
//
// Variables are filled with {name}. User-written text (a message preview, a
// car's title) is only ever substituted into a template, never interpreted.

const LANGUAGES = ['en', 'rw', 'fr', 'sw', 'ko', 'zh'];

const COPY = {
  new_message: {
    en: { title: 'New message', body: '{preview}' },
    rw: { title: 'Ubutumwa bushya', body: '{preview}' },
    fr: { title: 'Nouveau message', body: '{preview}' },
    sw: { title: 'Ujumbe mpya', body: '{preview}' },
    ko: { title: '새 메시지', body: '{preview}' },
    zh: { title: '新消息', body: '{preview}' },
  },
  new_message_about_car: {
    en: { title: 'New message about your car', body: 'Someone sent you a message about your {car}.' },
    rw: { title: 'Ubutumwa bushya ku modoka yawe', body: 'Hari uwakwandikiye ku modoka yawe: {car}.' },
    fr: { title: 'Nouveau message à propos de votre voiture', body: 'Quelqu’un vous a écrit au sujet de votre {car}.' },
    sw: { title: 'Ujumbe mpya kuhusu gari lako', body: 'Mtu amekutumia ujumbe kuhusu {car} yako.' },
    ko: { title: '내 차량에 대한 새 메시지', body: '누군가 {car}에 대해 메시지를 보냈습니다.' },
    zh: { title: '关于您车辆的新消息', body: '有人就您的 {car} 给您发了消息。' },
  },
  search_match: {
    en: { title: 'New match for your search', body: '{label} matches a search you saved.' },
    rw: { title: 'Imodoka nshya ihuye n’ibyo ushaka', body: '{label} ihuye n’ishakisha wabitse.' },
    fr: { title: 'Nouveau résultat pour votre recherche', body: '{label} correspond à une recherche enregistrée.' },
    sw: { title: 'Gari jipya linalolingana na utafutaji wako', body: '{label} linalingana na utafutaji uliohifadhi.' },
    ko: { title: '저장한 검색과 일치하는 새 차량', body: '{label} 차량이 저장한 검색 조건과 일치합니다.' },
    zh: { title: '有符合您搜索的新车', body: '{label} 符合您保存的搜索。' },
  },
  // The once-a-day summary (lib/daily-digest.js): a title, then a line made of
  // parts joined with " · ". Each part is a label and a number, so there are no
  // plural forms to get wrong, and a part that is zero is simply left out.
  daily_digest: {
    en: { title: 'New on Sawa today', body: '' },
    rw: { title: 'Bishya kuri Sawa uyu munsi', body: '' },
    fr: { title: 'Nouveau sur Sawa aujourd’hui', body: '' },
    sw: { title: 'Mapya kwenye Sawa leo', body: '' },
    ko: { title: '오늘 Sawa 신규 차량', body: '' },
    zh: { title: 'Sawa 今日新车', body: '' },
  },
  digest_total: {
    en: { title: '', body: 'New cars today: {total}' },
    rw: { title: '', body: 'Imodoka nshya uyu munsi: {total}' },
    fr: { title: '', body: 'Nouvelles voitures aujourd’hui : {total}' },
    sw: { title: '', body: 'Magari mapya leo: {total}' },
    ko: { title: '', body: '오늘 새 차량: {total}대' },
    zh: { title: '', body: '今日新车：{total} 辆' },
  },
  digest_hire: {
    en: { title: '', body: 'For hire: {rentals}' },
    rw: { title: '', body: 'Zo gukodesha: {rentals}' },
    fr: { title: '', body: 'À louer : {rentals}' },
    sw: { title: '', body: 'Za kukodisha: {rentals}' },
    ko: { title: '', body: '렌터카: {rentals}대' },
    zh: { title: '', body: '租赁车辆：{rentals} 辆' },
  },
  digest_matches: {
    en: { title: '', body: 'Matching your searches: {matches}' },
    rw: { title: '', body: 'Zihuye n’ishakisha ryawe: {matches}' },
    fr: { title: '', body: 'Selon vos recherches : {matches}' },
    sw: { title: '', body: 'Yanayolingana na utafutaji wako: {matches}' },
    ko: { title: '', body: '저장한 검색과 일치: {matches}대' },
    zh: { title: '', body: '符合您搜索：{matches} 辆' },
  },
  // A saved search for cars for hire matched a newly listed one (lib/rental-alerts.js).
  // "Listed for hire", never "available" or "booked": Sawa is not a booking system.
  rental_match: {
    en: { title: 'New car for hire', body: '{title} was just listed for hire.' },
    rw: { title: 'Imodoka nshya yo gukodesha', body: '{title} yashyizweho ngo ikodeshwe.' },
    fr: { title: 'Nouvelle voiture à louer', body: '{title} vient d’être mise en location.' },
    sw: { title: 'Gari jipya la kukodisha', body: '{title} limeorodheshwa kwa kukodisha.' },
    ko: { title: '새 렌터카', body: '{title} 차량이 대여 목록에 올라왔습니다.' },
    zh: { title: '新租赁车辆', body: '{title} 刚刚上架出租。' },
  },
  price_drop: {
    en: { title: 'Price drop on a saved car', body: '{title} dropped from {oldPrice} to {newPrice}.' },
    rw: { title: 'Igiciro cyagabanutse ku modoka wabitse', body: '{title}: igiciro cyavuye kuri {oldPrice} kigera kuri {newPrice}.' },
    fr: { title: 'Baisse de prix sur une voiture enregistrée', body: '{title} est passée de {oldPrice} à {newPrice}.' },
    sw: { title: 'Bei imeshuka kwenye gari ulilohifadhi', body: '{title} imeshuka kutoka {oldPrice} hadi {newPrice}.' },
    ko: { title: '저장한 차량 가격 인하', body: '{title} 가격이 {oldPrice}에서 {newPrice}(으)로 내려갔습니다.' },
    zh: { title: '已收藏车辆降价', body: '{title} 已从 {oldPrice} 降至 {newPrice}。' },
  },
};

function normalizeLanguage(value) {
  return LANGUAGES.includes(value) ? value : 'en';
}

function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (match, name) => (
    vars && vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : ''
  )).trim();
}

// copy: { key, vars }. Returns { title, body } in the language, or null when the
// key is unknown (the caller then uses the text it already has).
function renderCopy(copy, language) {
  const entry = copy && COPY[copy.key];
  if (!entry) return null;
  const lang = normalizeLanguage(language);
  const text = entry[lang] || entry.en;
  // A message made of parts (the daily summary): the title from the entry, the
  // body from each part's own entry, joined. An unknown part is skipped.
  if (Array.isArray(copy.parts)) {
    const lines = copy.parts
      .map((part) => {
        const partEntry = COPY[part.key];
        return partEntry ? fill((partEntry[lang] || partEntry.en).body, part.vars) : '';
      })
      .filter(Boolean);
    return { title: fill(text.title, copy.vars), body: lines.join(' · ') };
  }
  return { title: fill(text.title, copy.vars), body: fill(text.body, copy.vars) };
}

module.exports = { renderCopy, normalizeLanguage, LANGUAGES, COPY };
