import { test, expect, type Page } from '@playwright/test'

// Phase 3 of docs/WEB-PARITY-PLAN.md: public seller profiles, comparing cars,
// a seller marking a car sold, and reopening a closed account.

const API_URL = process.env.API_URL || 'http://localhost:3000'

async function signIn(page: Page, email: string, password: string, next: string) {
  await page.goto(`/signin?next=${encodeURIComponent(next)}`)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('a seller profile lists their live cars and never shows contact details', async ({ page }) => {
  const sellerId = process.env.E2E_SELLER_ID!
  await page.goto(`/sellers/${sellerId}`)
  await expect(page.getByText('Identity verified')).toBeVisible()
  await expect(page.locator(`a[href="/cars/${process.env.E2E_CAR_ID}"]`).first()).toBeVisible()
  await expect(page.locator(`a[href="/cars/${process.env.E2E_SECOND_CAR_ID}"]`).first()).toBeVisible()
  // The seeded seller's own visible number. (Sawa's company line in the
  // footer is +250 too, so the country code alone proves nothing.)
  expect(await page.content()).not.toMatch(/780\s?000\s?999/)
})

test('compare puts two cars side by side', async ({ page }) => {
  await page.goto(`/compare?ids=${process.env.E2E_CAR_ID},${process.env.E2E_SECOND_CAR_ID}`)
  await expect(page.getByRole('link', { name: process.env.E2E_CAR_TITLE! })).toBeVisible()
  await expect(page.getByRole('link', { name: process.env.E2E_SECOND_CAR_TITLE! })).toBeVisible()
  await expect(page.getByRole('rowheader', { name: 'Inspection score' })).toBeVisible()
})

test('a seller marks a car sold and it leaves the marketplace', async ({ page }) => {
  const carId = process.env.E2E_SOLO_CAR_ID!
  await signIn(page, process.env.E2E_SOLO_SELLER_EMAIL!, process.env.E2E_SOLO_SELLER_PASSWORD!, '/dashboard/selling')
  await page.waitForURL('**/dashboard/selling')
  // Let the sign-in redirect finish before acting. The sign-in action renders
  // this page, and Next's RedirectBoundary then pushes the same URL again from
  // an effect, using the sidebar's prefetch of it. That prefetch was taken
  // before the sale, so when the test clicked within half a second of
  // arriving, the push could land after the sale and put the old page back:
  // the server said sold, the screen said Available. A person can't click
  // twice that fast.
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Mark as sold' }).click()
  await page.getByRole('button', { name: 'Mark as sold' }).click()
  await expect(page.getByRole('heading', { name: 'Closed listings' })).toBeVisible()

  const listed = await (await fetch(`${API_URL}/cars?seller_id=${process.env.E2E_SOLO_SELLER_ID}`)).json()
  expect(listed.some((c: { id: string }) => c.id === carId)).toBe(false)
})

test('a closed account is offered a reopen at sign-in', async ({ page }) => {
  const email = `e2e-closed-${Date.now()}@e2e.local`
  const password = 'password123'
  const reg = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E Closer', email, password, role: 'buyer' }),
  })
  const { token } = (await reg.json()) as { token: string }
  const closed = await fetch(`${API_URL}/auth/me`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password, reason: 'other' }),
  })
  expect(closed.ok).toBeTruthy()

  await signIn(page, email, password, '/dashboard')
  await expect(page.getByRole('heading', { name: 'This account is closed' })).toBeVisible()
  await page.locator('#reopen-password').fill(password)
  await page.getByRole('button', { name: 'Reopen my account' }).click()
  await page.waitForURL('**/dashboard')
})
