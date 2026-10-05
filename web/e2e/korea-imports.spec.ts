import { test, expect } from '@playwright/test'
import { Client } from 'pg'

// The Korean catalogue end to end (docs/ENCAR-IMPORT-PLAN.md, Phase 3): a buyer
// searches, opens a car, sees the Korean price labelled as Korean, requests it,
// and lands on their order showing the frozen record of what they asked for.
//
// The mirror is seeded straight into Postgres (the sync worker needs the paid
// provider and is covered by its own tests) and the public switch is flipped for
// the length of the test, then put back.

const API_URL = process.env.API_URL || 'http://localhost:3000'
const ID = `e2e-kr-${Date.now()}`

function db() {
  return new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'sawa',
    user: process.env.DB_USER || 'sawa',
    password: process.env.DB_PASSWORD,
  })
}

// One worker, one seeded car: with parallel workers each would seed its own copy and
// the search would find the other worker's car first.
test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  const client = db()
  await client.connect()
  try {
    await client.query(
      `INSERT INTO encar_listings (id, make, model, badge, fuel, transmission, year, month, mileage_km, price_man, photo_count, photos)
       VALUES ($1, 'Kia', 'E2E Sorento', '2.2 Diesel', 'diesel', 'automatic', 2021, 3, 41000, 2500, 2,
               ARRAY['https://example.invalid/1.jpg', 'https://example.invalid/2.jpg'])`,
      [ID]
    )
    await client.query(
      `UPDATE platform_settings SET value = jsonb_set(value, '{catalog_public}', 'true') WHERE key = 'encar_flags'`
    )
  } finally {
    await client.end()
  }
})

test.afterAll(async () => {
  const client = db()
  await client.connect()
  try {
    await client.query(`UPDATE platform_settings SET value = jsonb_set(value, '{catalog_public}', 'false') WHERE key = 'encar_flags'`)
    await client.query('DELETE FROM import_orders WHERE encar_listing_id = $1', [ID])
    await client.query('DELETE FROM encar_listings WHERE id = $1', [ID])
  } finally {
    await client.end()
  }
})

test('search → open a Korean car → request it → the order keeps what was asked for', async ({ page }) => {
  // The search finds the car and shows its price as the KOREAN price.
  await page.goto('/imports/korea?q=E2E+Sorento')
  const card = page.getByRole('link', { name: /E2E Sorento/ }).first()
  await expect(card).toBeVisible()
  await expect(page.getByText('₩25,000,000').first()).toBeVisible()
  await card.click()

  // The detail page: every photo, the Korean price, no claim that Sawa sells it.
  await page.waitForURL(`**/imports/korea/${ID}`)
  await expect(page.getByRole('heading', { name: /2021 Kia E2E Sorento/ })).toBeVisible()
  await expect(page.getByText(/not the cost in Kigali/i)).toBeVisible()
  await expect(page.getByText(/Sawa Cars is not the seller/i)).toBeVisible()
  // <main> only: the site footer legitimately links to the guarantee page.
  await expect(page.locator('main').getByText(/escrow|guarantee/i)).toHaveCount(0)

  // Signed out, the request button asks for a sign-in rather than failing.
  await expect(page.getByRole('link', { name: 'Sign in to request' })).toBeVisible()

  // Sign in as a fresh buyer and request it.
  const email = `e2e-korea-${Date.now()}@e2e.local`
  const registered = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E Korea Buyer', email, password: 'password123', role: 'buyer', phone: '+250788000102' }),
  })
  expect(registered.ok).toBeTruthy()
  await page.goto(`/signin?next=${encodeURIComponent(`/imports/korea/${ID}`)}`)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(`**/imports/korea/${ID}`)

  await page.getByRole('button', { name: 'Request this car' }).click()
  await page.waitForURL('**/dashboard/imports/**')
  await expect(page.getByRole('heading', { name: 'The car you requested' })).toBeVisible()
  await expect(page.getByText('₩25,000,000').first()).toBeVisible()
})

test('a car that has sold is a calm "no longer available", not an error', async ({ page }) => {
  await page.goto('/imports/korea/does-not-exist')
  await expect(page.getByRole('heading', { name: 'This car is no longer available' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'All cars in Korea' })).toBeVisible()
})
