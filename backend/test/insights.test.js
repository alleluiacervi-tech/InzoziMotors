// ─────────────────────────────────────────────────────────────────────────────
// The admin business view: insights, CSV exports and PDF statements.
//
// What these tests protect:
//   - the window: Kigali calendar days, an equal-length previous period, and a
//     400 (never a silently widened window) for anything malformed;
//   - revenue: one rule everywhere, so the overview, the revenue CSV and the
//     monthly statement agree to the franc, including across midnight in
//     Kigali when UTC still calls it the day before;
//   - funnels are cohorts and can never exceed 100% or grow between steps
//     (the old Action Center printed "164%");
//   - a center with an inspection that carries two fees counts it once;
//   - exports never carry an email, a phone number or the buyer behind a
//     contact request, neutralise spreadsheet formulas, and are audit-logged.
//
// Fixtures are dated on a random day decades in the past, so every assertion
// can be an exact count over a window nothing else in the database touches.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { parseRange, parseMonth, kigaliToday, addDays } = require('../src/lib/insights-range');
const { budgetBands, BUDGET_EDGES_RWF } = require('../src/lib/insights-bands');
const { toCsv } = require('../src/lib/csv');
const { _internal: { workingDays, funnelSteps } } = require('../src/routes/insights');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

// A random Monday between 1990 and 2009: far from any real or seeded data.
const BASE = (() => {
  const t = Date.UTC(1990, 0, 1) + Math.floor(Math.random() * 7000) * 86_400_000;
  const d = new Date(t);
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7));
  return d.toISOString().slice(0, 10);
})();
/** A timestamp at hh:mm Kigali time on BASE + offset days, as SQL. */
const kigali = (offset, hhmm = '10:00') => `('${addDays(BASE, offset)} ${hhmm}'::timestamp AT TIME ZONE 'Africa/Kigali')`;

async function register(overrides = {}) {
  const body = { name: 'Insights User', email: unique('insights'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin(user) {
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return { Authorization: `Bearer ${res.body.token}`, id: user.id };
}

let adminAuth;
let seller;
let buyer;
test.before(async () => {
  adminAuth = await makeAdmin(await register({ name: 'Insights Admin' }));
  seller = await register({ role: 'seller', name: 'Insights Seller' });
  buyer = await register({ name: 'Insights Buyer', phone: '+250788123987' });
});
// Remove every fixture. They are dated decades ago, so left behind they would
// sort to the top of the Action Center (oldest first) and could push another
// test's item out of its 60-item window.
test.after(async () => {
  try {
    await pool.query('DELETE FROM listing_contact_events WHERE buyer_id = $1', [buyer.id]);
    await pool.query('DELETE FROM platform_fees WHERE seller_id = $1 OR payer_user_id = $2', [seller.id, buyer.id]);
    await pool.query('DELETE FROM inspections WHERE customer_user_id = $1', [buyer.id]);
    await pool.query('DELETE FROM submissions WHERE seller_id = $1', [seller.id]);
    await pool.query('DELETE FROM import_order_events WHERE import_order_id IN (SELECT id FROM import_orders WHERE buyer_id = $1)', [buyer.id]);
    await pool.query('DELETE FROM import_orders WHERE buyer_id = $1', [buyer.id]);
    await pool.query('DELETE FROM cars WHERE seller_id = $1', [seller.id]);
  } finally {
    await pool.end();
  }
});

async function insertCar({ status = 'archived', listedOffset = null, soldOffset = null, price = 20_000_000 } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO cars (seller_id, title, make, model, year, mileage, price, status, listed_at, sold_at)
     VALUES ($1, '2019 Toyota Harrier', 'Toyota', 'Harrier', 2019, 60000, $2, $3,
             ${listedOffset == null ? 'NULL' : kigali(listedOffset)}, ${soldOffset == null ? 'NULL' : kigali(soldOffset)})
     RETURNING id`, [seller.id, price, status]);
  return rows[0].id;
}

// ─── The window ──────────────────────────────────────────────────────────────

test('parseRange: days, explicit dates and an equal-length previous period', () => {
  const now = new Date('2026-03-10T09:00:00Z');
  const r = parseRange({ days: '7' }, now);
  assert.deepEqual(r, { from: '2026-03-04', to: '2026-03-10', days: 7, previous: { from: '2026-02-25', to: '2026-03-03' } });
  assert.equal(parseRange({}, now).days, 30, 'the default window is 30 days');
  const x = parseRange({ from: '2026-02-01', to: '2026-02-28' }, now);
  assert.equal(x.days, 28);
  assert.deepEqual(x.previous, { from: '2026-01-04', to: '2026-01-31' });
});

test('parseRange refuses anything malformed instead of widening the window', () => {
  for (const q of [{ days: '0' }, { days: '-3' }, { days: '2.5' }, { days: 'week' }, { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-03-02', to: '2026-03-01' }, { from: '2026-03-01' }, { from: '2024-01-01', to: '2025-06-01' }]) {
    assert.throws(() => parseRange(q), (err) => err.status === 400, JSON.stringify(q));
  }
});

test('the reporting day is the Kigali day, not the UTC day', () => {
  assert.equal(kigaliToday(new Date('2026-03-31T22:30:00Z')), '2026-04-01');
  assert.equal(kigaliToday(new Date('2026-03-31T21:59:00Z')), '2026-03-31');
  const feb = parseMonth('2028-02');
  assert.equal(feb.to, '2028-02-29');
  assert.deepEqual(feb.previous, { from: '2028-01-03', to: '2028-01-31' });
  assert.throws(() => parseMonth('2026-13'), (e) => e.status === 400);
});

test('working days are Monday to Saturday', () => {
  assert.equal(workingDays('2026-09-21', '2026-09-27'), 6); // Mon..Sun
  assert.equal(workingDays('2026-09-27', '2026-09-27'), 0); // a Sunday
});

test('price bands use the public homepage edges: (edge, next edge]', () => {
  assert.deepEqual(BUDGET_EDGES_RWF, [15_000_000, 30_000_000, 60_000_000]);
  assert.deepEqual(budgetBands(), [
    { min: null, max: 15_000_000 }, { min: 15_000_001, max: 30_000_000 },
    { min: 30_000_001, max: 60_000_000 }, { min: 60_000_001, max: null },
  ]);
});

test('funnel steps report share of the start and of the step before', () => {
  const steps = funnelSteps([['a', 'A'], ['b', 'B'], ['c', 'C']], [40, 10, 0]);
  assert.deepEqual(steps.map((s) => [s.of_start, s.from_previous]), [[100, null], [25, 25], [0, 0]]);
  assert.equal(funnelSteps([['a', 'A'], ['b', 'B']], [0, 0])[1].of_start, null, 'no division by zero');
});

// ─── CSV ─────────────────────────────────────────────────────────────────────

test('CSV quotes, keeps a BOM for Excel and neutralises spreadsheet formulas', () => {
  const csv = toCsv([{ key: 'a', header: 'A' }, { key: 'b', header: 'B' }], [
    { a: '=HYPERLINK("http://x")', b: -5 },
    { a: 'Kigali, "Nyarutarama"', b: null },
    { a: '+250788000000', b: true },
    { a: '@SUM(A1)', b: 0 },
  ]);
  assert.ok(csv.startsWith('﻿A,B\r\n'));
  const lines = csv.slice(1).trim().split('\r\n');
  assert.equal(lines[1], `"'=HYPERLINK(""http://x"")",-5`, 'a formula becomes text; a negative number stays a number');
  assert.equal(lines[2], '"Kigali, ""Nyarutarama""",');
  assert.equal(lines[3], "'+250788000000,yes");
  assert.equal(lines[4], "'@SUM(A1),0");
});

// ─── Access ──────────────────────────────────────────────────────────────────

test('every insight, export and statement is admin-only', async () => {
  for (const path of ['/admin/insights', '/admin/insights/funnels', '/admin/exports', '/admin/exports/revenue', '/admin/statements/revenue']) {
    await api().get(path).expect(401);
    await api().get(path).set('Authorization', `Bearer ${buyer.token}`).expect(403);
  }
});

test('a malformed window is a 400 on every endpoint', async () => {
  for (const path of ['/admin/insights', '/admin/insights/funnels', '/admin/insights/inventory', '/admin/insights/quality',
    '/admin/insights/centers', '/admin/exports/revenue', '/admin/statements/business']) {
    const res = await api().get(`${path}?from=2026-05-02&to=2026-05-01`).set(adminAuth).expect(400);
    assert.match(res.body.error, /from must not be after to/);
  }
  await api().get('/admin/statements/revenue?month=2026-5').set(adminAuth).expect(400);
  await api().get(`/admin/statements/revenue?month=${Number(kigaliToday().slice(0, 4)) + 1}-01`).set(adminAuth).expect(400);
  await api().get('/admin/exports/passwords').set(adminAuth).expect(404);
});

// ─── Revenue: one rule, Kigali days ──────────────────────────────────────────

test('revenue agrees across the overview, the CSV and the statement, split on Kigali midnight', async () => {
  // 00:30 Kigali on BASE+1 is 22:30 UTC on BASE. It belongs to BASE+1.
  await pool.query(
    `INSERT INTO platform_fees (fee_type, amount, status, currency, seller_id, method, collected_at, reference)
     VALUES ('featured', 12000, 'paid', 'RWF', $1, 'mobile_money', ${kigali(1, '00:30')}, '=cmd|calc'),
            ('featured', 3000,  'paid', 'RWF', $1, 'cash',         ${kigali(1, '23:30')}, NULL),
            ('featured', 50000, 'due',  'RWF', $1, NULL,           ${kigali(1, '12:00')}, NULL),
            ('featured', 7000,  'waived','RWF', $1, 'cash',        ${kigali(1, '12:00')}, NULL)`, [seller.id]);

  const day1 = addDays(BASE, 1);
  const before = await api().get(`/admin/insights?from=${BASE}&to=${BASE}`).set(adminAuth).expect(200);
  assert.equal(before.body.kpis.current.revenue_rwf, 0, 'the fee at 00:30 Kigali is not the previous day\'s');

  const res = await api().get(`/admin/insights?from=${day1}&to=${day1}`).set(adminAuth).expect(200);
  assert.equal(res.body.kpis.current.revenue_rwf, 15000, 'paid only: due and waived never count');
  assert.equal(res.body.kpis.previous.revenue_rwf, 0);
  assert.deepEqual(res.body.money.by_line, [{ key: 'featured', total: 15000 }]);
  assert.deepEqual(res.body.money.by_method.map((m) => m.key).sort(), ['cash', 'mobile_money']);
  assert.equal(res.body.series.current.length, 1);
  assert.equal(res.body.series.current[0].date, day1);
  assert.equal(res.body.series.current[0].revenue_rwf, 15000);

  const csv = await api().get(`/admin/exports/revenue?from=${day1}&to=${day1}`).set(adminAuth).expect(200);
  assert.match(csv.headers['content-type'], /^text\/csv/);
  assert.match(csv.headers['content-disposition'], new RegExp(`sawa-revenue-${day1}-to-${day1}\\.csv`));
  const lines = csv.text.replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(lines.length, 3, 'a header and the two paid entries');
  assert.ok(lines[1].startsWith(`${day1} 00:30,fee,featured,mobile_money,12000,RWF`));
  assert.ok(lines[1].includes(",'=cmd|calc,"), 'a formula in a reference is neutralised');

  const pdf = await api().get(`/admin/statements/revenue?month=${day1.slice(0, 7)}`).set(adminAuth)
    .buffer(true).parse((r, cb) => { const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => cb(null, Buffer.concat(c))); })
    .expect(200);
  assert.equal(pdf.headers['content-type'], 'application/pdf');
  assert.equal(pdf.body.subarray(0, 5).toString(), '%PDF-');

  const audit = await pool.query(
    `SELECT action, target_id, metadata FROM admin_audit_log
      WHERE actor_id = $1 AND action IN ('report.exported', 'report.statement_downloaded') ORDER BY created_at`, [adminAuth.id]);
  const exported = audit.rows.find((r) => r.action === 'report.exported' && r.metadata.from === day1);
  assert.ok(exported, 'a CSV download is audit-logged');
  assert.equal(exported.metadata.rows, 2);
  assert.equal(exported.target_id, 'revenue');
  const statement = audit.rows.find((r) => r.action === 'report.statement_downloaded' && r.target_id === `revenue-${day1.slice(0, 7)}`);
  assert.ok(statement, 'a statement download is audit-logged');
  assert.ok(statement.metadata.total_rwf >= 15000);
});

// ─── Funnels are cohorts ─────────────────────────────────────────────────────

test('the seller funnel follows its cohort and never exceeds 100%', async () => {
  const from = addDays(BASE, 3);
  const to = addDays(BASE, 4);
  const live = await insertCar({ listedOffset: 6, soldOffset: 9 });
  const sub = (status, offset, reviewedOffset, carId = null) => pool.query(
    `INSERT INTO submissions (seller_id, make, model, year, mileage, asking_price, status, submitted_at, reviewed_at, car_id)
     VALUES ($1, 'Toyota', 'Harrier', 2019, 60000, 20000000, $2, ${kigali(offset)},
             ${reviewedOffset == null ? 'NULL' : kigali(reviewedOffset)}, $3)`, [seller.id, status, carId]);
  await sub('under_review', 3, null);
  await sub('under_review', 4, null);
  await sub('rejected', 3, 3);
  await sub('approved', 4, 4);
  await sub('live', 3, 3, live);
  // Outside the window: must not count.
  await sub('live', 5, 5);
  await sub('under_review', 2, null);

  const res = await api().get(`/admin/insights/funnels?from=${from}&to=${to}`).set(adminAuth).expect(200);
  const counts = Object.fromEntries(res.body.seller.steps.map((s) => [s.key, s.count]));
  assert.deepEqual(counts, { submitted: 5, reviewed: 3, booked: 1, inspected: 1, passed: 1, published: 1, sold: 1 });
  assert.equal(res.body.seller.rejected, 1);
  for (const funnel of [res.body.seller, res.body.imports, res.body.buyers]) {
    funnel.steps.forEach((s, i) => {
      if (s.of_start != null) assert.ok(s.of_start <= 100, `${s.key} ${s.of_start}%`);
      if (i > 0) assert.ok(s.count <= funnel.steps[i - 1].count, `${s.key} grew`);
    });
  }
  const published = res.body.seller.steps.find((s) => s.key === 'published');
  assert.equal(published.of_start, 20);
  assert.equal(published.median_days, 3, 'submitted on day 3, live on day 6');
});

test('the import funnel credits an order for the furthest stage it ever held', async () => {
  const d = addDays(BASE, 12);
  const mk = async (status, history) => {
    const { rows } = await pool.query(
      `INSERT INTO import_orders (order_ref, buyer_id, status, origin_country, make, model, created_at)
       VALUES ($1, $2, $3, 'JP', 'Toyota', 'Prado', ${kigali(12)}) RETURNING id`,
      [`IMP-T${Date.now()}${Math.floor(Math.random() * 1e6)}`, buyer.id, status]);
    for (const to of history) {
      await pool.query(`INSERT INTO import_order_events (import_order_id, event_type, to_status, summary)
                        VALUES ($1, 'status', $2, 'test')`, [rows[0].id, to]);
    }
  };
  await mk('enquiry', []);
  await mk('quoted', ['quoted']);
  // Cancelled after shipping: still counts as quoted, agreed, paid and shipped.
  await mk('cancelled', ['quoted', 'deposit_due', 'ordered', 'in_transit']);
  const res = await api().get(`/admin/insights/funnels?from=${d}&to=${d}`).set(adminAuth).expect(200);
  assert.deepEqual(res.body.imports.steps.map((s) => s.count), [3, 2, 1, 1, 1, 0]);
});

// ─── Contacts, centers, inventory, quality ───────────────────────────────────

test('contact requests are counted by channel and the export never names the buyer', async () => {
  const car = await insertCar({ listedOffset: 20 });
  const d = addDays(BASE, 21);
  await pool.query(
    `INSERT INTO listing_contact_events (car_id, buyer_id, seller_id, channel, created_at)
     VALUES ($1, $2, $3, 'whatsapp', ${kigali(21)}), ($1, $2, $3, 'whatsapp', ${kigali(21, '18:00')}), ($1, $2, $3, 'phone', ${kigali(21)})`,
    [car, buyer.id, seller.id]);
  const res = await api().get(`/admin/insights?from=${d}&to=${d}`).set(adminAuth).expect(200);
  assert.equal(res.body.kpis.current.contacts, 3);
  assert.deepEqual(res.body.contacts_by_channel, [
    { channel: 'whatsapp', current: 2, previous: 0 }, { channel: 'phone', current: 1, previous: 0 }, { channel: 'in_app', current: 0, previous: 0 },
  ]);
  const csv = await api().get(`/admin/exports/contacts?from=${d}&to=${d}`).set(adminAuth).expect(200);
  assert.equal(csv.text.trim().split('\r\n').length, 4);
  assert.ok(!csv.text.includes(buyer.id), 'no buyer id');
  assert.ok(!csv.text.includes(buyer.email) && !csv.text.includes('788123987'), 'no buyer contact details');
});

test('the users export carries no names, emails or phone numbers', async () => {
  const d = addDays(BASE, 25);
  await pool.query(`UPDATE users SET created_at = ${kigali(25)} WHERE id = $1`, [buyer.id]);
  const csv = await api().get(`/admin/exports/users?from=${d}&to=${d}`).set(adminAuth).expect(200);
  const lines = csv.text.replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[1].startsWith(buyer.id));
  for (const secret of [buyer.email, 'Insights Buyer', '788123987']) assert.ok(!csv.text.includes(secret), secret);
});

test('a center counts an inspection with two fees once, and sums both fees', async () => {
  const center = `Test Center ${Date.now()}`;
  const d = addDays(BASE, 30);
  const { rows } = await pool.query(
    `INSERT INTO inspections (kind, center, status, scheduled_on, completed_at, score, passed, checklist_version,
                              customer_user_id, vehicle_make, vehicle_model, vehicle_year)
     VALUES ('standalone', $1, 'complete', $2::date, ${kigali(30)}, 130, TRUE, 'sawa-150-v1', $3, 'Toyota', 'Prado', 2015),
            ('standalone', $1, 'complete', $2::date, ${kigali(30)}, 98, FALSE, 'sawa-150-v1', $3, 'Toyota', 'Prado', 2014)
     RETURNING id`, [center, d, buyer.id]);
  await pool.query(
    `INSERT INTO platform_fees (fee_type, amount, status, currency, inspection_id, payer_user_id, method, collected_at)
     VALUES ('inspection', 35000, 'paid', 'RWF', $1, $2, 'cash', ${kigali(30)}),
            ('report', 10000, 'paid', 'RWF', $1, $2, 'cash', ${kigali(30)})`, [rows[0].id, buyer.id]);

  const res = await api().get(`/admin/insights/centers?from=${d}&to=${d}`).set(adminAuth).expect(200);
  const row = res.body.centers.find((c) => c.center === center);
  assert.ok(row, 'an unregistered center still appears');
  assert.equal(row.completed, 2);
  assert.equal(row.pass_rate, 50);
  assert.equal(row.revenue_rwf, 45000);
  assert.equal(row.capacity, null, 'no registry row, so no capacity is invented');

  const q = await api().get(`/admin/insights/quality?from=${d}&to=${d}`).set(adminAuth).expect(200);
  assert.equal(q.body.completed, 2);
  assert.equal(q.body.pass_rate, 50);
  assert.deepEqual(q.body.distribution.map((b) => b.count), [1, 0, 1, 0]);
});

test('inventory reports live stock by price band and names stale listings', async () => {
  const res = await api().get('/admin/insights/inventory?days=30').set(adminAuth).expect(200);
  assert.equal(res.body.by_price.length, 4);
  assert.equal(typeof res.body.live_total, 'number');
  assert.ok(res.body.by_price.reduce((n, b) => n + b.count, 0) <= res.body.live_total);
  // insertCar() listed decades ago with no recent interest: it must be stale.
  const car = await insertCar({ status: 'live', listedOffset: 0 });
  const again = await api().get('/admin/insights/inventory?days=30').set(adminAuth).expect(200);
  assert.equal(again.body.live_total, res.body.live_total + 1);
  assert.ok(again.body.stale.length > 0);
  await pool.query('DELETE FROM cars WHERE id = $1', [car]);
});

test('the business report renders as a PDF for any window', async () => {
  const res = await api().get(`/admin/statements/business?from=${BASE}&to=${addDays(BASE, 31)}`).set(adminAuth)
    .buffer(true).parse((r, cb) => { const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => cb(null, Buffer.concat(c))); })
    .expect(200);
  assert.equal(res.body.subarray(0, 5).toString(), '%PDF-');
  assert.match(res.headers['content-disposition'], /sawa-business-report-/);
});

test('the dataset catalogue lists every export the console offers', async () => {
  const res = await api().get('/admin/exports').set(adminAuth).expect(200);
  assert.deepEqual(res.body.datasets.map((d) => d.key),
    ['submissions', 'inspections', 'listings', 'revenue', 'contacts', 'users', 'imports', 'rental_inquiries']);
  for (const d of res.body.datasets) {
    assert.ok(!d.columns.some((c) => /e-?mail|phone|password|national/i.test(c)), `${d.key} exposes PII`);
  }
});
