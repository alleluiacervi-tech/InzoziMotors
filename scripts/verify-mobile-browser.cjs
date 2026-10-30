// Shared-screen regressions. Run with the local API and Expo web already up.
// Requires web/npm ci for Playwright and a local Chromium installation.
const assert = require('node:assert/strict');
const { chromium } = require('../web/node_modules/playwright');
const { expect } = require('../web/node_modules/@playwright/test');
const API = process.env.MOBILE_TEST_API || 'http://localhost:3000';
const APP = process.env.MOBILE_TEST_URL || 'http://127.0.0.1:8081';
for (const url of [API, APP]) assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Use disposable local services only');
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
(async () => {
  const inventory = await (await fetch(`${API}/cars?limit=100`)).json();
  assert.ok(inventory.length >= 2, 'Provide at least two local test listings');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const errors = [];
  async function context(saved = []) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await ctx.addInitScript((ids) => {
      localStorage.setItem('@sawa/onboardingSeen', 'true');
      localStorage.setItem('@sawa/themeMode', 'light');
      localStorage.setItem('@sawa/savedCarIds', JSON.stringify(ids));
    }, saved);
    return ctx;
  }
  async function page(ctx, path) {
    const p = await ctx.newPage(); p.on('pageerror', (error) => errors.push(error.message));
    await p.goto(`${APP}${path}`, { timeout: 90000 }); return p;
  }
  try {
    // Reproduces the audit's lost-shortlist case: the saved item is not in
    // the initial browse response. The detail API still knows the vehicle.
    let ctx = await context([inventory[1].id]);
    await ctx.route(`${API}/cars`, (route) => json(route, [inventory[0]]));
    let p = await page(ctx, '/saved');
    await expect(p.getByText(inventory[1].title, { exact: true })).toBeVisible({ timeout: 30000 });
    await expect.poll(() => p.evaluate((id) => Boolean(JSON.parse(localStorage.getItem('@sawa/savedCarRecords') || '{}')[id]), inventory[1].id)).toBe(true);
    await p.reload();
    await expect(p.getByText(inventory[1].title, { exact: true })).toBeVisible();
    const afterRecovery = await (await fetch(`${API}/cars?limit=100`)).json();
    assert.equal(afterRecovery.find((car) => car.id === inventory[1].id).views, inventory[1].views);
    console.log('PASS saved vehicle outside the browse page survives reload without inflating detail views');
    await ctx.close();

    ctx = await context(['00000000-0000-4000-8000-999999999999']);
    p = await page(ctx, '/saved');
    await expect(p.getByText('Saved vehicle', { exact: true })).toBeVisible();
    await expect(p.getByText('No saved cars yet', { exact: true })).toHaveCount(0);
    console.log('PASS an unresolved saved record is retained instead of disappearing');
    await ctx.close();

    ctx = await context();
    const rows = Array.from({ length: 21 }, (_, index) => ({ ...inventory[0], id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, title: `Audit vehicle ${index + 1}` }));
    const offsets = [];
    await ctx.route(`${API}/cars?**`, (route) => {
      const url = new URL(route.request().url());
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || 20);
      const query = url.searchParams.get('q');
      offsets.push(offset);
      return json(route, (query ? rows.filter((car) => car.title.toLowerCase().includes(query.toLowerCase())) : rows).slice(offset, offset + limit));
    });
    p = await page(ctx, '/search');
    await expect(p.getByText('20+ cars in Rwanda', { exact: true })).toBeVisible({ timeout: 30000 });
    const more = p.getByRole('button', { name: 'Load more cars', exact: true });
    if (await more.count()) await more.click();
    await expect.poll(() => offsets.includes(20)).toBe(true);
    await expect(p.getByText('21 cars in Rwanda', { exact: true })).toBeVisible();
    await p.getByPlaceholder('Search make, model, type…').fill('Audit vehicle 21');
    await expect(p.getByText('Audit vehicle 21', { exact: true })).toBeVisible();
    await expect(p.getByText(/^1 car in Rwanda(?: ·|$)/)).toBeVisible();
    console.log('PASS Cars tab pages beyond 20 and queries the full server catalogue');
    await ctx.close();

    ctx = await context();
    await ctx.route(`${API}/cars?**`, (route) => json(route, { error: 'Temporarily unavailable' }, 503));
    p = await page(ctx, '/search');
    await expect(p.getByText('We could not refresh these results. Previously loaded cars may still be shown.', { exact: true })).toBeVisible();
    await expect(p.getByText('No cars found', { exact: true })).toHaveCount(0);
    console.log('PASS failed search is described separately from empty inventory');
    await ctx.close();

    // Verify the existing seller gate actually resumes its task after sign-in.
    const email = `mobile-quality-${Date.now()}@test.local`;
    const password = 'local-test-password-123';
    let userId;
    try {
      const registered = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Mobile Quality Fixture', email, password, phone: '+250788000101' }) });
      assert.equal(registered.status, 201); userId = (await registered.json()).user.id;
      ctx = await context();
      let release; const gate = new Promise((resolve) => { release = resolve; });
      let logins = 0;
      await ctx.route(`${API}/auth/login`, async (route) => { logins += 1; await gate; await route.continue(); });
      p = await page(ctx, '/');
      await p.getByRole('button', { name: 'Menu', exact: true }).click();
      await p.getByText('Submit my car', { exact: true }).click();
      await p.getByText('Sign In', { exact: true }).click();
      await p.getByLabel('Email', { exact: true }).fill(email);
      await p.getByLabel('Password', { exact: true }).fill(password);
      const signIn = p.getByRole('button', { name: 'Sign in', exact: true });
      await signIn.click();
      await expect(signIn).toBeDisabled();
      assert.equal(logins, 1);
      release();
      await expect(p.getByText('Submit your car', { exact: true })).toBeVisible({ timeout: 30000 });
      console.log('PASS sign-in is busy during the request and resumes seller submission');
      const model = p.getByPlaceholder('e.g. RAV4, Civic, Hilux...');
      await model.fill('Audit model');
      await p.getByRole('button', { name: 'Go back', exact: true }).click();
      await expect(p.getByText('Discard your changes?', { exact: true })).toBeVisible();
      await p.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(model).toHaveValue('Audit model');
      await p.getByRole('button', { name: 'Go back', exact: true }).click();
      await p.getByRole('button', { name: 'Discard changes', exact: true }).click();
      await expect(p.getByText('Recently listed', { exact: true })).toBeVisible();
      console.log('PASS seller form retains edits on cancel and leaves only after confirmed discard');
      await ctx.close();
    } finally {
      if (userId) {
        require('../backend/node_modules/dotenv').config({ path: require('node:path').join(__dirname, '../backend/.env') });
        const { Client } = require('../backend/node_modules/pg');
        const db = new Client({ host: process.env.DB_HOST || 'localhost', database: process.env.DB_NAME || 'sawa', user: process.env.DB_USER || 'sawa', password: process.env.DB_PASSWORD });
        await db.connect(); try { await db.query('DELETE FROM users WHERE id=$1', [userId]); } finally { await db.end(); }
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS no browser JavaScript errors in the checked journeys');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
