const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

function token() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('inzozi_admin_token')
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<any>('/auth/me'),

  // Dashboard
  stats:     () => request<any>('/admin/stats'),
  analytics: () => request<any>('/admin/analytics'),

  // Submissions
  submissions: (status?: string) =>
    request<any[]>(`/submissions/admin/all${status ? `?status=${status}` : ''}`),
  updateSubmission: (id: string, data: any) =>
    request<any>(`/submissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Inspections
  inspections: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/inspections${q}`)
  },
  getInspection:      (id: string) => request<any>(`/inspections/${id}`),
  completeInspection: (id: string, data: any) =>
    request<any>(`/inspections/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),

  // Handovers
  handovers: (status = 'pending') =>
    request<any[]>(`/handovers?status=${status}`),
  confirmHandover: (id: string) =>
    request<any>(`/handovers/${id}/confirm`, { method: 'PATCH' }),

  // Listings — admin-only route that accepts any status
  cars: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/admin/listings${q}`)
  },
  updateCarStatus: (id: string, status: string) =>
    request<any>(`/cars/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Users / ID verification
  idVerificationQueue: () => request<any[]>('/id-verification/queue'),
  decideVerification:  (userId: string, decision: string) =>
    request<any>(`/id-verification/${userId}`, {
      method: 'PATCH', body: JSON.stringify({ decision }),
    }),

  // Trust score
  trustScore: (userId: string) => request<any>(`/reviews/trust-score/${userId}`),
}
