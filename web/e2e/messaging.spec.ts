import { test, expect, type Page } from '@playwright/test'

// The full loop G1 in docs/WEB-PARITY-PLAN.md exists to close: a buyer starts
// a thread from a car page, a seller reads and replies from the inbox, and
// the buyer sees that reply live — no reload, so this only passes if the
// socket ticket (D2), the join_conversation room and the new_message fan-out
// all actually work end to end, not just that each route responds in
// isolation.
async function signIn(page: Page, email: string, password: string, next: string) {
  await page.goto(`/signin?next=${encodeURIComponent(next)}`)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(`**${next}`)
}

test('buyer messages seller from the car page, seller replies, buyer sees it live', async ({ browser }) => {
  const carId = process.env.E2E_CAR_ID
  const sellerEmail = process.env.E2E_SELLER_EMAIL
  const sellerPassword = process.env.E2E_SELLER_PASSWORD
  const buyerEmail = process.env.E2E_BUYER_EMAIL
  const buyerPassword = process.env.E2E_BUYER_PASSWORD
  if (!carId || !sellerEmail || !sellerPassword || !buyerEmail || !buyerPassword) {
    throw new Error('global-setup did not seed the messaging fixtures')
  }

  const buyerContext = await browser.newContext()
  const sellerContext = await browser.newContext()
  const buyerPage = await buyerContext.newPage()
  const sellerPage = await sellerContext.newPage()

  const firstMessage = `Is this still available? ${Date.now()}`
  const reply = `Yes, it's still here — ${Date.now()}`

  await signIn(buyerPage, buyerEmail, buyerPassword, `/cars/${carId}`)
  await buyerPage.locator('textarea[name="message"]').fill(firstMessage)
  await buyerPage.locator('input[name="acknowledge"]').check()
  await buyerPage.getByRole('button', { name: 'Contact seller' }).click()

  // Links are followed by their href rather than clicked. A click that lands
  // while the page is still hydrating after a redirect can be dropped, which
  // made this test flaky; what's under test is that the link exists and
  // points at the thread, not the click itself.
  const openConversation = buyerPage.getByRole('link', { name: 'Open conversation' })
  await expect(openConversation).toBeVisible()
  const buyerThread = await openConversation.getAttribute('href')
  expect(buyerThread).toMatch(/^\/dashboard\/messages\/.+/)
  await buyerPage.goto(buyerThread!)
  // Inside the conversation itself (role=log). From lg up the inbox list sits
  // beside it and shows the same text as its preview.
  await expect(buyerPage.getByRole('log').getByText(firstMessage)).toBeVisible()

  await signIn(sellerPage, sellerEmail, sellerPassword, '/dashboard/messages')
  const inboxRow = sellerPage.getByRole('link').filter({ hasText: firstMessage })
  await expect(inboxRow).toBeVisible()
  const sellerThread = await inboxRow.getAttribute('href')
  expect(sellerThread).toBe(buyerThread)
  await sellerPage.goto(sellerThread!)
  await expect(sellerPage.getByRole('log').getByText(firstMessage)).toBeVisible()

  await sellerPage.locator('textarea').fill(reply)
  await sellerPage.locator('textarea').press('Enter')
  await expect(sellerPage.getByRole('log').getByText(reply)).toBeVisible()

  // The buyer never reloads or re-navigates from here — this only passes if
  // the reply arrived over the socket.
  await expect(buyerPage.getByRole('log').getByText(reply)).toBeVisible({ timeout: 10_000 })

  await buyerContext.close()
  await sellerContext.close()
})
