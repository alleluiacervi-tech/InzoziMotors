import { test, expect, type Page } from '@playwright/test'

// Phase 2 of docs/WEB-PARITY-PLAN.md end to end: a brand-new seller who never
// installs the app verifies their identity, submits a car with a reference
// photo, and books its inspection — then the backend is asked directly whether
// all of it actually landed, rather than trusting what the page says.

const API_URL = process.env.API_URL || 'http://localhost:3000'

// A valid 1x1 JPEG. The backend checks the bytes, not just the extension.
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
)
const photo = (name: string) => ({ name, mimeType: 'image/jpeg', buffer: JPEG })

async function signIn(page: Page, email: string, password: string, next: string) {
  await page.goto(`/signin?next=${encodeURIComponent(next)}`)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(`**${next}`)
}

test('a new seller verifies, submits a car with a photo and books an inspection — all on the website', async ({ page }) => {
  const email = `e2e-seller-${Date.now()}@e2e.local`
  const password = 'password123'
  const registered = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'E2E New Seller', email, password, role: 'seller' }),
  })
  expect(registered.ok).toBeTruthy()
  const { token } = (await registered.json()) as { token: string }

  // 1. Identity: three photos, then the pending state.
  await signIn(page, email, password, '/dashboard/verify')
  const inputs = page.locator('input[type="file"]')
  await expect(inputs).toHaveCount(3)
  await inputs.nth(0).setInputFiles(photo('front.jpg'))
  await inputs.nth(1).setInputFiles(photo('back.jpg'))
  await inputs.nth(2).setInputFiles(photo('selfie.jpg'))
  await page.getByRole('button', { name: 'Submit for verification' }).click()
  // The upload, the backend's metadata pass and the page refresh all sit in
  // this one step. Wait for whichever outcome arrives, and if it's the form's
  // error, fail with its text rather than a bare "heading not found". Scoped
  // to <main>: Next's route announcer is also role="alert", and reads out the
  // page title.
  const underReview = page.getByRole('heading', { name: 'Under review' })
  const formError = page.locator('main').getByRole('alert')
  await expect(underReview.or(formError)).toBeVisible({ timeout: 20_000 })
  if (!(await underReview.isVisible())) {
    throw new Error(`ID upload failed: ${await formError.first().textContent()}`)
  }

  // 2. The car, in the app's two steps.
  await page.goto('/sell/submit')
  await page.getByLabel(/^Make/).selectOption('Toyota')
  await page.getByLabel(/^Model/).fill('Corolla')
  await page.getByLabel(/^Year/).selectOption(String(new Date().getFullYear() - 5))
  await page.getByLabel(/^Mileage/).fill('72000')
  await page.getByText('Petrol', { exact: true }).click()
  await page.getByText('Automatic', { exact: true }).click()
  await page.getByRole('button', { name: /Continue/ }).click()

  await page.getByLabel(/asking price/i).fill('14500000')
  await page.locator('input[type="file"]').first().setInputFiles(photo('front.jpg'))
  await page.getByLabel(/Anything we should know/).fill('Second owner, full service history.')
  await page.getByRole('button', { name: 'Submit & book inspection' }).click()
  await page.waitForURL(/\/dashboard\/selling\/[0-9a-f-]{36}\/schedule/)
  await expect(page.getByText('Submission received')).toBeVisible()

  // 3. The inspection slot.
  await page.locator('label:has(input[name="center"])').first().click()
  await page.locator('label:has(input[name="date"])').first().click()
  await page.getByText('10:00 AM', { exact: true }).click()
  await page.getByRole('button', { name: 'Confirm booking' }).click()
  await page.waitForURL(/\/dashboard\/selling\?booked=/)
  // "Inspection booked" is also the scheduled submission's status pill, so
  // check the confirmation's own sentence instead.
  await expect(page.getByText('We have sent you the details.', { exact: false })).toBeVisible()

  // 4. What the backend actually holds.
  const me = await (await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })).json()
  expect(me.id_verified).toBe('pending')

  const mine = (await (
    await fetch(`${API_URL}/submissions`, { headers: { Authorization: `Bearer ${token}` } })
  ).json()) as { status: string; reference_images: string[] | null; notes: string | null; inspection_time: string | null }[]
  expect(mine).toHaveLength(1)
  expect(mine[0].status).toBe('scheduled')
  expect(mine[0].inspection_time).toBe('10:00 AM')
  expect(mine[0].reference_images ?? []).toHaveLength(1)
  expect(mine[0].notes).toBe('Second owner, full service history.')
})
