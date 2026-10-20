// ─────────────────────────────────────────────────────────────────────────────
// Calmer alerts, the daily summary and push delivery
// (migrations 0063-0064, docs/PUSH-NOTIFICATIONS-TODO.md phases 2-5).
//
// What each group pins down:
//   - a saved search is told about a car once, even if the listing goes live
//     again; 'daily' searches and opted-out people get no instant alert;
//   - quiet hours (21:00-07:00 Kigali) hold the PUSH but not the in-app row,
//     and release it exactly once;
//   - a price drop under 1% is not news, and a car alerts once a day;
//   - the summary: opt-in only, inside 18:00-21:00 Kigali, once per Kigali day,
//     never on a day with nothing new, in the person's language;
//   - each push carries its Android channel and an iOS badge;
//   - the new profile / saved-search fields validate;
//   - the Settings test button reports Apple/Google's receipt, not just Expo's.
//
// Time is injected (`now`), so these never depend on when CI runs.
// ─────────────────────────────────────────────────────────────────────────────
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { matchSavedSearches, notifyPriceDrop, releaseHeldPushes } = require('../src/lib/alerts');
const { runDailyDigest } = require('../src/lib/daily-digest');
const { withJobLock } = require('../src/lib/scheduler');
const { ALL_ITEMS, CHECKLIST_VERSION } = require('../src/lib/inspection-policy');
const { publiclyVisibleSql } = require('../src/lib/inspection-evidence');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const ALL_PASS = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, 'pass']));
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

// Kigali is UTC+2.
const DAY = new Date('2026-10-20T10:00:00Z');       // 12:00 Kigali
const NIGHT = new Date('2026-10-20T20:00:00Z');     // 22:00 Kigali
const MORNING = new Date('2026-10-21T05:00:00Z');   // 07:00 Kigali
const EVENING = new Date('2026-10-20T16:30:00Z');   // 18:30 Kigali
const FAR_FUTURE_EVENING = new Date('2031-03-01T16:30:00Z'); // no car is "new" then

const realFetch = global.fetch;
const sent = [];
before(() => {
  // Only Expo is stubbed; every push the code sends lands in `sent`.
  global.fetch = async (url, init) => {
    if (!String(url).includes('exp.host')) return realFetch(url, init);
    const body = JSON.parse(init.body);
    if (String(url).endsWith('/send')) {
      sent.push(...body);
      return { status: 200, json: async () => ({ data: body.map((m, i) => ({ status: 'ok', id: `rcpt-${m.to}-${i}` })) }) };
    }
    // getReceipts: the iPhone's key is wrong, the Android is fine.
    const data = {};
    for (const id of body.ids) {
      data[id] = id.includes('[bad]')
        ? { status: 'error', message: 'wrong key', details: { error: 'InvalidCredentials' } }
        : { status: 'ok' };
    }
    return { status: 200, json: async () => ({ data }) };
  };
});
after(() => { global.fetch = realFetch; });

async function register(extra = {}) {
  const res = await api().post('/auth/register')
    .send({ name: 'Alert Tester', email: unique('digest'), password: 'password123', role: 'buyer' }).expect(201);
  const id = res.body.user.id;
  if (extra.digest) await pool.query('UPDATE users SET alert_daily_digest = TRUE WHERE id = $1', [id]);
  if (extra.lang) await pool.query('UPDATE users SET preferred_language = $2 WHERE id = $1', [id, extra.lang]);
  if (extra.token) {
    await pool.query(`INSERT INTO device_tokens (user_id, token, platform) VALUES ($1, $2, 'ios')`, [id, extra.token]);
  }
  return { id, token: res.body.token };
}

// A live car anyone can see: a verified seller and a complete inspection, the
// same evidence the public catalogue requires (lib/inspection-evidence.js). The
// daily summary only counts cars the list would show.
async function car(sellerId, { make = 'Toyota', model = 'RAV4', price = 25000000, status = 'live' } = {}) {
  await pool.query(
    `UPDATE users SET role = 'seller', id_verified = 'approved', account_status = 'active' WHERE id = $1`, [sellerId]);
  const { rows: [row] } = await pool.query(
    `INSERT INTO cars (seller_id, title, make, model, year, mileage, price, status, images)
     VALUES ($1, $2, $3, $4, 2020, 40000, $5, $6, ARRAY['https://example.com/a.jpg']) RETURNING *`,
    [sellerId, `${make} ${model} ${Math.random().toString(36).slice(2, 7)}`, make, model, price, status]
  );
  const { rows: [sub] } = await pool.query(
    `INSERT INTO submissions (car_id, seller_id, status, make, model, year, mileage, asking_price)
     VALUES ($1, $2, 'live', $3, $4, 2020, 40000, $5) RETURNING id`,
    [row.id, sellerId, make, model, price]
  );
  await pool.query(
    `INSERT INTO inspections (submission_id, car_id, center, status, checklist_results,
       checklist_version, score, passed, critical_failures, completed_at, scheduled_date)
     VALUES ($1, $2, 'Kigali', 'complete', $3::jsonb, $4, 150, TRUE, '[]'::jsonb, NOW(), CURRENT_DATE)`,
    [sub.id, row.id, JSON.stringify(ALL_PASS), CHECKLIST_VERSION]
  );
  return row;
}

async function savedSearch(userId, filters, mode = 'instant') {
  const { rows: [row] } = await pool.query(
    `INSERT INTO saved_searches (user_id, label, filters, alert_mode)
     VALUES ($1, 'My search', $2, $3) RETURNING id`,
    [userId, JSON.stringify(filters), mode]
  );
  return row.id;
}

const count = async (sql, params) => Number((await pool.query(sql, params)).rows[0].c);
// A make per test (no other test uses them), so one test's saved searches never
// match another test's cars.
const makeFor = (name) => `Zeta${name}${Math.random().toString(36).slice(2, 6)}`;

test('a car going live alerts each saved search once, and honours daily mode and the opt-out', async () => {
  const MAKE = makeFor('Match');
  const seller = await register();
  const instant = await register({ token: 'ExponentPushToken[instant]', lang: 'fr' });
  const daily = await register();
  const optedOut = await register();
  await savedSearch(instant.id, { make: MAKE });
  await savedSearch(daily.id, { make: MAKE }, 'daily');
  await savedSearch(optedOut.id, { make: MAKE });
  await pool.query('UPDATE users SET alert_search_matches = FALSE WHERE id = $1', [optedOut.id]);

  const listing = await car(seller.id, { make: MAKE });
  assert.ok(listing.first_live_at, 'a trigger stamps the moment a car first goes live');

  sent.length = 0;
  assert.equal(await matchSavedSearches(listing, { now: DAY }), 1, 'only the instant search');
  await settle();
  assert.equal(await matchSavedSearches(listing, { now: DAY }), 0, 'live -> review -> live does not alert again');
  assert.equal(await count(`SELECT COUNT(*) c FROM notifications WHERE type = 'search_match' AND meta->>'carId' = $1`, [listing.id]), 1);

  const push = sent.find((m) => m.to === 'ExponentPushToken[instant]');
  assert.ok(push, 'the push went out');
  assert.equal(push.channelId, 'alerts');
  assert.equal(push.title, 'Nouveau résultat pour votre recherche', 'in the recipient\'s language');
  assert.equal(typeof push.badge, 'number', 'iOS gets an app-icon count');
});

test('quiet hours hold the push, not the in-app row, and release it exactly once', async () => {
  const MAKE = makeFor('Quiet');
  const seller = await register();
  const buyer = await register({ token: 'ExponentPushToken[quiet]' });
  await savedSearch(buyer.id, { make: MAKE, model: 'Quiet' });
  const listing = await car(seller.id, { make: MAKE, model: 'Quiet' });

  sent.length = 0;
  assert.equal(await matchSavedSearches(listing, { now: NIGHT }), 1, 'the row is written at once');
  await settle();
  assert.equal(sent.filter((m) => m.to === 'ExponentPushToken[quiet]').length, 0, 'no push at 22:00');

  await releaseHeldPushes({ now: new Date('2026-10-20T21:00:00Z') }); // 23:00 Kigali: still quiet
  await settle();
  assert.equal(sent.filter((m) => m.to === 'ExponentPushToken[quiet]').length, 0, 'not released before 07:00');

  await releaseHeldPushes({ now: MORNING });
  await settle();
  assert.equal(sent.filter((m) => m.to === 'ExponentPushToken[quiet]').length, 1, 'released at 07:00');

  await releaseHeldPushes({ now: MORNING });
  await settle();
  assert.equal(sent.filter((m) => m.to === 'ExponentPushToken[quiet]').length, 1, 'never released twice');
});

test('a price drop under 1% is not news, and a car alerts once a day', async () => {
  const MAKE = makeFor('Drop');
  const seller = await register();
  const saver = await register({ token: 'ExponentPushToken[saver]', lang: 'sw' });
  const listing = await car(seller.id, { make: MAKE, model: 'Drop' });
  await pool.query('INSERT INTO saved_cars (user_id, car_id) VALUES ($1, $2)', [saver.id, listing.id]);

  sent.length = 0;
  assert.equal(await notifyPriceDrop(listing.id, 25000000, 24900000, listing.title, 'RWF', { now: DAY }), 0, '0.4% is a rounding');
  assert.equal(await notifyPriceDrop(listing.id, 25000000, 23000000, listing.title, 'RWF', { now: DAY }), 1);
  assert.equal(await notifyPriceDrop(listing.id, 23000000, 21000000, listing.title, 'RWF', { now: DAY }), 0, 'a second drop inside a day is held back');
  await settle();
  const pushes = sent.filter((m) => m.to === 'ExponentPushToken[saver]');
  assert.equal(pushes.length, 1);
  assert.equal(pushes[0].title, 'Bei imeshuka kwenye gari ulilohifadhi');
});

test('the daily summary: opt-in, inside the window, once per Kigali day, only when something is new', async () => {
  const MAKE = makeFor('Digest');
  const seller = await register();
  const matching = await register({ digest: true, token: 'ExponentPushToken[digest-match]', lang: 'sw' });
  const plain = await register({ digest: true, token: 'ExponentPushToken[digest-plain]' });
  const notOptedIn = await register({ token: 'ExponentPushToken[digest-off]' });
  await savedSearch(matching.id, { make: MAKE, model: 'Digest' });
  await car(seller.id, { make: MAKE, model: 'Digest' });
  // The shared test database has other live cars; the summary counts them all.
  const total = await count(
    `SELECT COUNT(*) c FROM cars c JOIN users eligible_seller ON eligible_seller.id = c.seller_id
      WHERE c.status = 'live' AND c.first_live_at > $1 AND ${publiclyVisibleSql('c', 'eligible_seller')}`,
    [new Date(EVENING.getTime() - 24 * 3_600_000)]);

  sent.length = 0;
  assert.equal((await runDailyDigest({ now: DAY })).reason, 'outside-window', 'never at midday');
  assert.equal((await runDailyDigest({ now: NIGHT })).reason, 'outside-window', 'never at night');

  const first = await runDailyDigest({ now: EVENING });
  assert.ok(first.sent >= 2);
  await settle();
  const byToken = Object.fromEntries(sent.map((m) => [m.to, m]));
  assert.ok(byToken['ExponentPushToken[digest-plain]']);
  assert.ok(!byToken['ExponentPushToken[digest-off]'], 'off by default: promotional push needs consent');
  // A "For hire" part appears only if cars for hire came on today; this test is
  // about cars for sale (test/rental-alerts.test.js covers the hire line).
  assert.match(byToken['ExponentPushToken[digest-plain]'].body, new RegExp(`^New cars today: ${total}( · For hire: \\d+)?$`));
  assert.match(byToken['ExponentPushToken[digest-match]'].body,
    new RegExp(`^Magari mapya leo: ${total}( · Za kukodisha: \\d+)? · Yanayolingana na utafutaji wako: [1-9]\\d*$`));
  assert.equal(byToken['ExponentPushToken[digest-plain]'].channelId, 'alerts');
  assert.equal(await count(`SELECT COUNT(*) c FROM notifications WHERE user_id = $1 AND type = 'daily_digest'`, [plain.id]), 1);
  assert.equal(await count(`SELECT COUNT(*) c FROM notifications WHERE user_id = $1 AND type = 'daily_digest'`, [notOptedIn.id]), 0);

  // What the summary opens onto: the same cars the summary counted, nothing the
  // public list would hide (a live car with no inspection evidence).
  await pool.query(
    `INSERT INTO cars (seller_id, title, make, model, year, mileage, price, status, images)
     VALUES ($1, 'Uninspected', $2, 'Digest', 2020, 1, 1000000, 'live', ARRAY['https://example.com/a.jpg'])`,
    [seller.id, MAKE]
  );
  const fresh = await api().get(`/cars?new=today&make=${MAKE}`).expect(200);
  assert.equal(fresh.body.length, 1, 'the list shows the inspected car only');
  assert.equal(fresh.body[0].model, 'Digest');

  assert.equal((await runDailyDigest({ now: EVENING })).sent, 0, 'a second run the same day sends nothing');
  assert.equal((await runDailyDigest({ now: FAR_FUTURE_EVENING })).reason, 'nothing-new', 'nothing new, nothing sent');
});

test('a second server cannot take a job that is already running', async () => {
  let secondRan = false;
  await withJobLock('test-lock', async () => {
    await withJobLock('test-lock', async () => { secondRan = true; }).catch(() => {});
  });
  // Same connection pool, different session: the inner attempt must be refused.
  assert.equal(secondRan, false);
});

test('profile and saved-search fields validate', async () => {
  const user = await register();
  const auth = { Authorization: `Bearer ${user.token}` };

  const me = await api().get('/auth/me').set(auth).expect(200);
  assert.equal(me.body.alert_daily_digest, false, 'the summary is off until someone turns it on');
  assert.equal(me.body.preferred_language, null);

  await api().patch('/auth/me').set(auth).send({ preferred_language: 'xx' }).expect(400);
  await api().patch('/auth/me').set(auth).send({ alert_daily_digest: 'yes' }).expect(400);
  const set = await api().patch('/auth/me').set(auth)
    .send({ preferred_language: 'rw', alert_daily_digest: true }).expect(200);
  assert.equal(set.body.preferred_language, 'rw');
  assert.equal(set.body.alert_daily_digest, true);
  const cleared = await api().patch('/auth/me').set(auth).send({ preferred_language: null }).expect(200);
  assert.equal(cleared.body.preferred_language, null);

  const created = await api().post('/saved-searches').set(auth)
    .send({ label: 'Daily', filters: { make: 'Honda' }, alert_mode: 'daily' }).expect(201);
  assert.equal(created.body.alert_mode, 'daily');
  await api().post('/saved-searches').set(auth)
    .send({ label: 'Bad', filters: { make: 'Honda' }, alert_mode: 'weekly' }).expect(400);
  const patched = await api().patch(`/saved-searches/${created.body.id}`).set(auth)
    .send({ alert_mode: 'instant' }).expect(200);
  assert.equal(patched.body.alert_mode, 'instant');
  assert.equal(patched.body.notify_enabled, true, 'a field that is not sent keeps its value');
  await api().patch(`/saved-searches/${created.body.id}`).set(auth).send({}).expect(400);
});

test('the test button reports what Apple or Google said, not just what Expo accepted', async () => {
  const user = await register();
  const auth = { Authorization: `Bearer ${user.token}` };
  await pool.query(
    `INSERT INTO device_tokens (user_id, token, platform) VALUES ($1, 'ExponentPushToken[good]', 'android'),
                                                                 ($1, 'ExponentPushToken[bad]', 'ios')`,
    [user.id]
  );
  const res = await api().post('/devices/test').set(auth).expect(200);
  const android = res.body.devices.find((d) => d.platform === 'android');
  const ios = res.body.devices.find((d) => d.platform === 'ios');
  assert.equal(android.ok, true);
  assert.equal(android.receipt, 'ok');
  assert.equal(ios.ok, false, 'a rejected receipt is a failure, not a success');
  assert.equal(ios.error, 'InvalidCredentials');
  assert.equal(res.body.sent, 1);
});
