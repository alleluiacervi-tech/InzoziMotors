import { test, expect } from '@playwright/test'

// The one Phase-0 smoke test (W5): home renders real data from a real
// backend, a car card leads to a real detail page, and sign-in is reachable —
// the same three hops a first-time visitor makes before ever seeing "use the
// app instead." Everything downstream (Playwright per phase, per
// docs/WEB-PARITY-TODO.md) builds on this actually working.
test('home -> car detail -> sign-in', async ({ page }) => {
  const carId = process.env.E2E_CAR_ID
  const carTitle = process.env.E2E_CAR_TITLE
  if (!carId || !carTitle) throw new Error('global-setup did not seed a car')

  await page.goto('/')
  const carLink = page.locator(`a[href="/cars/${carId}"]`).first()
  await expect(carLink).toBeVisible()

  await carLink.click()
  await expect(page).toHaveURL(`/cars/${carId}`)
  await expect(page.getByRole('heading', { level: 1, name: carTitle })).toBeVisible()

  await page.locator('a[href="/signin"]').first().click()
  await expect(page).toHaveURL(/\/signin/)
  await expect(page.locator('input[name="email"]')).toBeVisible()
  await expect(page.locator('input[name="password"]')).toBeVisible()
})

// ?next= is where the browser goes after a real sign-in, so it must stay on
// this site. A backslash reads as a slash to the browser: `/\evil.com` is
// `//evil.com`. Each of these used to reach redirect() unchanged.
test('sign-in never carries ?next= off the site', async ({ page }) => {
  for (const next of ['/\\evil.example/x', '/\\/evil.example', '//evil.example', 'https://evil.example']) {
    await page.goto(`/signin?next=${encodeURIComponent(next)}`)
    await expect(page.locator('input[name="next"]').first()).toHaveValue('/dashboard')
  }
  await page.goto(`/signin?next=${encodeURIComponent('/cars?make=Toyota')}`)
  await expect(page.locator('input[name="next"]').first()).toHaveValue('/cars?make=Toyota')
})
