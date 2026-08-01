import { STUDIO } from './carImageAssets';
// Sawa — Phase 2 shared data: inspection categories, vehicle history, seller profiles, notifications

// ─── 150-Point Inspection Categories ─────────────────────────────────────────
export const INSPECTION_CATEGORIES = [
  {
    id: 'engine',
    name: 'Engine & Drivetrain',
    icon: 'cog-outline',
    maxPts: 25,
    items: [
      { id: 'e1', label: 'Engine oil level & condition' },
      { id: 'e2', label: 'Coolant level & condition' },
      { id: 'e3', label: 'Timing belt / chain condition' },
      { id: 'e4', label: 'Air filter condition' },
      { id: 'e5', label: 'Engine mounts (no excessive movement)' },
      { id: 'e6', label: 'Exhaust system (no leaks or damage)' },
      { id: 'e7', label: 'No oil leaks detected underneath' },
    ],
  },
  {
    id: 'brakes',
    name: 'Brakes & Steering',
    icon: 'disc-outline',
    maxPts: 25,
    items: [
      { id: 'b1', label: 'Front brake pads (≥4mm remaining)' },
      { id: 'b2', label: 'Rear brake pads (≥4mm remaining)' },
      { id: 'b3', label: 'Brake rotors (no warping/deep grooves)' },
      { id: 'b4', label: 'Brake fluid level & condition' },
      { id: 'b5', label: 'ABS system functional' },
      { id: 'b6', label: 'Steering alignment (no pull)' },
      { id: 'b7', label: 'Wheel bearings (no noise/play)' },
    ],
  },
  {
    id: 'body',
    name: 'Body & Exterior',
    icon: 'car-outline',
    maxPts: 20,
    items: [
      { id: 'bo1', label: 'Panel gaps consistent (no accident signs)' },
      { id: 'bo2', label: 'Paint condition (no major scratches/dents)' },
      { id: 'bo3', label: 'Windscreen (no cracks or chips)' },
      { id: 'bo4', label: 'All exterior lights functional' },
      { id: 'bo5', label: 'Undercarriage rust assessment' },
      { id: 'bo6', label: 'Roof & A/B/C pillars condition' },
    ],
  },
  {
    id: 'interior',
    name: 'Interior & Comfort',
    icon: 'car-sport-outline',
    maxPts: 20,
    items: [
      { id: 'i1', label: 'Seat condition (all positions, wear check)' },
      { id: 'i2', label: 'Dashboard & all controls functional' },
      { id: 'i3', label: 'AC & heating fully functional' },
      { id: 'i4', label: 'Power windows & mirrors' },
      { id: 'i5', label: 'Boot / trunk sealing & condition' },
      { id: 'i6', label: 'Odometer reading verified vs records' },
    ],
  },
  {
    id: 'electronics',
    name: 'Electronics & Safety',
    icon: 'flash-outline',
    maxPts: 20,
    items: [
      { id: 'el1', label: 'Battery charge & health check' },
      { id: 'el2', label: 'OBD diagnostic scan (zero fault codes)' },
      { id: 'el3', label: 'Airbag system (no warning lights)' },
      { id: 'el4', label: 'Traction / stability control active' },
      { id: 'el5', label: 'Central locking & immobilizer' },
      { id: 'el6', label: 'Infotainment system & speakers' },
    ],
  },
  {
    id: 'tyres',
    name: 'Tyres & Wheels',
    icon: 'radio-button-on-outline',
    maxPts: 15,
    items: [
      { id: 't1', label: 'Front-left tyre tread (≥3mm)' },
      { id: 't2', label: 'Front-right tyre tread (≥3mm)' },
      { id: 't3', label: 'Rear-left tyre tread (≥3mm)' },
      { id: 't4', label: 'Rear-right tyre tread (≥3mm)' },
      { id: 't5', label: 'Spare tyre condition' },
    ],
  },
  {
    id: 'docs',
    name: 'Documentation',
    icon: 'document-text-outline',
    maxPts: 25,
    items: [
      { id: 'd1', label: 'Vehicle registration card (valid)' },
      { id: 'd2', label: 'Service history records present' },
      { id: 'd3', label: 'Import documents (if applicable)' },
      { id: 'd4', label: 'Insurance certificate (valid & active)' },
      { id: 'd5', label: 'RRA duty paid proof' },
      { id: 'd6', label: 'VIN plate matches all documents' },
    ],
  },
];

// ─── 36-Angle Photo Slots ─────────────────────────────────────────────────────
export const PHOTO_GROUPS = [
  {
    group: 'Exterior',
    slots: [
      { id: 'ext_front', label: 'Front' },
      { id: 'ext_fl45', label: 'Front-Left 45°' },
      { id: 'ext_left', label: 'Left Side' },
      { id: 'ext_rl45', label: 'Rear-Left 45°' },
      { id: 'ext_rear', label: 'Rear' },
      { id: 'ext_rr45', label: 'Rear-Right 45°' },
      { id: 'ext_right', label: 'Right Side' },
      { id: 'ext_fr45', label: 'Front-Right 45°' },
    ],
  },
  {
    group: 'Details',
    slots: [
      { id: 'det_roof', label: 'Roof' },
      { id: 'det_under', label: 'Underbody' },
      { id: 'det_wfl', label: 'Wheel Front-Left' },
      { id: 'det_wfr', label: 'Wheel Front-Right' },
      { id: 'det_wrl', label: 'Wheel Rear-Left' },
      { id: 'det_wrr', label: 'Wheel Rear-Right' },
      { id: 'det_tfl', label: 'Tyre Tread Front-Left' },
      { id: 'det_tfr', label: 'Tyre Tread Front-Right' },
      { id: 'det_trl', label: 'Tyre Tread Rear-Left' },
      { id: 'det_trr', label: 'Tyre Tread Rear-Right' },
    ],
  },
  {
    group: 'Under Hood',
    slots: [
      { id: 'hood_bay', label: 'Engine Bay' },
      { id: 'hood_serial', label: 'Engine Serial No.' },
    ],
  },
  {
    group: 'Instruments',
    slots: [
      { id: 'inst_odo', label: 'Odometer Reading' },
      { id: 'inst_vin', label: 'VIN Plate' },
    ],
  },
  {
    group: 'Interior',
    slots: [
      { id: 'int_dash', label: 'Dashboard (full)' },
      { id: 'int_info', label: 'Infotainment Screen' },
      { id: 'int_driver', label: 'Driver Seat' },
      { id: 'int_rear', label: 'Rear Seats' },
      { id: 'int_boot', label: 'Boot / Trunk' },
      { id: 'int_head', label: 'Headliner' },
    ],
  },
  {
    group: 'Defects (if any)',
    slots: [
      { id: 'def1', label: 'Defect Close-up #1' },
      { id: 'def2', label: 'Defect Close-up #2' },
      { id: 'def3', label: 'Defect Close-up #3' },
      { id: 'def4', label: 'Defect Close-up #4' },
      { id: 'def5', label: 'Defect Close-up #5' },
      { id: 'def6', label: 'Defect Close-up #6' },
      { id: 'def7', label: 'Defect Close-up #7' },
      { id: 'def8', label: 'Defect Close-up #8' },
    ],
  },
];

// ─── Mock completed inspection result (shown in InspectionReportScreen) ───────
export const MOCK_INSPECTION_RESULT = {
  score: 143,
  maxScore: 150,
  date: 'Jun 18, 2026',
  inspector: 'Mechanic: Patrick N. · Nyarutarama Center',
  certified: true,
  categories: [
    { id: 'engine',      name: 'Engine & Drivetrain',   maxPts: 25, earned: 25, flags: [] },
    { id: 'brakes',      name: 'Brakes & Steering',     maxPts: 25, earned: 22, flags: ['Front brake pads at 4.5mm — monitor at next service', 'Minor steering play detected'] },
    { id: 'body',        name: 'Body & Exterior',        maxPts: 20, earned: 20, flags: [] },
    { id: 'interior',    name: 'Interior & Comfort',     maxPts: 20, earned: 20, flags: [] },
    { id: 'electronics', name: 'Electronics & Safety',   maxPts: 20, earned: 20, flags: [] },
    { id: 'tyres',       name: 'Tyres & Wheels',         maxPts: 15, earned: 12, flags: ['Front-left tyre tread at 3.2mm — acceptable but nearing replacement', 'Spare tyre shows surface cracking (age)'] },
    { id: 'docs',        name: 'Documentation',          maxPts: 25, earned: 24, flags: ['Service history partial — 2 years missing records'] },
  ],
};

// ─── API report → screen shape ────────────────────────────────────────────────
// Mirrors backend CATEGORY_WEIGHTS (inspections.js): same names, weights, items.
const API_CATEGORY_DEFS = [
  { id: 'engine',      name: 'Engine & Drivetrain', weight: 25, items: ['Engine oil level & condition', 'Coolant level', 'Timing belt condition', 'Air filter', 'Engine mounts', 'Transmission fluid'] },
  { id: 'brakes',      name: 'Brakes & Steering',   weight: 25, items: ['Front brake pads', 'Rear brake pads', 'Brake fluid', 'Brake lines', 'Power steering fluid', 'Wheel alignment'] },
  { id: 'body',        name: 'Body & Exterior',     weight: 20, items: ['Panel gaps & alignment', 'Paint condition', 'Windscreen integrity', 'Front lights', 'Rear lights', 'Rust / corrosion'] },
  { id: 'interior',    name: 'Interior & Comfort',  weight: 20, items: ['Seat condition', 'Dashboard instruments', 'Air conditioning', 'Windows & locks', 'Odometer reading', 'Boot / trunk'] },
  { id: 'electronics', name: 'Electronics & Safety', weight: 20, items: ['Battery health', 'OBD scan (no fault codes)', 'Airbag system', 'Traction control', 'Seatbelts', 'Horn'] },
  { id: 'tyres',       name: 'Tyres & Wheels',      weight: 15, items: ['Front-left tread', 'Front-right tread', 'Rear-left tread', 'Rear-right tread', 'Spare tyre', 'Wheel condition'] },
  { id: 'docs',        name: 'Documentation',       weight: 25, items: ['Registration / logbook', 'Service history', 'Import documents', 'Insurance valid', 'RRA duty paid stamp', 'VIN match'] },
];

// Convert GET /inspections/report/:carId into the shape the report screen renders.
// Returns null when the payload has no usable checklist.
export function buildReportFromApi(report) {
  if (!report) return null;
  let checklist = report.checklist_results;
  if (typeof checklist === 'string') {
    try { checklist = JSON.parse(checklist); } catch { checklist = null; }
  }
  if (!checklist || typeof checklist !== 'object' || !Object.keys(checklist).length) return null;

  const value = (v) => (v === 'pass' ? 1 : v === 'flag' ? 0.5 : 0);
  const categories = API_CATEGORY_DEFS.map((def) => {
    const present = def.items.filter((item) => checklist[item] !== undefined);
    if (!present.length) {
      return { id: def.id, name: def.name, maxPts: def.weight, earned: def.weight, flags: [] };
    }
    const got = present.reduce((sum, item) => sum + value(checklist[item]), 0);
    const flags = present
      .filter((item) => checklist[item] !== 'pass')
      .map((item) => `${item} — ${checklist[item] === 'flag' ? 'flagged for attention' : 'failed inspection'}`);
    return {
      id: def.id,
      name: def.name,
      maxPts: def.weight,
      earned: Math.round((got / present.length) * def.weight),
      flags,
    };
  });

  const score = Number(report.score) || categories.reduce((s, c) => s + c.earned, 0);
  return {
    score,
    maxScore: 150,
    date: report.completed_at
      ? new Date(report.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Recently',
    inspector: 'Sawa Inspection Team',
    certified: score >= 132,
    categories,
  };
}

// ─── Vehicle History Mock Data (keyed by carId) ───────────────────────────────
export const VEHICLE_HISTORY = {
  default: {
    owners: 1,
    ownerLabel: '1st Owner',
    accidents: 0,
    accidentLabel: 'No accidents on record',
    mileageVerified: true,
    mileageNote: 'Odometer matches service records',
    importOrigin: 'Japan',
    importYear: 2021,
    importNote: 'Right-hand drive · Japanese market',
    rraDutyPaid: true,
    rraDutyNote: 'RRA Import Duty: Paid · Verified Jun 2026',
    insuranceActive: true,
    insuranceNote: 'SORAS Insurance · Valid until Dec 2026',
    chassisNumber: 'JTMRZ33V485012345',
    vinVerified: true,
    lastService: 'Apr 2026',
    serviceHistory: true,
  },
  '2': {
    owners: 2,
    ownerLabel: '2nd Owner',
    accidents: 1,
    accidentLabel: '1 minor incident (2020) — no structural damage',
    mileageVerified: true,
    mileageNote: 'Odometer matches service records',
    importOrigin: 'UAE',
    importYear: 2019,
    importNote: 'Left-hand drive · UAE market',
    rraDutyPaid: true,
    rraDutyNote: 'RRA Import Duty: Paid · Verified May 2026',
    insuranceActive: true,
    insuranceNote: 'Sonarwa Insurance · Valid until Sep 2026',
    chassisNumber: 'WBA5A7C50GG123456',
    vinVerified: true,
    lastService: 'Feb 2026',
    serviceHistory: true,
  },
};

// ─── Seller Profiles Mock Data ────────────────────────────────────────────────
export const SELLER_PROFILES = {
  'Carvana': {
    name: 'Carvana',
    initials: 'CA',
    memberSince: 'Jan 2024',
    location: 'Nyarutarama, Kigali',
    bio: 'Verified dealer with 3+ years on the platform. Specializes in imported Japanese vehicles.',
    trustScore: 92,
    idVerified: true,
    completedSales: 28,
    responseRate: 97,
    avgRating: 4.8,
    totalReviews: 22,
    activeListings: [
      { id: '1', title: '2022 Tesla Model 3', price: '$24,900', image: STUDIO.heroSedan },
      { id: '5', title: '2021 Audi Q5', price: '$38,500', image: STUDIO.suvSideStudio },
    ],
    reviews: [
      { id: 'r1', buyer: 'Marie C.', rating: 5, text: 'Excellent experience! Car was exactly as described. Very responsive seller.', date: 'Jun 15, 2026' },
      { id: 'r2', buyer: 'Patrick N.', rating: 5, text: 'Professional and trustworthy. Process was smooth from start to finish.', date: 'May 28, 2026' },
      { id: 'r3', buyer: 'Diane M.', rating: 4, text: 'Good car, honest about condition. Would buy again.', date: 'Apr 10, 2026' },
    ],
  },
  'Bay Auto Group': {
    name: 'Bay Auto Group',
    initials: 'BA',
    memberSince: 'Mar 2024',
    location: 'Kicukiro, Kigali',
    bio: 'Premium car dealer with focus on European and American brands. Full service history on all vehicles.',
    trustScore: 85,
    idVerified: true,
    completedSales: 14,
    responseRate: 88,
    avgRating: 4.6,
    totalReviews: 11,
    activeListings: [
      { id: '2', title: '2021 BMW 4 Series', price: '$31,500', image: STUDIO.heroGt },
    ],
    reviews: [
      { id: 'r1', buyer: 'Jean Pierre H.', rating: 5, text: 'Great BMW, very well maintained. Seller was helpful throughout.', date: 'Jun 2, 2026' },
      { id: 'r2', buyer: 'Alice M.', rating: 4, text: 'Good communication, car was clean and ready for handover.', date: 'May 11, 2026' },
    ],
  },
};

// Default profile for sellers not in the map
export const DEFAULT_SELLER_PROFILE = {
  name: 'Verified Seller',
  initials: 'VS',
  memberSince: 'Feb 2025',
  location: 'Kigali, Rwanda',
  bio: 'Verified Sawa seller. All vehicles fully inspected before listing.',
  trustScore: 72,
  idVerified: true,
  completedSales: 3,
  responseRate: 80,
  avgRating: 4.5,
  totalReviews: 3,
  activeListings: [],
  reviews: [
    { id: 'r1', buyer: 'Happy Buyer', rating: 5, text: 'Smooth transaction, great car.', date: 'Jun 1, 2026' },
  ],
};

// ─── Initial Notifications Mock Data ─────────────────────────────────────────
export const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1', type: 'price_drop', read: false,
    title: 'Price dropped on a saved car',
    body: '2022 Tesla Model 3 dropped $1,200 → now $24,900',
    time: '2 hours ago', date: 'Today',
    carId: '1',
  },
  {
    id: 'n2', type: 'new_message', read: false,
    title: 'New message from Bay Auto Group',
    body: 'Thanks for your interest! The BMW is still available for viewing.',
    time: '5 hours ago', date: 'Today',
  },
  {
    id: 'n3', type: 'listing_update', read: false,
    title: 'Your submission went LIVE',
    body: 'Your 2020 Toyota RAV4 XLE is now visible to buyers on the marketplace.',
    time: '9 hours ago', date: 'Today',
  },
  {
    id: 'n4', type: 'saved_search', read: true,
    title: 'Saved search match',
    body: 'A Toyota RAV4 under $30,000 was just listed in Kigali.',
    time: 'Yesterday · 3:22 PM', date: 'Yesterday',
    carId: '3',
  },
  {
    id: 'n5', type: 'price_drop', read: true,
    title: 'Price dropped on a saved car',
    body: '2019 Honda CR-V dropped $800 → now $22,200',
    time: 'Yesterday · 10:15 AM', date: 'Yesterday',
  },
  {
    id: 'n6', type: 'listing_update', read: true,
    title: 'Inspection appointment confirmed',
    body: 'Your 2019 Honda Civic Sport inspection is set for Jun 29 at 10:00 AM · Kicukiro Center.',
    time: 'Jun 27 · 2:00 PM', date: 'Jun 27',
  },
  {
    id: 'n7', type: 'new_message', read: true,
    title: 'New message from Carvana',
    body: 'Saturday at 11:30 AM works. I\'ll send the inspection center address.',
    time: 'Jun 26 · 11:30 AM', date: 'Jun 26',
  },
];
