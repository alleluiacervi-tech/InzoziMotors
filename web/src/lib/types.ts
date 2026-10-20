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
  /** On by default server-side (D3/O4 in docs/WEB-PARITY-PLAN.md) — the
   *  "while you were away" email nudge, opt-out. */
  message_email_notifications?: boolean
  /** Migration 0062: saved-search matches and price drops on saved cars.
   *  On by default; off means the alert is not created at all. */
  alert_search_matches?: boolean
  alert_price_drops?: boolean
  /** Migration 0064: the once-a-day "new on Sawa" summary. Off until the person
   *  turns it on (promotional push needs explicit opt-in). */
  alert_daily_digest?: boolean
  /** Migration 0063: the language pushes are written in. Null = never told. */
  preferred_language?: string | null
  seller_type?: string | null
  created_at: string
  /** GET /auth/me only. False for an account made with Google or Apple. */
  has_password?: boolean
  /** GET /auth/me only. Providers linked to this account. */
  sign_in_providers?: ('google' | 'apple')[]
  /** GET /auth/me only. False until a phone number is on the account. */
  profile_complete?: boolean
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

/** One row of GET /cars/recently-sold: a sold car, narrowed to what the row shows. */
export type SoldCar = Pick<
  Car,
  'id' | 'title' | 'make' | 'model' | 'year' | 'mileage' | 'price' | 'images' | 'inspection_score' | 'inspection_passed'
> & { currency?: string | null; sold_at: string }

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
  /** "Hot deal" is only sent when the price really fell (previous_price set). */
  label: 'Sponsored' | 'Hot deal' | 'Featured'
  /** Set only for a real drop of 1%+ in the last 30 days; null otherwise. */
  previous_price: number | null
  price_dropped_at: string | null
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
  /** Server verdict: threshold met and no critical failure. Null/absent = unknown. */
  inspection_passed?: boolean | null
  status: CarStatus
  views: number
  saves?: number
  listed_at?: string | null
  sold_at?: string | null
  created_at: string
  featured_until?: string | null

  // Joined by the API
  /** The showroom's business name for a showroom, the person's name otherwise. */
  seller_name?: string
  seller_is_showroom?: boolean
  seller_avatar_url?: string | null
  seller_phone?: string | null
  seller_whatsapp?: string | null
  seller_contact_available?: { phone: boolean; whatsapp: boolean; in_app: boolean }
  direct_deal_notice?: string
  marketplace_terms_version?: string
  seller_trust?: number
  seller_id_verified?: IdVerificationStatus
  seller_sales?: number
  saves_count?: number
  /** GET /cars/seller/mine only: conversations about this car. */
  inquiries_count?: number
  /** GET /cars/seller/mine only: phone/WhatsApp disclosures to buyers. */
  contacts_count?: number

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
  /** What Sawa itself witnessed. Absent from an older API. */
  sawa_record?: SawaRecord
}

export type SawaEventType = 'submitted' | 'inspected' | 'earlier_inspection' | 'listed' | 'price_changed'

export interface SawaRecordEvent {
  type: SawaEventType
  on: string
  /** Odometer read by the inspector (inspections only; null on older ones). */
  km?: number | null
  price?: number
  previous_price?: number
}

export interface OdometerReading {
  on: string
  km: number
  this_listing: boolean
}

export interface SawaRecord {
  events: SawaRecordEvent[]
  odometer: {
    readings: OdometerReading[]
    /** null with fewer than two readings: one reading contradicts nothing. */
    consistent: boolean | null
    drops: { earlier_on: string; earlier_km: number; later_on: string; later_km: number }[]
    declared_km: number | null
  }
}

/** GET /cars/:id/model-safety — NHTSA data about the MODEL, never this car. */
export interface ModelSafety {
  vehicle: { make: string; model: string; year: number }
  status: 'covered' | 'not_covered' | 'unavailable'
  source?: string
  matched_model?: string
  /** False when NHTSA contradicts itself: then no recall figure is shown. */
  recalls_known?: boolean
  recall_count?: number | null
  recalls?: {
    campaign: string
    reported_on: string | null
    component: string
    summary: string
    consequence: string
    remedy: string
  }[]
  complaints?: {
    total: number
    top_components: { component: string; count: number }[]
    crashes: number
    fires: number
    injuries: number
    deaths: number
  } | null
  rating?: { min: number; max: number; variants: { description: string; overall: number }[] } | null
  fetched_at?: string
  stale?: boolean
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
  /** Critical items that failed. Empty when the inspection passed; a listing
   *  with critical failures is still published, with them shown. */
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
  /** The evidence the car is listed on (backend rentalCheckSummary). */
  rental_check?: RentalCheckSummary | null
  /** Owner and staff views only. */
  check_status?: RentalCheckStatus
  check_requested_at?: string | null
  /** The provider's calendar, as renters see it (lib/rental-calendar.js). */
  availability?: RentalAvailability
  /** GET /rentals/mine only: upcoming taken periods with ids, for editing. */
  calendar_periods?: { id: string; starts_on: string; ends_on: string }[]
}

export type RentalCheckStatus = 'requested' | 'none' | 'legacy' | 'failed' | 'expired' | 'expiring' | 'passed'

export type RentalCheckSummary =
  | {
      kind: 'rental_check'
      version: string
      passed: boolean
      passed_count: number
      total: number
      checked_on: string | null
      insurance_valid_until: string | null
      technical_control_valid_until: string | null
      /** As-advertised points that failed: shown to renters. */
      disclosures: { id: string; label: string; note: string | null }[]
      /** Owner and staff only. */
      failed?: { id: string; label: string; note: string | null }[]
    }
  | { kind: 'inspection'; inspection_score: number | null }

export interface RentalAvailability {
  out_now: boolean
  back_on: string | null
  freshness: 'never' | 'fresh' | 'aging' | 'stale'
  updated_at: string | null
  /** Detail and owner views only: merged taken periods, inclusive. */
  busy?: { from: string; to: string }[]
}

export interface RentalCalendar {
  today: string
  periods: { id: string; starts_on: string; ends_on: string }[]
  calendar_updated_at: string | null
  availability: RentalAvailability
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
  /** Present only on GET /rentals/inquiries (the provider/admin inbox).
   *  The numbers only when the renter agreed to share them. */
  renter_name?: string | null
  renter_phone?: string | null
  renter_whatsapp?: string | null
  renter_shares_contact?: boolean
  /** The renter-provider thread this request opened (migration 0061). */
  conversation_id?: string | null
  first_response_at?: string | null
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
  | 'daily_digest'

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
    /** 'rental' = a search for cars for hire (migration 0065); absent = for sale. */
    listingType?: 'sale' | 'rental'
    location?: string
    maxDailyRate?: number
  }
  notify_enabled: boolean
  /** Migration 0064: alert as the car goes live, or hold it for the daily summary. */
  alert_mode?: 'instant' | 'daily'
  created_at: string
}

export interface Conversation {
  id: string
  car_id?: string | null
  /** Set when the thread's latest topic is a rental car (migration 0061). */
  rental_car_id?: string | null
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

/** GET /reviews/trust-score/:id — the server's own 100-point score. */
export interface TrustScore {
  total_score: number
  breakdown: {
    id_verified: { points: number; max: number }
    completed_sales: { points: number; max: number; count: number }
    response_rate: { points: number; max: number; rate: number }
    reviews: { points: number; max: number; avg: string | null; count: string | number }
  }
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
  car_title?: string
}

/** GET /reviews/seller/:id */
export interface SellerReviews {
  reviews: Review[]
  average_rating: string | null
  total: number
}

/** GET /showrooms — a verified showroom with public stock. `brands` is read
 *  off its live cars by the server, most-stocked first. */
export interface Showroom {
  id: string
  name: string
  avatar_url: string | null
  member_since: string
  live_count: number
  cover_image: string | null
  location: string | null
  brands: { make: string; count: number }[]
  business_verified: true
}

/** GET /makes — one brand, with the operator-uploaded mark when there is one. */
export interface VehicleMake {
  name: string
  slug: string
  logo_url: string | null
  aliases: string[]
}

/** GET /sellers/:id — only ever an eligible seller; never contact details. */
export interface SellerProfile {
  id: string
  name: string
  avatar_url: string | null
  member_since: string
  seller_type: string
  is_showroom: boolean
  business_name: string | null
  id_verified: true
  business_verified: boolean
  completed_sales: number
  response_rate: number
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
  /** 'today' = went live in the last 24 hours (what the daily summary opens onto). */
  new?: 'today'
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

