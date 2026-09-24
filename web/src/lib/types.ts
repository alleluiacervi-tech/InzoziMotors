// ─────────────────────────────────────────────────────────────────────────────
// The API contract, typed once.
//
// SOURCE OF TRUTH: backend/src/schema.sql and backend/src/routes/*.js.
// These are snake_case on purpose — they mirror the wire format exactly rather
// than a camelCase translation, so a field name in a component can be traced
// straight to the SQL column that produced it. The mobile app maps to camelCase
// inside AppContext; the web reads the wire shape directly.
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'buyer' | 'seller' | 'admin'
export type IdVerificationStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  name: string
  email: string
  phone?: string | null
  whatsapp_phone?: string | null
  phone_visible?: boolean
  whatsapp_visible?: boolean
  business_verified?: boolean
  role: UserRole
  id_verified: IdVerificationStatus
  trust_score: number
  response_rate?: number
  completed_sales?: number
  avatar_url?: string | null
  created_at: string
}

export type CarStatus =
  | 'draft'
  | 'under_review'
  | 'scheduled'
  | 'inspecting'
  | 'approved'
  | 'live'
  | 'paused'
  | 'sold'
  | 'rejected'
  | 'archived'

export interface PricePoint {
  price: number
  at: string
}

/**
 * A car an operator deliberately placed at the top of the marketplace.
 *
 * `sponsored` and `label` are computed by the server, not by each client, so no
 * surface can render a paid slot as an editorial pick by forgetting to check
 * the kind. For a company whose product is independent verification, an
 * unlabelled paid placement is the one thing not to ship.
 */
export interface FeaturedPlacement extends Car {
  placement_id: string
  kind: 'editorial' | 'hot_deal' | 'sponsored'
  slot: number
  headline: string | null
  ends_at: string
  seller_name: string
  sponsored: boolean
  label: string
}

export interface Car {
  id: string
  seller_id: string
  title: string
  make: string
  model: string
  year: number
  mileage: number
  fuel_type?: string | null
  transmission?: string | null
  body_type?: string | null
  color?: string | null
  price: number
  location?: string | null
  /** RHD = Japanese import, LHD = locally purchased. A real filter in Rwanda. */
  drive_side?: 'RHD' | 'LHD' | null
  vin?: string | null
  vin_masked?: string | null
  description?: string | null
  images?: string[] | null
  inspected: boolean
  inspection_score?: number | null
  status: CarStatus
  views: number
  saves?: number
  listed_at?: string | null
  sold_at?: string | null
  created_at: string
  featured_until?: string | null

  // Joined by the API
  seller_name?: string
  seller_phone?: string | null
  seller_whatsapp?: string | null
  seller_contact_available?: { phone: boolean; whatsapp: boolean; in_app: boolean }
  direct_deal_notice?: string
  marketplace_terms_version?: string
  seller_trust?: number
  seller_id_verified?: IdVerificationStatus
  seller_sales?: number
  saves_count?: number

  // Server-computed market intelligence (backend/src/routes/cars.js).
  // market_avg is null when there were fewer than 3 real comparables — in that
  // case the UI must not make a market claim at all.
  market_avg?: number | null
  market_diff?: number | null
  below_market?: number
  comparables?: number
  listed_days?: number | null
  price_history?: PricePoint[]
}

export interface VehicleHistory {
  vin: string | null
  vin_masked?: string | null
  vin_verified: boolean
  make: string
  model: string
  year: number
  drive_side?: string | null
  import_origin: string
  mileage: number
  mileage_verified: boolean
  rra_duty_paid: string
  registration: string
  service_history: string
  insurance_valid: string
  inspection_score?: number | null
  inspected_at?: string | null
  seller: { name: string; id_verified: boolean; completed_sales: number }
  accident_history: string
}

export type ChecklistVerdict = 'pass' | 'flag' | 'fail'

export interface InspectionReport {
  car_id?: string
  score: number
  max_score: number
  passing_score: number
  passed: boolean
  checklist_version: string
  checklist_results: Record<string, ChecklistVerdict>
  category_scores: Array<{
    id: string
    name: string
    max_points: number
    earned: number
    checked: number
    pass_count: number
    flag_count: number
    fail_count: number
    flags: Array<{ id: string; label: string; verdict: 'flag' | 'fail'; critical: boolean }>
  }>
  notes?: string | null
  completed_at?: string | null
  center?: string
  /** Critical items that failed. The report endpoint only answers for a
   *  passed inspection, so this is empty whenever it is present. */
  critical_failures?: Array<{ id: string; label: string; category?: string }>
}

export interface InspectionCenter {
  id: string
  name: string
  area: string | null
  address: string | null
  daily_capacity: number
}

export interface RentalCar {
  id: string
  provider_id?: string | null
  title: string
  make?: string
  model?: string
  year?: number
  category?: string
  seats?: number
  fuel?: string
  transmission?: string
  mileage?: number
  daily_rate: number
  weekly_rate?: number | null
  deposit: number
  min_days: number
  inspected: boolean
  inspection_score?: number | null
  rating?: string | number | null
  trips: number
  location?: string | null
  images?: string[] | null
  safari_ready: boolean
  status: 'active' | 'maintenance' | 'retired' | 'pending_review'
  /** Provider-set, informational only — no public read filters on it. */
  unavailable_until?: string | null
  booked_ranges?: { start_date: string; days: number }[]
  provider_name?: string | null
  provider_business_name?: string | null
  provider_contact_available?: { phone: boolean; whatsapp: boolean; in_app: boolean }
  direct_deal_notice?: string
  marketplace_terms_version?: string
  /** Present on GET /rentals/mine and the admin fleet view only. */
  subscription_status?: 'none' | 'lapsed' | 'lapsing' | 'active'
  subscription_ends_on?: string | null
  subscription_amount_rwf?: number | null
}

/** One of the caller's own inspections eligible to back a new rental proposal. */
export interface EligibleRentalInspection {
  id: string
  score: number
  completed_at: string
  make: string
  model: string
  year: number
  purpose: 'sale' | 'rental' | 'both'
}

export interface RentalInquiry {
  id: string
  inquiry_ref: string
  rental_car_id: string
  renter_id: string
  provider_id?: string | null
  start_date?: string | null
  days?: number | null
  pickup_location?: string | null
  message?: string | null
  preferred_channel: 'in_app' | 'phone' | 'whatsapp'
  status: 'new' | 'contacted' | 'closed' | 'cancelled'
  created_at: string
  car_title?: string
  car_images?: string[] | null
  provider_name?: string | null
  provider_business_name?: string | null
  /** Present only on GET /rentals/inquiries (the provider/admin inbox). */
  renter_name?: string | null
  renter_phone?: string | null
  renter_whatsapp?: string | null
}

export type SubmissionStatus =
  | 'under_review'
  | 'approved'
  | 'scheduled'
  | 'inspecting'
  | 'inspected'
  | 'live'
  | 'rejected'

export interface Submission {
  id: string
  car_id?: string | null
  seller_id: string
  status: SubmissionStatus
  make?: string
  model?: string
  year?: number
  mileage?: number
  condition?: string
  transmission?: string
  body_type?: string
  color?: string
  fuel_type?: string
  asking_price: number
  notes?: string | null
  admin_notes?: string | null
  reference_images?: string[] | null
  inspection_center?: string | null
  inspection_date?: string | null
  inspection_time?: string | null
  submitted_at: string
  // Joined
  car_title?: string
  car_images?: string[] | null
  listing_status?: CarStatus
}

export type NotificationType =
  | 'price_drop'
  | 'new_message'
  | 'message'
  | 'listing_update'
  | 'handover'
  | 'search_match'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  meta?: Record<string, unknown> | null
  created_at: string
}

/** One inspection report this account may read — GET /inspections/my-reports.
 *  `source` distinguishes a commissioned inspection from a resold copy or an
 *  admin grant; `paid_rwf` is null for a free grant. */
export interface ReportEntitlement {
  entitlement_id: string
  source: 'purchased' | 'seller_copy' | 'admin_grant' | 'paid_customer'
  granted_at: string
  inspection_id: string
  score: number | null
  completed_at: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_vin: string | null
  vehicle: string
  paid_rwf: number | null
  file_url: string
}

export interface SavedSearch {
  id: string
  label: string
  filters: {
    make?: string
    model?: string
    category?: string
    maxPrice?: number
    maxMileage?: number
    query?: string
  }
  notify_enabled: boolean
  created_at: string
}

export interface Conversation {
  id: string
  car_id?: string | null
  buyer_id: string
  seller_id: string
  last_message?: string | null
  last_message_at?: string | null
  created_at: string
  buyer_name?: string
  seller_name?: string
  car_title?: string
  car_images?: string[] | null
  unread_count?: string | number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  text: string
  read: boolean
  created_at: string
  sender_name?: string
}

export interface TrustScore {
  total: number
  breakdown: {
    id_verified: number
    completed_sales: number
    response_rate: number
    reviews: number
  }
  profile?: Record<string, unknown>
}

export interface Review {
  id: string
  handover_id: string
  reviewer_id: string
  seller_id: string
  rating: number
  comment?: string | null
  created_at: string
  reviewer_name?: string
}

export interface Valuation {
  comparables: number
  low?: number
  high?: number
  market_avg?: number
  range_seen?: { low: number; high: number }
  message?: string
}

/** Filters accepted by GET /cars. Mirrors the query params the route parses. */
export interface CarQuery {
  q?: string
  make?: string
  model?: string
  min_price?: number
  max_price?: number
  min_year?: number
  max_year?: number
  fuel_type?: string
  transmission?: string
  body_type?: string
  drive_side?: string
  sort?: 'listed_at' | 'price' | 'mileage' | 'year' | 'views'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type HandoverStatus =
  | 'pending'
  | 'confirmed'
  | 'booked'
  | 'scheduled'
  | 'in_progress'
  | 'complete'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export interface Handover {
  id: string
  booking_id: string
  car_id: string
  car_title?: string
  car_images?: string[]
  price: number
  agreed_price?: number | null
  status: HandoverStatus
  booked_at: string
  completed_at?: string | null
  confirmed_at?: string | null
  center_id?: string
  center_name?: string
  center?: string
  handover_date?: string | null
  handover_time?: string | null
  contact_phone?: string | null
  seller_id?: string
  buyer_id?: string
}

export interface Dispute {
  id: string
  handover_id: string
  reason: string
  status: 'open' | 'investigating' | 'resolved' | 'rejected'
  created_at: string
  resolved_at?: string | null
}

export interface ReferralStats {
  code: string
  total_referrals: number
  completed_handovers: number
  reward_earned: number
}

