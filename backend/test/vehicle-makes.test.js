// ─────────────────────────────────────────────────────────────────────────────
// Brands.
//
// The list was twenty names frozen inside a mobile screen, with no Chinese
// marque on it while the catalogue already held Dongfeng, BYD and Denza — so a
// seller with a BYD had to pick the nearest wrong answer, and one did. These
// tests protect the three things that stop it happening again: the seed really
// covers what Rwanda drives, aliases collapse spellings onto one brand, and a
// listing whose own words disagree with its make gets said out loud.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const {
  slugify, resolveMake, makesMentionedIn, loadMakes, invalidateMakes,
} = require('../src/lib/vehicle-makes');
const { contentWarnings } = require('../src/lib/publication-readiness');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function admin() {
  const email = unique('brands');
  const reg = await api().post('/auth/register')
    .send({ name: 'Brand Admin', email, password: 'password123', role: 'buyer' }).expect(201);
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [reg.body.user.id]);
  const login = await api().post('/auth/login').send({ email, password: 'password123' }).expect(200);
  return login.body.token;
}

test.after(async () => {
  await pool.query("DELETE FROM vehicle_makes WHERE slug LIKE 'zz-test-%'");
  await pool.end();
});

test('the seed covers what Rwanda actually drives, Chinese brands included', async () => {
  const { rows } = await pool.query('SELECT slug FROM vehicle_makes');
  const slugs = new Set(rows.map((r) => r.slug));
  assert.ok(rows.length >= 50, `expected at least 50 brands, got ${rows.length}`);

  // The everyday fleet.
  for (const slug of ['toyota', 'nissan', 'mitsubishi', 'suzuki', 'isuzu', 'hyundai', 'kia']) {
    assert.ok(slugs.has(slug), `${slug} must be on the list`);
  }
  // The gap that caused the bug. The old twenty-item array had none of these,
  // and the catalogue already held three of them.
  for (const slug of ['byd', 'denza', 'dongfeng', 'chery', 'geely', 'haval']) {
    assert.ok(slugs.has(slug), `${slug} is sold here and must be on the list`);
  }
});

test('the ordering puts the everyday fleet before the rare stuff', async () => {
  const { rows } = await pool.query(
    "SELECT slug, display_order FROM vehicle_makes WHERE slug IN ('toyota','bentley')"
  );
  const order = Object.fromEntries(rows.map((r) => [r.slug, r.display_order]));
  // Alphabetically Bentley beats Toyota, which is exactly the outcome
  // display_order exists to prevent.
  assert.ok(order.toyota < order.bentley, 'Toyota must lead Bentley');
});

test('aliases collapse the spellings people actually type', async () => {
  const makes = await loadMakes({ force: true });
  for (const [typed, expected] of [
    ['Mercedes', 'Mercedes-Benz'],
    ['benz', 'Mercedes-Benz'],
    ['MERCEDES BENZ', 'Mercedes-Benz'],
    ['VW', 'Volkswagen'],
    ['Range Rover', 'Land Rover'],
    ['Citroen', 'Citroën'],
    ['Skoda', 'Škoda'],
    ['howo', 'Sinotruk'],
  ]) {
    assert.equal(resolveMake(makes, typed)?.name, expected, `"${typed}" should resolve to ${expected}`);
  }
});

test('an unknown brand resolves to nothing rather than to the nearest guess', async () => {
  const makes = await loadMakes();
  assert.equal(resolveMake(makes, 'Definitely Not A Car Brand'), null);
  // The specific danger: silently rewriting a seller's Foton to Ford.
  assert.equal(resolveMake(makes, 'Foton')?.name, 'Foton');
});

test('a name whose text is another brand is not shadowed by that brand', async () => {
  const makes = await loadMakes();
  // "ram" is a Dodge alias; nothing may make it beat a real brand named Ram.
  assert.equal(resolveMake(makes, 'Dodge')?.name, 'Dodge');
  assert.equal(resolveMake(makes, 'Toyota Hino')?.slug, 'hino');
  assert.equal(resolveMake(makes, 'Hino')?.slug, 'hino');
});

test('slugify survives accents and punctuation', () => {
  assert.equal(slugify('Mercedes-Benz'), 'mercedes-benz');
  assert.equal(slugify('Škoda'), 'skoda');
  assert.equal(slugify('Citroën'), 'citroen');
  assert.equal(slugify('  Alfa  Romeo  '), 'alfa-romeo');
  assert.equal(slugify('!!!'), '');
});

test('brand detection in prose does not fire on ordinary words', async () => {
  const makes = await loadMakes();
  // The real listing that started this.
  assert.deepEqual(
    makesMentionedIn(makes, 'The 2023 BYD Qin Plus is a plug-in hybrid sedan.').map((m) => m.name),
    ['BYD']
  );
  // "MG" inside "amgs", "Mini" inside "minimum", "Man" inside "many".
  assert.deepEqual(makesMentionedIn(makes, 'amgs, minimums and many things'), []);
});

test('a listing whose words disagree with its make says so', async () => {
  const makes = await loadMakes();
  const warnings = contentWarnings({
    title: 'Hyundai Qin Plus 2023',
    make: 'Hyundai',
    description: 'The 2023 BYD Qin Plus is a plug-in hybrid with a long electric range and low running costs.',
    vin: 'LC0C74DE5P0123456',
  }, makes);
  const mismatch = warnings.find((w) => /BYD/.test(w));
  assert.ok(mismatch, `expected a brand-mismatch warning, got: ${JSON.stringify(warnings)}`);
  assert.match(mismatch, /Recorded as Hyundai/);
});

test('a listing that agrees with itself gets no brand warning at all', async () => {
  const makes = await loadMakes();
  const warnings = contentWarnings({
    title: 'Toyota RAV4 2019',
    make: 'Toyota',
    description: 'A well-kept RAV4 with full service history, two owners from new and a fresh set of tyres.',
    vin: 'JTMBFREV40J123456',
  }, makes);
  assert.deepEqual(warnings, [], `a clean listing must warn about nothing: ${JSON.stringify(warnings)}`);
});

test('naming a rival brand is a warning to read, never a gate', async () => {
  const makes = await loadMakes();
  const car = {
    title: 'Toyota RAV4 2019',
    make: 'Toyota',
    description: 'A well-kept RAV4 with full service history and a quieter ride than the equivalent Nissan.',
    vin: 'JTMBFREV40J123456',
  };
  assert.ok(contentWarnings(car, makes).some((w) => /Nissan/.test(w)));

  // The property that matters is structural, not textual: these come back as
  // `warnings` on the readiness verdict, which is a separate field from the
  // reasons that refuse a publication. Passing no brand list at all — which is
  // what happens if loadMakes fails — must therefore lose the warning and
  // change nothing else.
  assert.ok(!contentWarnings(car, []).some((w) => /Nissan/.test(w)));
});

test('GET /makes is public, cached, and carries only what a client renders', async () => {
  const res = await api().get('/makes').expect(200);
  assert.ok(Array.isArray(res.body) && res.body.length >= 50);
  assert.match(res.headers['cache-control'], /max-age=\d+/);
  // Not the raw row: no id, no aliases, no `active`. The car route once
  // published every future column by selecting *; this list does not repeat it.
  assert.deepEqual(Object.keys(res.body[0]).sort(), ['logo_url', 'name', 'slug']);
});

test('an admin adds a brand, sets a logo, and switches it off without touching listings', async () => {
  const token = await admin();

  const created = await api().post('/admin/makes')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'ZZ Test Motors', aliases: ['ZZTM', 'zz motors'], display_order: 900 })
    .expect(201);
  assert.equal(created.body.slug, 'zz-test-motors');
  assert.deepEqual(created.body.aliases, ['zztm', 'zz motors'], 'aliases are lower-cased on write');

  // The list is served from a cache; an operator must see their own edit.
  const listed = await api().get('/makes').expect(200);
  assert.ok(listed.body.some((m) => m.slug === 'zz-test-motors'), 'the cache must have been dropped');

  await api().patch(`/admin/makes/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ logo_url: 'https://cdn.example.com/zz.png' }).expect(200);

  const off = await api().patch(`/admin/makes/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ active: false }).expect(200);
  assert.equal(off.body.active, false);
  // Switched off means "stop offering it", never "rewrite what exists".
  const publicList = await api().get('/makes').expect(200);
  assert.ok(!publicList.body.some((m) => m.slug === 'zz-test-motors'));

  invalidateMakes();
});

test('the same brand cannot be added twice, in any letter case', async () => {
  const token = await admin();
  await api().post('/admin/makes').set('Authorization', `Bearer ${token}`)
    .send({ name: 'ZZ Test Duplicate' }).expect(201);
  const again = await api().post('/admin/makes').set('Authorization', `Bearer ${token}`)
    .send({ name: 'zz test duplicate' }).expect(409);
  assert.equal(again.body.code, 'MAKE_EXISTS');
});

test('bad input is refused, and the whole thing is admin-only', async () => {
  const token = await admin();
  await api().post('/admin/makes').set('Authorization', `Bearer ${token}`)
    .send({ name: '   ' }).expect(400);
  await api().post('/admin/makes').set('Authorization', `Bearer ${token}`)
    .send({ name: 'ZZ Test Order', display_order: 99999 }).expect(400);

  const made = await api().post('/admin/makes').set('Authorization', `Bearer ${token}`)
    .send({ name: 'ZZ Test Guard' }).expect(201);
  await api().patch(`/admin/makes/${made.body.id}`).set('Authorization', `Bearer ${token}`)
    .send({ logo_url: 'javascript:alert(1)' }).expect(400);

  const email = unique('nobody');
  await api().post('/auth/register')
    .send({ name: 'Buyer', email, password: 'password123', role: 'buyer' }).expect(201);
  const login = await api().post('/auth/login').send({ email, password: 'password123' }).expect(200);
  await api().get('/admin/makes').set('Authorization', `Bearer ${login.body.token}`).expect(403);
  await api().post('/admin/makes').set('Authorization', `Bearer ${login.body.token}`)
    .send({ name: 'ZZ Test Sneaky' }).expect(403);
});
