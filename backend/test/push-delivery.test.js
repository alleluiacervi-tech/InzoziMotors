// Push delivery rules that need no database: which Android channel a kind of
// notification uses, that every message carries its own iOS badge, and how
// Expo's tickets and receipts are read (lib/push.js, lib/notify.js).
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const { channelForType } = require('../src/lib/notify');
const { sendExpoPushDetailed, fetchReceipts } = require('../src/lib/push');

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

const TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const TOKEN_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

function stubFetch(responder) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { status: 200, json: async () => responder(url, JSON.parse(init.body)) };
  };
  return calls;
}

test('messages, alerts and everything else go to their own Android channel', () => {
  assert.equal(channelForType('new_message'), 'messages');
  assert.equal(channelForType('search_match'), 'alerts');
  assert.equal(channelForType('price_drop'), 'alerts');
  assert.equal(channelForType('daily_digest'), 'alerts');
  assert.equal(channelForType('listing_approved'), 'default');
  assert.equal(channelForType(undefined), 'default');
});

test('a push carries the channel and a badge per device', async () => {
  const calls = stubFetch((url, body) => ({
    data: body.map((m, i) => ({ status: 'ok', id: `receipt-${i}` })),
  }));
  const badges = new Map([[TOKEN_A, 3], [TOKEN_B, 0]]);
  const { delivered, results } = await sendExpoPushDetailed([TOKEN_A, TOKEN_B], {
    title: 'New message', body: 'Hi', data: { type: 'new_message' }, channelId: 'messages', badges,
  });
  assert.equal(delivered, 2);
  assert.equal(calls.length, 1);
  const [a, b] = calls[0].body;
  assert.equal(a.channelId, 'messages');
  assert.equal(a.badge, 3);
  assert.equal(b.badge, 0, 'a zero badge is sent, so the icon clears');
  assert.deepEqual(results.map((r) => r.receiptId), ['receipt-0', 'receipt-1']);
});

test('without a channel or badges the message is unchanged for older callers', async () => {
  const calls = stubFetch((url, body) => ({ data: body.map(() => ({ status: 'ok', id: 'r' })) }));
  await sendExpoPushDetailed([TOKEN_A], { title: 'T', body: 'B' });
  const [m] = calls[0].body;
  assert.equal(m.channelId, 'default');
  assert.equal('badge' in m, false);
});

test('a ticket error is reported per device, not as success', async () => {
  stubFetch(() => ({
    data: [{ status: 'error', message: 'no key', details: { error: 'InvalidCredentials' } }],
  }));
  const { delivered, results } = await sendExpoPushDetailed([TOKEN_A], { title: 'T', body: 'B' });
  assert.equal(delivered, 0);
  assert.equal(results[0].ok, false);
  assert.equal(results[0].error, 'InvalidCredentials');
});

test('receipts: ok, error, and not-ready-yet are told apart', async () => {
  stubFetch(() => ({
    data: {
      'id-ok': { status: 'ok' },
      'id-bad': { status: 'error', message: 'bad key', details: { error: 'InvalidCredentials' } },
    },
  }));
  const out = await fetchReceipts(['id-ok', 'id-bad', 'id-missing']);
  assert.deepEqual(out.get('id-ok'), { ok: true });
  assert.equal(out.get('id-bad').ok, false);
  assert.equal(out.get('id-bad').error, 'InvalidCredentials');
  assert.equal(out.has('id-missing'), false, 'a receipt not ready yet is absent, not an error');
});

test('a dead push service never throws', async () => {
  global.fetch = async () => { throw new Error('offline'); };
  const { delivered, results } = await sendExpoPushDetailed([TOKEN_A], { title: 'T', body: 'B' });
  assert.equal(delivered, 0);
  assert.equal(results[0].error, 'NetworkError');
  assert.equal((await fetchReceipts(['x'])).size, 0);
});

// ─── Wording per language (lib/notification-copy.js) ────────────────────────

const { renderCopy, normalizeLanguage, COPY, LANGUAGES } = require('../src/lib/notification-copy');

test('every message has every language, and the same {placeholders} in each', () => {
  const holes = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
  for (const [key, entry] of Object.entries(COPY)) {
    for (const lang of LANGUAGES) {
      assert.ok(entry[lang], `${key} is missing ${lang}`);
      assert.equal(holes(entry[lang].title), holes(entry.en.title), `${key}/${lang} title placeholders`);
      assert.equal(holes(entry[lang].body), holes(entry.en.body), `${key}/${lang} body placeholders`);
    }
  }
});

test('a push renders in the recipient language and falls back to English', () => {
  const copy = { key: 'price_drop', vars: { title: 'RAV4', oldPrice: 'RWF 20,000,000', newPrice: 'RWF 18,000,000' } };
  assert.equal(renderCopy(copy, 'fr').title, 'Baisse de prix sur une voiture enregistrée');
  assert.equal(renderCopy(copy, 'en').body, 'RAV4 dropped from RWF 20,000,000 to RWF 18,000,000.');
  assert.deepEqual(renderCopy(copy, null), renderCopy(copy, 'en'), 'never told us = English');
  assert.deepEqual(renderCopy(copy, 'xx'), renderCopy(copy, 'en'), 'an unknown code = English');
  assert.equal(renderCopy({ key: 'not_a_key' }, 'fr'), null, 'an unknown key leaves the stored text alone');
});

test('user-written text is substituted, never interpreted', () => {
  const out = renderCopy({ key: 'new_message', vars: { preview: '{preview} {car} $& x' } }, 'en');
  assert.equal(out.body, '{preview} {car} $& x');
  assert.equal(normalizeLanguage('rw'), 'rw');
  assert.equal(normalizeLanguage(undefined), 'en');
});
