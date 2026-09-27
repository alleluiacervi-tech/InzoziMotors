import type { FullConfig } from '@playwright/test'
import { Client } from 'pg'

// ─────────────────────────────────────────────────────────────────────────────
// Seeds exactly one live, inspected car through the real REST flow — register
// seller, register+promote an admin, create the car, submit it, schedule and
// run the inspection, publish it — the same sequence backend/test/messaging.test.js
// uses as its `liveCar` fixture. A fresh CI database otherwise has nothing for
// the homepage to render, so the smoke test would have no car to click through.
//
// Two direct SQL writes are unavoidable: promoting a user to admin and
// approving a seller's ID are both staff-only actions with no self-serve API,
// by design (CLAUDE.md invariant 4). This is throwaway CI Postgres — the same
// shortcut backend/test/*.test.js already takes.
//
// The seeded car's id is exported on process.env so the spec (running in a
// worker process Playwright forks AFTER this completes) can target it exactly,
// rather than guessing at markup or relying on there being exactly one card.
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL || 'http://localhost:3000'

function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.local`
}

async function call(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${path} -> ${res.status}: ${JSON.stringify(body)}`)
  }
  return body
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function register(overrides: Record<string, unknown> = {}) {
  const body = { name: 'E2E User', email: unique('e2e'), password: 'password123', role: 'buyer', ...overrides }
  const res = await call('/auth/register', { method: 'POST', body: JSON.stringify(body) })
  return { ...body, token: res.token as string, id: res.user.id as string }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'sawa',
    user: process.env.DB_USER || 'sawa',
    password: process.env.DB_PASSWORD,
  })
  await client.connect()

  try {
    const seller = await register({ role: 'seller', name: 'E2E Seller' })
    // A distinctive, VISIBLE phone number: public pages must never show it,
    // and a leak would be caught because it's actually there to leak.
    await client.query(
      "UPDATE users SET id_verified='approved', phone='+250 780 000 999', phone_visible=TRUE, contact_consent_at=NOW() WHERE id=$1",
      [seller.id]
    )
    const buyer = await register({ name: 'E2E Buyer' })

    const adminUser = await register({ name: 'E2E Admin' })
    await client.query("UPDATE users SET role='admin' WHERE id=$1", [adminUser.id])
    const adminLogin = await call('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminUser.email, password: adminUser.password }),
    })
    const adminAuth = bearer(adminLogin.token as string)

    // The server owns the checklist definition (backend/src/lib/inspection-policy.js)
    // — fetched, not duplicated, so a change to the 150 items never silently
    // breaks this seed.
    const checklist = await call('/inspections/checklist', { headers: adminAuth })
    const itemIds: string[] = checklist.categories.flatMap(
      (category: { items: { id: string }[] }) => category.items.map((i) => i.id)
    )
    const canonicalChecklist = Object.fromEntries(itemIds.map((id) => [id, 'pass']))

    // Days are spread so no two fixtures compete for the same centre capacity.
    let dayOffset = 45
    async function publishCar(owner: { id: string; token: string }, make: string, model: string, year: number, price: number) {
      const title = `${year} ${make} ${model}`
      const car = await call('/cars', {
        method: 'POST',
        headers: adminAuth,
        body: JSON.stringify({
          seller_id: owner.id, title, make, model, year,
          mileage: 30000, price,
          images: ['https://images.unsplash.com/photo-1494905998402-395d579af36f'],
        }),
      })
      const submission = await call('/submissions', {
        method: 'POST',
        headers: bearer(owner.token),
        body: JSON.stringify({ make, model, year, mileage: 30000, asking_price: price }),
      })
      const scheduledDate = new Date(Date.now() + dayOffset++ * 86_400_000).toISOString().slice(0, 10)
      await call(`/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: adminAuth,
        body: JSON.stringify({ status: 'scheduled', center: 'Nyarutarama Center', scheduled_date: scheduledDate, scheduled_time: '10:00 AM' }),
      })
      const { rows } = await client.query('SELECT id FROM inspections WHERE submission_id=$1', [submission.id])
      const inspectionId = rows[0].id as string
      await client.query('UPDATE inspections SET car_id=$1 WHERE id=$2', [car.id, inspectionId])
      await call(`/inspections/${inspectionId}/start`, { method: 'POST', headers: adminAuth })
      await call(`/inspections/${inspectionId}/complete`, {
        method: 'POST', headers: adminAuth, body: JSON.stringify({ checklist_results: canonicalChecklist }),
      })
      await call(`/cars/${car.id}/status`, { method: 'PATCH', headers: adminAuth, body: JSON.stringify({ status: 'approved' }) })
      await call(`/cars/${car.id}/status`, { method: 'PATCH', headers: adminAuth, body: JSON.stringify({ status: 'live' }) })
      return { id: car.id as string, title }
    }

    const car = await publishCar(seller, 'Toyota', 'RAV4', 2021, 18000000)
    const title = car.title
    // A second car from the same seller, so /compare has two to put side by
    // side and the seller's profile lists more than one.
    const second = await publishCar(seller, 'Honda', 'CR-V', 2019, 21000000)

    // Its own seller and car for the mark-sold journey: selling the shared car
    // would pull it out from under the other specs running in parallel.
    const soloSeller = await register({ role: 'seller', name: 'E2E Solo Seller' })
    await client.query("UPDATE users SET id_verified='approved' WHERE id=$1", [soloSeller.id])
    const soloCar = await publishCar(soloSeller, 'Nissan', 'X-Trail', 2018, 15000000)

    process.env.E2E_CAR_ID = car.id
    process.env.E2E_CAR_TITLE = title
    // Messaging spec (G1 in docs/WEB-PARITY-PLAN.md) signs in as each of these
    // in a real browser, so it needs real credentials, not just a token.
    process.env.E2E_SELLER_EMAIL = seller.email
    process.env.E2E_SELLER_PASSWORD = seller.password
    process.env.E2E_BUYER_EMAIL = buyer.email
    process.env.E2E_BUYER_PASSWORD = buyer.password
    process.env.E2E_SELLER_ID = seller.id
    process.env.E2E_SECOND_CAR_ID = second.id
    process.env.E2E_SECOND_CAR_TITLE = second.title
    process.env.E2E_SOLO_SELLER_ID = soloSeller.id
    process.env.E2E_SOLO_SELLER_EMAIL = soloSeller.email
    process.env.E2E_SOLO_SELLER_PASSWORD = soloSeller.password
    process.env.E2E_SOLO_CAR_ID = soloCar.id
    process.env.E2E_SOLO_CAR_TITLE = soloCar.title
  } finally {
    await client.end()
  }
}
