import type { DutyRates } from '@/lib/business'
import type {
  AppNotification, Car, CarQuery, Conversation, EligibleRentalInspection, FeaturedPlacement, SoldCar,
  InspectionCenter, InspectionReport,
  Message, RentalCar, RentalInquiry, ReportEntitlement, SavedSearch, SellerProfile, SellerReviews, Showroom, Submission, TrustScore, User,
  Valuation, VehicleHistory, VehicleMake,
} from './types'
import { withCleanTitle } from './vehicle-names'

// ─────────────────────────────────────────────────────────────────────────────
// One HTTP client for the whole site, speaking the same REST contract as the
// Expo app (src/api/client.js) and the admin dashboard (admin/src/lib/api.ts).
//
// The web has one wrinkle neither of those has: the same code runs on the server
// (Server Components, route handlers) and in the browser. The token therefore
// comes from two different places, so callers pass it explicitly rather than the
// client reaching for ambient state that only exists on one side.
//
//   Server Component  ->  api.cars.list()               (public, cached)
//   Server Component  ->  api.me(await getToken())      (per-request, no cache)
//   Client Component  ->  fetch('/api/...') route handler, which holds the cookie
//
// The browser NEVER sees the JWT: it lives in an httpOnly cookie and is attached
// server-side. That is the single biggest security difference from the mobile
// app, where SecureStore is the appropriate store.
// ─────────────────────────────────────────────────────────────────────────────

/** Server-side base URL — the VPS, reachable directly from the Next server. */
export const API_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export class ApiError extends Error {
  status: number
  code?: string
  /** The error response's JSON body, for fields beyond `error` and `code`
   *  (e.g. `reopen_until` on a closed account). */
  data?: Record<string, unknown>
  constructor(message: string, status: number, code?: string, data?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
  /** True when the backend could not be reached at all (vs. answered with 4xx). */
  get isNetworkError() {
    return this.status === 0
  }
}

type RequestOptions = {
  token?: string | null
  /** Next.js caching. Public catalogue data is revalidated; anything
   *  user-specific must pass `cache: 'no-store'`, which is the default here. */
  revalidate?: number | false
  tags?: string[]
  cache?: RequestCache
  signal?: AbortSignal
  /** Milliseconds before the request is abandoned. A hung API must not hang a page. */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT = 10_000

async function request<T>(
  path: string,
  init: RequestInit & RequestOptions = {}
): Promise<T> {
  const { token, revalidate, tags, timeoutMs = DEFAULT_TIMEOUT, ...rest } = init

  const headers = new Headers(rest.headers)
  headers.set('Accept', 'application/json')
  if (rest.body && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // A slow VPS must not hold a Server Component render open indefinitely.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const next =
    revalidate === undefined && !tags
      ? undefined
      : { revalidate: revalidate === false ? undefined : revalidate, tags }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers,
      signal: rest.signal ?? controller.signal,
      // Authenticated reads must never be cached across users.
      cache: rest.cache ?? (token ? 'no-store' : rest.cache),
      ...(next ? { next } : {}),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new ApiError(
        (data as { error?: string }).error || `Request failed (${res.status})`,
        res.status,
        (data as { code?: string }).code,
        data as Record<string, unknown>
      )
    }
    return data as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    const message =
      (err as Error)?.name === 'AbortError'
        ? 'The request timed out.'
        : 'Could not reach Sawa Cars. Please try again.'
    throw new ApiError(message, 0)
  } finally {
    clearTimeout(timer)
  }
}

function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value))
    }
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

// ─── Public catalogue ────────────────────────────────────────────────────────
// Unauthenticated and server-renderable, which is what makes the marketplace
// indexable. Revalidated rather than cached forever so a sold car leaves the
// site quickly without us rebuilding.

const CATALOGUE_REVALIDATE = 60

/** The platform USD⇄RWF rate, served by our own API (backend/src/lib/fx.js).
 *  Never throws: a page must not fail because a display hint is unavailable —
 *  the fallback mirrors the backend's floor and is flagged stale. */
export const fx = {
  get: async (): Promise<{ rate: number; source: string; fetched_at: string | null; stale: boolean }> => {
    try {
      return await request('/fx', { revalidate: 3600, cache: undefined, timeoutMs: 4000 })
    } catch {
      return { rate: 1470, source: 'client-fallback', fetched_at: null, stale: true }
    }
  },
}

export type RateCard = {
  inspection_fee_rwf: number
  report_resale_fee_rwf: number
  rental_subscription_monthly_rwf: number
  reviewed_on?: string
}

export const rateCard = {
  /**
   * What Sawa charges for a walk-in inspection, a resold report and a rental
   * listing subscription. Cached for ten minutes, matching the backend's own
   * cache header — a correction should reach the public page the same day.
   *
   * Returns null rather than throwing, so the pricing page can say "prices
   * are being updated" instead of failing to render.
   */
  get: async (): Promise<RateCard | null> => {
    try {
      return await request<RateCard>('/settings/rate-card', { revalidate: 600, cache: undefined, timeoutMs: 4000 })
    } catch {
      return null
    }
  },
}

export const duty = {
  /**
   * The import duty schedule the calculator runs on. Cached for an hour by
   * Next; the rates change perhaps twice a year and a correction reaches the
   * site within that.
   *
   * Returns null rather than throwing, so lib/business falls back to the last
   * schedule a person reviewed — a calculator that renders nothing is worse
   * than one that renders dated figures and dates them.
   */
  rates: async (): Promise<DutyRates | null> => {
    try {
      return await request<DutyRates>('/settings/duty-rates', { revalidate: 3600, cache: undefined, timeoutMs: 4000 })
    } catch {
      return null
    }
  },
}

export const cars = {
  list: (query: CarQuery = {}) =>
    request<Car[]>(`/cars${qs(query as Record<string, unknown>)}`, {
      revalidate: CATALOGUE_REVALIDATE,
      tags: ['cars'],
    }).then((rows) => rows.map(withCleanTitle)),

  /** The cars an operator placed at the top of the marketplace, in slot order.
   *  The app has rendered these since the banner work; the website was still
   *  showing "newest six live listings" and calling it featured, so a placement
   *  an operator made — including one somebody paid for — appeared in exactly
   *  one of the two places it was sold to appear. */
  featured: (limit = 6) =>
    request<FeaturedPlacement[]>(`/cars/featured?limit=${limit}`, {
      revalidate: CATALOGUE_REVALIDATE,
      tags: ['cars', 'featured'],
    }).then((rows) => rows.map(withCleanTitle)),

  /** Cars sold in the last 90 days whose listing is still public, newest sale first. */
  recentlySold: (limit = 6) =>
    request<SoldCar[]>(`/cars/recently-sold?limit=${limit}`, {
      revalidate: CATALOGUE_REVALIDATE,
      tags: ['cars'],
    }).then((rows) => rows.map(withCleanTitle)),

  get: (id: string) =>
    request<Car>(`/cars/${id}`, { revalidate: CATALOGUE_REVALIDATE, tags: ['cars', `car:${id}`] }).then(withCleanTitle),

  history: (id: string) =>
    request<VehicleHistory>(`/cars/${id}/history`, { revalidate: CATALOGUE_REVALIDATE }),

  inspectionReport: (id: string) =>
    request<InspectionReport>(`/inspections/report/${id}`, { revalidate: CATALOGUE_REVALIDATE }),

  contact: (token: string, id: string, channel: 'phone' | 'whatsapp' | 'in_app', acknowledge = false) =>
    request<{ channel: string; contact: string | null; seller_id: string; notice: string; available: { phone: boolean; whatsapp: boolean; in_app: boolean } }>(`/cars/${id}/contact`, {
      token, method: 'POST', body: JSON.stringify({ channel, acknowledge }), cache: 'no-store',
    }),

  /** Public valuation tool — no account needed, same endpoint the app calls. */
  valuation: (params: { make: string; year: number; mileage?: number }) =>
    request<Valuation>(`/cars/valuation/estimate${qs(params)}`, { cache: 'no-store' }),
}

export const rentals = {
  list: () =>
    request<RentalCar[]>('/rentals', { revalidate: CATALOGUE_REVALIDATE, tags: ['rentals'] })
      .then((rows) => rows.map(withCleanTitle)),
  get: (id: string) =>
    request<RentalCar>(`/rentals/${id}`, { revalidate: CATALOGUE_REVALIDATE }).then(withCleanTitle),
  inspectionReport: (id: string) =>
    request<InspectionReport>(`/inspections/report/rental/${id}`, { revalidate: CATALOGUE_REVALIDATE }),
  inquire: (token: string, id: string, body: { start_date?: string; days?: number; pickup_location?: string; message?: string; preferred_channel: 'in_app' | 'phone' | 'whatsapp'; acknowledge: boolean }) =>
    request<RentalInquiry & { contact?: string | null; notice: string }>(`/rentals/${id}/inquire`, {
      token, method: 'POST', body: JSON.stringify(body), cache: 'no-store',
    }),
  myInquiries: (token: string) => request<RentalInquiry[]>('/rentals/inquiries/my', { token, cache: 'no-store' }),
  updateInquiry: (token: string, id: string, status: 'cancelled') =>
    request<RentalInquiry>(`/rentals/inquiries/${id}/status`, { token, method: 'PATCH', body: JSON.stringify({ status }) }),

  // ── Provider self-serve ──────────────────────────────────────────────────
  // A verified rental provider managing their own fleet and inbox. Publication
  // stays admin-only — propose() can only ever land 'pending_review'.
  mine: (token: string) => request<RentalCar[]>('/rentals/mine', { token, cache: 'no-store' }),
  eligibleInspections: (token: string) =>
    request<EligibleRentalInspection[]>('/rentals/mine/eligible-inspections', { token, cache: 'no-store' }),
  propose: (token: string, body: Record<string, unknown>) =>
    request<RentalCar & { message: string }>('/rentals/propose', {
      token, method: 'POST', body: JSON.stringify(body), cache: 'no-store',
    }),
  updateMine: (token: string, id: string, body: Record<string, unknown>) =>
    request<RentalCar>(`/rentals/${id}/mine`, {
      token, method: 'PATCH', body: JSON.stringify(body), cache: 'no-store',
    }),
  /** The provider's incoming inquiries (or every inquiry, for an admin). */
  providerInquiries: (token: string, status?: RentalInquiry['status']) =>
    request<RentalInquiry[]>(`/rentals/inquiries${status ? `?status=${status}` : ''}`, { token, cache: 'no-store' }),
  updateInquiryStatus: (token: string, id: string, status: 'contacted' | 'closed' | 'cancelled') =>
    request<RentalInquiry>(`/rentals/inquiries/${id}/status`, { token, method: 'PATCH', body: JSON.stringify({ status }) }),
}

/** The brand list the app's submission form offers (GET /makes). Public,
 *  cached for ten minutes server-side too. */
export const vehicleMakes = {
  list: () => request<VehicleMake[]>('/makes', { revalidate: 600, tags: ['makes'] }),
}

/** Verified showrooms with public stock (GET /showrooms). */
export const showrooms = {
  list: () => request<Showroom[]>('/showrooms', { revalidate: CATALOGUE_REVALIDATE, tags: ['showrooms'] }),
}

export const inspectionCenters = {
  active: () => request<InspectionCenter[]>('/centers/active', {
    revalidate: 60,
    tags: ['inspection-centers'],
  }),
}

export const sellers = {
  /** Public profile (GET /sellers/:id). 404 for anyone whose listings
   *  wouldn't be public either — callers treat that as notFound(). */
  profile: (userId: string) =>
    request<SellerProfile>(`/sellers/${userId}`, { revalidate: 300, tags: [`seller:${userId}`] }),
  reviews: (userId: string) =>
    request<SellerReviews>(`/reviews/seller/${userId}`, { revalidate: 300, tags: [`seller:${userId}`] }),
  trustScore: (userId: string) =>
    request<TrustScore>(`/reviews/trust-score/${userId}`, { revalidate: 300, tags: [`seller:${userId}`] }),
  /** One seller's live listings — the catalogue query, narrowed. */
  listings: (userId: string) =>
    request<Car[]>(`/cars?seller_id=${encodeURIComponent(userId)}&limit=100`, {
      revalidate: CATALOGUE_REVALIDATE,
      tags: ['cars', `seller:${userId}`],
    }),
}

export const reviews = {
  /** Always 201, whether or not this person already reported it. */
  report: (token: string, reviewId: string, reason: string) =>
    request<{ success: true }>(`/reviews/${reviewId}/report`, {
      token, method: 'POST', body: JSON.stringify({ reason }),
    }),
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    }),

  register: (name: string, email: string, password: string, role: 'buyer' | 'seller' = 'buyer', phone?: string) =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, phone }),
      cache: 'no-store',
    }),

  /** Always resolves 200 — the backend never reveals whether an email exists. */
  forgotPassword: (email: string) =>
    request<{ success: true; dev_code?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      cache: 'no-store',
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ success: true }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, new_password: newPassword }),
      cache: 'no-store',
    }),

  acceptShowroomInvite: (token: string, password: string) =>
    request<{ user: User; token: string }>('/auth/accept-showroom-invite', {
      method: 'POST', body: JSON.stringify({ token, password }), cache: 'no-store',
    }),

  /** Reopen a closed account within its 30 days, with the same credentials.
   *  401 for anything it won't confirm; 410 ACCOUNT_PURGED once erased. */
  reopen: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/reopen', {
      method: 'POST', body: JSON.stringify({ email, password }), cache: 'no-store',
    }),

  /** Activate any admin-created account from its one-use invite link. */
  acceptInvite: (token: string, password: string) =>
    request<{ user: User; token: string }>('/auth/accept-invite', {
      method: 'POST', body: JSON.stringify({ token, password }), cache: 'no-store',
    }),

  /** Sign in or up with a provider's ID token (backend/src/routes/oauth.js).
   *  The same route the apps use; the token is verified there, never here. */
  oauth: (provider: 'google' | 'apple', body: {
    id_token: string
    nonce?: string
    full_name?: string | null
    authorization_code?: string | null
    role?: 'buyer' | 'seller'
    reopen?: boolean
  }) =>
    request<{ user: User; token: string; is_new: boolean; needs_profile: boolean }>(`/auth/oauth/${provider}`, {
      method: 'POST', body: JSON.stringify(body), cache: 'no-store',
    }),
}

// ─── Authenticated ───────────────────────────────────────────────────────────
// Every function here takes the token explicitly. That is deliberate: it makes
// it impossible to accidentally render a cached page containing another user's
// data, because an authenticated call is always visibly per-request.

export const account = {
  me: (token: string) => request<User>('/auth/me', { token }),

  updateProfile: (token: string, fields: { name?: string; phone?: string; whatsapp_phone?: string; phone_visible?: boolean; whatsapp_visible?: boolean; avatar_url?: string; message_email_notifications?: boolean }) =>
    request<User>('/auth/me', { token, method: 'PATCH', body: JSON.stringify(fields) }),

  /** Returns a replacement token: the backend ends every other session on a
   *  password change, so the caller's cookie must be re-issued or they log
   *  themselves out by securing their own account. */
  changePassword: (token: string, current_password: string, new_password: string) =>
    request<{ success: true; token: string }>('/auth/change-password', {
      token,
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  /** Permanent. The API re-authenticates before anonymising the account. */
  /** Closes the account immediately. Nothing is erased for thirty days, and
   *  the response says the date it will be — see lib/account-closure.js on the
   *  server for why an operator cannot approve or block this. */
  closeAccount: (token: string, password: string, reason: string, note?: string) =>
    request<{ success: true; reopen_until: string; recovery_days: number; listings_taken_down: number }>('/auth/me', {
      token,
      method: 'DELETE',
      body: JSON.stringify({ password, reason, note }),
    }),

  /** The fixed vocabulary the server's CHECK constraint accepts. Fetched, not
   *  duplicated, so the radio buttons and the storable values cannot drift. */
  closureReasons: () =>
    request<{ reasons: { value: string; label: string }[]; recovery_days: number }>(
      '/auth/closure-reasons',
      { revalidate: 3600 }
    ),

  /** Phone (and buyer/seller) for an account made with Google or Apple, which
   *  cannot supply either. Once only; returns a fresh token carrying the role. */
  completeProfile: (token: string, phone: string, role: 'buyer' | 'seller') =>
    request<{ user: User; token: string }>('/auth/oauth/complete-profile', {
      token, method: 'POST', body: JSON.stringify({ phone, role }),
    }),

  /** A 60-second, single-purpose credential for the realtime socket (D2 in
   *  docs/WEB-PARITY-PLAN.md) — never the session JWT itself. Minted fresh for
   *  every connect and reconnect via useSocket(). */
  socketTicket: (token: string) =>
    request<{ ticket: string }>('/auth/socket-ticket', { token, method: 'POST' }),
}

/** A model in the public import catalogue (GET /imports/catalog). */
export interface ImportCatalogModel {
  id: string
  make: string
  model: string
  body_type: string | null
  fuel_types: string[] | null
  condition: string | null
  trim: string | null
  engine_cc: number | null
  transmission: string | null
  drive_side: string | null
  origin_country: string
  origin_port: string | null
  typical_fob_usd: number | null
  estimated_transit_days: number | null
  /** An official photo of the model, uploaded with its source recorded. */
  images: string[] | null
  /** A licensed studio image — only ever sent once a person confirmed it. */
  render_url: string | null
}

export interface ImportCatalogMake {
  make: string
  origin_country: string
  model_count: number
}

/** The public import catalogue: what can be sourced, by make and origin. */
export const importCatalog = {
  makes: () =>
    request<{ items: ImportCatalogMake[] }>('/imports/catalog/makes', { revalidate: 3600, tags: ['import-catalog'] }),
  list: (query: { make?: string; origin?: string; limit?: number } = {}) =>
    request<{ items: ImportCatalogModel[] }>(`/imports/catalog${qs(query as Record<string, unknown>)}`, {
      // Ten minutes, not an hour: an image approved in the admin should reach
      // the site the same morning.
      revalidate: 600,
      tags: ['import-catalog'],
    }),
}

/** A used car for sale in South Korea (GET /imports/korea). */
export interface KoreaCar {
  id: string
  make: string
  model: string
  badge: string | null
  year: number
  month: number | null
  mileage_km: number | null
  fuel: string | null
  transmission: string | null
  color: string | null
  price_krw: number
  /** Display only, rounded; null when no exchange rate is available. */
  price_usd: number | null
  photo_count: number
  cover: string | null
  first_seen_at: string
}

export interface KoreaList {
  available: boolean
  items: KoreaCar[]
  next_cursor: string | null
}

/** What landed in Kigali is estimated to cost. Null until the exporter's costs are entered. */
export interface KoreaEstimate {
  currency: 'RWF'
  to_port_rwf: number
  duty_rwf: { low: number; high: number }
  total_rwf: { low: number; high: number }
  breakdown_usd: { car: number; export_fee: number; inland_transport: number; freight: number; insurance: number }
  depreciation_pct: number
  excise_pct: { min: number; max: number }
  engine_cc: number | null
  costs_reviewed_on: string | null
  duty_reviewed_on: string | null
  note: string
}

export interface KoreaCarDetail extends KoreaCar {
  available: boolean
  power_ps: number | null
  seats: number | null
  category: string | null
  photos: string[]
  estimate: KoreaEstimate | null
  source_note: string
}

export type KoreaReportPart<T> =
  | { status: 'ok'; data: T; fetched_at: string; stale: boolean }
  | { status: 'none' | 'unavailable' }

export interface KoreaRecord {
  accident_count?: number
  own_damage_count?: number
  own_damage_cost_krw?: number
  other_damage_count?: number
  other_damage_cost_krw?: number
  owner_change_count?: number
  owner_changes?: string[]
  plate_change_count?: number
  total_loss_count?: number
  total_loss_date?: string
  flood_total_loss_count?: number
  flood_partial_loss_count?: number
  flood_date?: string
  theft_count?: number
  theft_date?: string
  usage?: string
  commercial?: boolean
  first_registered?: string
  accidents?: { date: string; type?: string; part_cost?: number; labor_cost?: number; painting_cost?: number; insurance_benefit?: number }[]
}

export interface KoreaInspection {
  accident?: boolean
  simple_repair?: boolean
  inspected_on?: string
  detail?: Record<string, unknown>
  exterior?: unknown
  structure?: unknown
  notes?: unknown
  __truncated?: boolean
}

export interface KoreaReports {
  available: boolean
  inspection: KoreaReportPart<KoreaInspection>
  record: KoreaReportPart<KoreaRecord>
  engine_cc: number | null
  price_history: { price_man: number; observed_at: string }[]
  source_note: string
}

export interface KoreaFacets {
  available: boolean
  total?: number
  makes?: { make: string; count: number }[]
  make?: string
  models?: { model: string; count: number }[]
  fuels?: { fuel: string; count: number }[]
  ranges?: { min_year: number; max_year: number }
}

/** Used cars for sale in South Korea, from our own mirror of the Encar listings. */
export const koreaCatalog = {
  list: (query: Record<string, unknown> = {}) =>
    request<KoreaList>(`/imports/korea${qs(query)}`, { revalidate: 300, tags: ['korea-catalog'] }),
  facets: (make?: string) =>
    request<KoreaFacets>(`/imports/korea/facets${qs({ make })}`, { revalidate: 600, tags: ['korea-catalog'] }),
  get: (id: string) =>
    request<KoreaCarDetail>(`/imports/korea/${encodeURIComponent(id)}`, { revalidate: 300, tags: ['korea-catalog'] }),
  reports: (id: string) =>
    // Three provider calls on a cold cache, paced a few seconds apart: the default 10 s
    // would give up on a report the server is about to finish and cache.
    request<KoreaReports>(`/imports/korea/${encodeURIComponent(id)}/reports`, { revalidate: 300, tags: ['korea-catalog'], timeoutMs: 30_000 }),
}

export const importOrders = {
  mine: (token: string) => request<any[]>('/imports/mine', { token }),
  get: (token: string, id: string) => request<any>(`/imports/${id}`, { token }),
  create: (token: string, data: { origin_country?: string; make?: string; model?: string; year?: number; supplier_reference?: string; customer_notes?: string; encar_listing_id?: string }) =>
    request<any>('/imports', { token, method: 'POST', body: JSON.stringify(data) }),
  acceptAgreement: (token: string, id: string) => request<any>(`/imports/${id}/accept-agreement`, { token, method: 'POST' }),
  submitPaymentProof: (token: string, orderId: string, paymentId: string, data: FormData) =>
    request<any>(`/imports/${orderId}/payments/${paymentId}/proof`, { token, method: 'POST', body: data }),
}

export const saved = {
  cars: (token: string) => request<Car[]>('/cars/saved/list', { token }),
  toggle: (token: string, carId: string) =>
    request<{ saved: boolean }>(`/cars/save/${carId}`, { token, method: 'POST' }),

  searches: (token: string) => request<SavedSearch[]>('/saved-searches', { token }),
  createSearch: (token: string, label: string, filters: SavedSearch['filters']) =>
    request<SavedSearch>('/saved-searches', {
      token, method: 'POST', body: JSON.stringify({ label, filters }),
    }),
  updateSearch: (token: string, id: string, notify_enabled: boolean) =>
    request<SavedSearch>(`/saved-searches/${id}`, {
      token, method: 'PATCH', body: JSON.stringify({ notify_enabled }),
    }),
  deleteSearch: (token: string, id: string) =>
    request<{ success: true }>(`/saved-searches/${id}`, { token, method: 'DELETE' }),
}

/**
 * Where one of my cars has reached, and who is holding it up.
 *
 * A projection of the same computation the Sawa team sees — not a second one —
 * reduced on the server to what a seller may read. `waiting_on: 'you'` is the
 * only value that asks the seller to do something.
 */
export type SellerProgress = {
  submission_id: string | null
  car_id: string | null
  stages_done: number
  stages_total: number
  complete: boolean
  blocked: boolean
  waiting_on: 'sawa' | 'you' | 'schedule' | 'nobody'
  stage: { key: string; label: string } | null
  message: string | null
}

export const submissions = {
  mine: (token: string) => request<Submission[]>('/submissions', { token }),

  /** Keyed by submission id. Answers {} rather than throwing — the selling page
   *  must render without it. */
  progress: (token: string) => request<Record<string, SellerProgress>>('/submissions/progress', { token }),

  /** Gated server-side by role='seller' + an active account, not ID approval —
   *  a seller may submit before their identity check clears (the backend only
   *  refuses to *publish* an unverified seller's listing). */
  create: (token: string, body: Record<string, unknown>) =>
    request<Submission>('/submissions', { token, method: 'POST', body: JSON.stringify(body) }),

  /** `center` is the centre's name or id; `date` is ISO (2026-10-02); `time`
   *  looks like "10:00 AM" — the backend's readSlot() rejects anything else. */
  schedule: (token: string, id: string, body: { center: string; date: string; time: string }) =>
    request<Submission>(`/submissions/${id}/schedule`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({ center: body.center, scheduled_date: body.date, scheduled_time: body.time }),
    }),
}

export const inspections = {
  /** Every report this account may read — commissioned, resold, or granted.
   *  Each row's `file_url` is the path the account's own /api/documents/[id]
   *  route handler proxies (the backend only accepts a Bearer header, which a
   *  plain <a href> download link cannot send). */
  myReports: (token: string) => request<ReportEntitlement[]>('/inspections/my-reports', { token }),
}

export const notifications = {
  list: (token: string) => request<AppNotification[]>('/notifications', { token }),
  markRead: (token: string, id: string) =>
    request<AppNotification>(`/notifications/${id}/read`, { token, method: 'PATCH' }),
  markAllRead: (token: string) =>
    request<{ success: true }>('/notifications/read-all', { token, method: 'PATCH' }),
}

export const messages = {
  conversations: (token: string, limit?: number) =>
    request<Conversation[]>(`/messages/conversations${limit ? `?limit=${limit}` : ''}`, { token }),
  thread: (token: string, id: string) =>
    request<Message[]>(`/messages/conversations/${id}`, { token }),
  start: (token: string, car_id: string, message: string) =>
    request<{ conversation: Conversation; message: Message }>('/messages/conversations', {
      token, method: 'POST', body: JSON.stringify({ car_id, message }),
    }),
  send: (token: string, id: string, text: string) =>
    request<Message>(`/messages/conversations/${id}`, {
      token, method: 'POST', body: JSON.stringify({ text }),
    }),

  /** Ends messaging in both directions and drops the thread from the list —
   *  same effect as the app's block (G3 in docs/WEB-PARITY-PLAN.md). */
  block: (token: string, userId: string) =>
    request<{ success: true }>(`/messages/users/${userId}/block`, { token, method: 'POST' }),
  unblock: (token: string, userId: string) =>
    request<{ success: true }>(`/messages/users/${userId}/block`, { token, method: 'DELETE' }),

  /** `messageId` is optional — omit to report the whole conversation. */
  report: (token: string, conversationId: string, reason: string, messageId?: string) =>
    request<{ success: true }>(`/messages/conversations/${conversationId}/report`, {
      token, method: 'POST', body: JSON.stringify({ reason, message_id: messageId }),
    }),
}

export const sellerListings = {
  mine: (token: string) => request<Car[]>('/cars/seller/mine', { token }),
  /** live ↔ paused, and either → sold (final). Restoring to live re-runs the
   *  publication checks and may answer 409 LISTING_NOT_READY. */
  setStatus: (token: string, id: string, status: 'live' | 'paused' | 'sold') =>
    request<Car>(`/cars/${id}/seller-status`, { token, method: 'PATCH', body: JSON.stringify({ status }) }),
  updatePrice: (token: string, id: string, price: number) =>
    request<Car>(`/cars/${id}/price`, { token, method: 'PATCH', body: JSON.stringify({ price }) }),
}

export const disputes = {
  raise: (token: string, handoverId: string, reason: string) =>
    request<any>('/disputes', {
      token, method: 'POST', body: JSON.stringify({ handover_id: handoverId, reason }),
    }),
}

export const referrals = {
  redeem: (token: string, code: string) =>
    request<{ success: true }>('/referrals/redeem', {
      token, method: 'POST', body: JSON.stringify({ code }),
    }),
}

export const handovers = {
  cancel: (token: string, id: string) =>
    request<{ success: true }>(`/handovers/${id}/cancel`, { token, method: 'POST' }),
}

export const api = {
  cars, rentals, sellers, showrooms, auth, account, saved,
  submissions, notifications, messages, sellerListings,
  disputes, referrals, handovers,
}

export default api

