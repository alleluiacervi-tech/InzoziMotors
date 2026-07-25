import type {
  AppNotification, Car, CarQuery, Conversation, Dispute, Handover, InspectionReport,
  Message, Referral, RentalCar, Review, SavedSearch, Submission, TrustScore, User,
  Valuation, VehicleHistory,
} from './types'

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
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
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
        (data as { code?: string }).code
      )
    }
    return data as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    const message =
      (err as Error)?.name === 'AbortError'
        ? 'The request timed out.'
        : 'Could not reach Inzozi Motors. Please try again.'
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

export const cars = {
  list: (query: CarQuery = {}) =>
    request<Car[]>(`/cars${qs(query as Record<string, unknown>)}`, {
      revalidate: CATALOGUE_REVALIDATE,
      tags: ['cars'],
    }),

  get: (id: string) =>
    request<Car>(`/cars/${id}`, { revalidate: CATALOGUE_REVALIDATE, tags: ['cars', `car:${id}`] }),

  history: (id: string) =>
    request<VehicleHistory>(`/cars/${id}/history`, { revalidate: CATALOGUE_REVALIDATE }),

  inspectionReport: (id: string) =>
    request<InspectionReport>(`/inspections/report/${id}`, { revalidate: CATALOGUE_REVALIDATE }),

  /** Public valuation tool — no account needed, same endpoint the app calls. */
  valuation: (params: { make: string; year: number; mileage?: number }) =>
    request<Valuation>(`/cars/valuation/estimate${qs(params)}`, { cache: 'no-store' }),
}

export const rentals = {
  list: () => request<RentalCar[]>('/rentals', { revalidate: CATALOGUE_REVALIDATE, tags: ['rentals'] }),
  get: (id: string) => request<RentalCar>(`/rentals/${id}`, { revalidate: CATALOGUE_REVALIDATE }),
}

export const sellers = {
  reviews: (userId: string) =>
    request<Review[]>(`/reviews/seller/${userId}`, { revalidate: 300 }),
  trustScore: (userId: string) =>
    request<TrustScore>(`/reviews/trust-score/${userId}`, { revalidate: 300 }),
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    }),

  register: (name: string, email: string, password: string, role: 'buyer' | 'seller' = 'buyer') =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
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
}

// ─── Authenticated ───────────────────────────────────────────────────────────
// Every function here takes the token explicitly. That is deliberate: it makes
// it impossible to accidentally render a cached page containing another user's
// data, because an authenticated call is always visibly per-request.

export const account = {
  me: (token: string) => request<User>('/auth/me', { token }),

  updateProfile: (token: string, fields: { name?: string; phone?: string; avatar_url?: string }) =>
    request<User>('/auth/me', { token, method: 'PATCH', body: JSON.stringify(fields) }),

  changePassword: (token: string, current_password: string, new_password: string) =>
    request<{ success: true }>('/auth/change-password', {
      token,
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),
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

export const handovers = {
  mine: (token: string) => request<Handover[]>('/handovers/my', { token }),
  selling: (token: string) => request<Handover[]>('/handovers/selling', { token }),

  /** Reserve a car. No payment — Inzozi arranges the handover offline. */
  book: (
    token: string,
    body: { car_id: string; contact_phone?: string; center?: string | null; handover_date?: string | null; handover_time?: string | null }
  ) => request<Handover>('/handovers', { token, method: 'POST', body: JSON.stringify(body) }),

  cancel: (token: string, id: string) =>
    request<Handover>(`/handovers/${id}/cancel`, { token, method: 'PATCH' }),
}

export const submissions = {
  mine: (token: string) => request<Submission[]>('/submissions', { token }),

  /** Gated by requireVerified server-side — a 403 carries ID_VERIFICATION_REQUIRED. */
  create: (token: string, body: Record<string, unknown>) =>
    request<Submission>('/submissions', { token, method: 'POST', body: JSON.stringify(body) }),

  schedule: (token: string, id: string, body: { center: string; date: string; time: string }) =>
    request<Submission>(`/submissions/${id}/schedule`, {
      token, method: 'PATCH', body: JSON.stringify(body),
    }),
}

export const notifications = {
  list: (token: string) => request<AppNotification[]>('/notifications', { token }),
  markRead: (token: string, id: string) =>
    request<AppNotification>(`/notifications/${id}/read`, { token, method: 'PATCH' }),
  markAllRead: (token: string) =>
    request<{ success: true }>('/notifications/read-all', { token, method: 'PATCH' }),
}

export const messages = {
  conversations: (token: string) =>
    request<Conversation[]>('/messages/conversations', { token }),
  thread: (token: string, id: string) =>
    request<Message[]>(`/messages/conversations/${id}`, { token }),
  start: (token: string, car_id: string, message: string) =>
    request<{ conversation: Conversation }>('/messages/conversations', {
      token, method: 'POST', body: JSON.stringify({ car_id, message }),
    }),
  send: (token: string, id: string, text: string) =>
    request<Message>(`/messages/conversations/${id}`, {
      token, method: 'POST', body: JSON.stringify({ text }),
    }),
}

export const disputes = {
  mine: (token: string) => request<Dispute[]>('/disputes/mine', { token }),
  raise: (token: string, handover_id: string, reason: string) =>
    request<Dispute>('/disputes', {
      token, method: 'POST', body: JSON.stringify({ handover_id, reason }),
    }),
}

export const referrals = {
  mine: (token: string) => request<Referral>('/referrals/mine', { token }),
  redeem: (token: string, code: string) =>
    request<{ success: true }>('/referrals/redeem', {
      token, method: 'POST', body: JSON.stringify({ code }),
    }),
}

export const sellerListings = {
  mine: (token: string) => request<Car[]>('/cars/seller/mine', { token }),
  updatePrice: (token: string, id: string, price: number) =>
    request<Car>(`/cars/${id}/price`, { token, method: 'PATCH', body: JSON.stringify({ price }) }),
}

export const api = {
  cars, rentals, sellers, auth, account, saved, handovers,
  submissions, notifications, messages, disputes, referrals, sellerListings,
}

export default api
