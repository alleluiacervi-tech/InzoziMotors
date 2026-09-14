import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { DEFAULT_CAR_IMAGE, DEFAULT_CAR_IMAGES, STUDIO } from '../data/carImageAssets';
import { categories, formatPrice, formatMiles, cars as mockCars, conversations as initialConversations, sellerListings as initialSellerListings } from '../data/cars';
import { INITIAL_NOTIFICATIONS } from '../data/inspectionData';
import { RENTAL_CARS } from '../data/rentals';
import { setRwfRate, setDutyRates } from '../data/marketData';
import authApi from '../api/auth';
import carsApi from '../api/cars';
import submissionsApi from '../api/submissions';
import messagesApi from '../api/messages';
import notificationsApi from '../api/notifications';
import rentalsApi from '../api/rentals';
import inspectionsApi from '../api/inspections';
import makesApi from '../api/makes';
import api, { BASE_URL, getToken } from '../api/client';
import io from 'socket.io-client';
import { syncPushToken, unregisterPushToken } from '../utils/push';
import { getJSON, setJSON } from '../storage';
import {
  DEFAULT_LANGUAGE, LANGUAGES, languageFor, localeFor, normalizeLanguage, translate,
} from '../i18n';

const AppContext = createContext();

// ─── Demo mode ────────────────────────────────────────────────────────────────
// ONE switch for every fabrication in this file: the bundled catalogue, the
// offline "login" that accepts any credentials, the local submissions, inquiries
// and auto-replies the server never saw.
//
// All of it exists so the app is demoable before the backend is deployed. None
// of it may ship. A release build that invents 25 certified listings, or signs
// someone in against credentials nothing checked, is doing the exact thing Sawa
// exists to stop — and reads to a store reviewer as deceptive behaviour.
//
// __DEV__ is true under Metro (Expo Go and the dev client) and compiled to false
// in every release bundle, which is precisely the line we want.
const DEMO_MODE = typeof __DEV__ !== 'undefined' && __DEV__;

// Empty rather than absent: screens iterate these, so production gets a real
// empty state, never a fake-populated one.
const NONE = [];

const demo = (fixture) => (DEMO_MODE ? fixture : NONE);

// Demo user shown when no backend auth token exists
const DEFAULT_USER = {
  name: 'Alex Morgan',
  email: 'alex.morgan@email.com',
  initials: 'AM',
  id_verified: 'none', // 'none' so the ID verification flow is demoable
};

// The signed-out shape in a release build — no borrowed name, no borrowed email.
const ANONYMOUS_USER = { name: '', email: '', initials: '', id_verified: 'none' };

const SIGNED_OUT_USER = DEMO_MODE ? DEFAULT_USER : ANONYMOUS_USER;

// The API never returns initials — they are a display concern. One helper so
// every place that adopts a user object renders the avatar the same way.
function withInitials(user) {
  if (!user) return user;
  const initials = String(user.name || '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return { ...user, initials: initials || 'IN' };
}

// Demo data — used when backend is unreachable (Phase 6 not yet deployed)
const INITIAL_SUBMISSIONS = [
  {
    id: 'sub1', carTitle: '2020 Toyota RAV4 XLE AWD',
    make: 'Toyota', model: 'RAV4', year: 2020, mileage: 34100, askingPrice: 26000,
    submittedDate: 'Jun 25, 2026', status: 'live',
    image: STUDIO.suvSideStudio,
    inspectionDate: null, center: 'Nyarutarama', listingId: '3',
    statusDetail: 'Listed 3 days ago · 47 views',
  },
  {
    id: 'sub2', carTitle: '2019 Honda Civic Sport',
    make: 'Honda', model: 'Civic', year: 2019, mileage: 41000, askingPrice: 18500,
    submittedDate: 'Jun 27, 2026', status: 'scheduled',
    image: STUDIO.paintWhite,
    inspectionDate: 'Jun 29, 2026 · 10:00 AM', center: 'Kicukiro', listingId: null,
    statusDetail: 'Inspection: Jun 29 · 10:00 AM · Kicukiro Center',
  },
  {
    id: 'sub3', carTitle: '2018 Subaru Forester XT',
    make: 'Subaru', model: 'Forester', year: 2018, mileage: 58000, askingPrice: 22000,
    submittedDate: 'Jun 28, 2026', status: 'under_review',
    image: STUDIO.paintSilver,
    inspectionDate: null, center: null, listingId: null,
    statusDetail: 'Book your inspection slot to continue',
  },
];

const INITIAL_VERIFICATIONS = [
  { id: 'v1', name: 'Jean Pierre Habimana', initials: 'JP', submitted: '2 hours ago', status: 'pending' },
  { id: 'v2', name: 'Marie Claire Uwase', initials: 'MC', submitted: '5 hours ago', status: 'pending' },
  { id: 'v3', name: 'Emmanuel Nsabimana', initials: 'EN', submitted: 'Yesterday', status: 'pending' },
  { id: 'v4', name: 'Diane Mukeshimana', initials: 'DM', submitted: '2 days ago', status: 'pending' },
];

const INITIAL_INSPECTIONS_ADMIN = [
  { id: 'i1', seller: 'Jean Pierre H.', car: '2019 Toyota RAV4', time: 'Today · 10:00 AM', center: 'Nyarutarama', status: 'today' },
  { id: 'i2', seller: 'Alice Murekatete', car: '2021 Honda CR-V', time: 'Today · 2:00 PM', center: 'Kicukiro', status: 'today' },
  { id: 'i3', seller: 'Robert Kagabo', car: '2018 Subaru Forester', time: 'Jun 29 · 9:00 AM', center: 'Nyarutarama', status: 'upcoming' },
  { id: 'i4', seller: 'Diane Mukeshimana', car: '2022 VW Golf GTI', time: 'Jun 30 · 11:00 AM', center: 'Kicukiro', status: 'upcoming' },
  { id: 'i5', seller: 'Patrick Niyonsaba', car: '2020 Mazda CX-5', time: 'Jul 1 · 3:00 PM', center: 'Nyarutarama', status: 'upcoming' },
];

const INITIAL_MESSAGES = {
  c1: [
    { id: '1', me: false, text: "Hi! Thanks for your interest in the BMW 4 Series. It's still available.", time: '11:20 AM' },
    { id: '2', me: true, text: 'Great! Is the price negotiable?', time: '11:22 AM' },
    { id: '3', me: false, text: "We can arrange a viewing this week. It just passed our 150-point inspection.", time: '11:25 AM' },
    { id: '4', me: true, text: 'Sounds good. Can I schedule a viewing Saturday?', time: '11:28 AM' },
    { id: '5', me: false, text: "Absolutely — Saturday at 11:30 AM works. I'll send the address.", time: '11:30 AM' },
  ],
  c2: [
    { id: '1', me: false, text: 'Yes, the vehicle is still available. When would you like to view it?', time: 'Yesterday' },
    { id: '2', me: true, text: 'Thank you! When will the car be delivered?', time: 'Yesterday' },
    { id: '3', me: false, text: "Estimated delivery is within 1-2 business days. We'll send tracking info soon.", time: 'Yesterday' },
  ],
  c3: [
    { id: '1', me: false, text: 'Thanks for your interest in the RAV4!', time: 'Mon' },
    { id: '2', me: true, text: 'Is this still available? And does it come with the inspection report?', time: 'Mon' },
    { id: '3', me: false, text: 'Yes, still available! Full 150-point report is attached to the listing.', time: 'Mon' },
  ],
};

const INITIAL_SAVED_SEARCHES = [
  { id: 'ss1', label: 'Toyota RAV4 · SUV · < $30k', make: 'Toyota', model: 'RAV4', category: 'SUV', maxPrice: 30000, notifyEnabled: true, matchCount: 3, lastMatch: '2 days ago' },
  { id: 'ss2', label: 'BMW Sedan · Any year · < $45k', make: 'BMW', category: 'Sedan', maxPrice: 45000, notifyEnabled: false, matchCount: 1, lastMatch: '1 week ago' },
  { id: 'ss3', label: 'Electric car · < 30k miles', category: 'EV', maxMileage: 30000, notifyEnabled: true, matchCount: 5, lastMatch: 'Today' },
];

const AUTO_REPLIES = [
  "Thanks for your message! Let me check on that for you.",
  "That's a great question. I'll get back to you shortly with more details.",
  "Absolutely! We can arrange that. When works best for you?",
  "I appreciate your interest. This vehicle has been very popular.",
  "Sure thing! I can send over the full inspection report right away.",
];

export function AppProvider({ children }) {
  const [cars, setCars] = useState(demo(mockCars));
  const [savedCarIds, setSavedCarIds] = useState([]);
  const [sellerListings, setSellerListings] = useState(demo(initialSellerListings || []));
  const [conversations, setConversations] = useState(demo(initialConversations || []));
  const [chatMessages, setChatMessages] = useState(DEMO_MODE ? INITIAL_MESSAGES : {});
  const [currentUser, setCurrentUser] = useState(SIGNED_OUT_USER);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // True once a catalogue read has failed with a transport error. Screens use it
  // to say "we couldn't reach Sawa" instead of rendering an empty marketplace
  // that looks like we simply have no cars.
  const [backendReachable, setBackendReachable] = useState(true);

  // Seller submission pipeline
  const [submissions, setSubmissions] = useState(demo(INITIAL_SUBMISSIONS));

  // ID verification status derived from current user profile
  const idVerificationStatus = currentUser?.id_verified || 'none';

  // Admin data
  const [pendingVerifications, setPendingVerifications] = useState(demo(INITIAL_VERIFICATIONS));
  const [adminInspections, setAdminInspections] = useState(demo(INITIAL_INSPECTIONS_ADMIN));

  // Notifications
  const [notifications, setNotifications] = useState(demo(INITIAL_NOTIFICATIONS || []));

  // Submitted inspection forms (keyed by inspectionId)
  const [inspectionForms, setInspectionForms] = useState({});

  // Comparison (max 3 cars)
  const [comparisonCars, setComparisonCars] = useState([]);

  // Rentals — verified provider inventory and non-binding availability inquiries.
  const [homeMode, setHomeMode] = useState('buy'); // 'buy' | 'rent'
  const [rentalCars, setRentalCars] = useState(demo(RENTAL_CARS));
  const [rentalInquiries, setRentalInquiries] = useState([]);
  const sendRentalInquiry = useCallback(async (inquiry) => {
    try {
      const created = await rentalsApi.inquire(inquiry.carId, {
        start_date: inquiry.startDateISO,
        days: inquiry.days,
        pickup_location: inquiry.pickupLocation || undefined,
        message: inquiry.message || undefined,
        preferred_channel: inquiry.preferredChannel || 'in_app',
        acknowledge: true,
      });
      const mine = await rentalsApi.getMyInquiries();
      setRentalInquiries(mine.map(mapRentalInquiry));
      return created;
    } catch (err) {
      if (!DEMO_MODE) throw err;
      console.warn('Rental inquiry API unreachable — storing a demo inquiry:', err.message);
      const localInquiry = {
        id: 'ri' + Date.now(), inquiryRef: 'DEMO-' + String(Date.now()).slice(-6),
        status: 'new', createdAt: new Date().toISOString(), ...inquiry,
      };
      setRentalInquiries((prev) => [localInquiry, ...prev]);
      return { ...localInquiry, notice: 'Demo inquiry only.' };
    }
  }, []);
  const cancelRentalInquiry = useCallback(async (id) => {
    const before = rentalInquiries;
    setRentalInquiries((prev) => prev.map((item) => item.id === id ? { ...item, status: 'cancelled' } : item));
    try {
      await rentalsApi.cancelInquiry(id);
      return true;
    } catch (err) {
      if (DEMO_MODE) return true;
      setRentalInquiries(before);
      throw err;
    }
  }, [rentalInquiries]);

  // Socket state
  const [socket, setSocket] = useState(null);
  // The conversation currently open in ChatScreen (null when none). Drives
  // "don't count unread while I'm reading it" and room re-join on reconnect.
  const activeConvRef = useRef(null);
  const [typingConvId, setTypingConvId] = useState(null);

  // Expo push token for this device, held so logout can unregister it
  const [pushToken, setPushToken] = useState(null);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState(demo(INITIAL_SAVED_SEARCHES));

  const addToComparison = useCallback((car) => {
    setComparisonCars((prev) => {
      if (prev.find((c) => c.id === car.id)) return prev;
      if (prev.length >= 3) return [...prev.slice(1), car];
      return [...prev, car];
    });
  }, []);
  const removeFromComparison = useCallback((carId) => {
    setComparisonCars((prev) => prev.filter((c) => c.id !== carId));
  }, []);
  const clearComparison = useCallback(() => setComparisonCars([]), []);

  // Currency toggle
  const currency = 'RWF';
  const toggleCurrency = useCallback(() => {}, []);

  // Language is a device preference, not an account property. Keeping it here
  // makes every screen react to one change and lets the first-run screens offer
  // the same selector as Settings. Translation data is bundled, so changing it
  // never waits for a network request.
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const setLanguage = useCallback((value) => {
    const next = normalizeLanguage(value);
    setLanguageState(next);
    setJSON('language', next).catch(() => {});
    return next;
  }, []);
  const t = useCallback((key, variables) => translate(language, key, variables), [language]);

  // Recently viewed — powers the Home personalization rail
  const [recentlyViewedIds, setRecentlyViewedIds] = useState([]);
  // The live USD⇄RWF rate WITH its provenance, in state rather than only in
  // marketData's module binding — a module variable cannot re-render a screen,
  // which is why the rate was being fetched and cached for months while no
  // price in the app ever followed it. Seeded with the same floor the backend
  // uses so the very first frame formats correctly, and flagged stale until a
  // provider has actually answered.
  const [fx, setFx] = useState({ rate: 1470, source: 'builtin-floor', fetched_at: null, stale: true });
  // The brand list, served rather than bundled. Empty until the first fetch or
  // cache read lands, and every consumer treats empty as "fall back to free
  // text" rather than as "no brands exist".
  const [makes, setMakes] = useState([]);
  const recordCarView = useCallback((id) => {
    setRecentlyViewedIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 10));
  }, []);

  // --- Persistence: local preferences and demo inquiries ---
  // Hydrate once on mount; only persist after hydration so defaults never
  // overwrite what the user already stored.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    (async () => {
      // One name per line, destructured in the same order they are listed.
      // Positional destructuring of a Promise.all is unchecked by anything —
      // insert an entry in the middle and every name after it silently shifts
      // onto the wrong value. That exact bug has shipped twice in this repo.
      const [
        ids,
        searches,
        inquiries,
        cur,
        mode,
        viewed,
        fxCached,
        dutyCached,
        makesCached,
        languageCached,
      ] = await Promise.all([
        getJSON('savedCarIds'),
        getJSON('savedSearches'),
        getJSON('rentalInquiries'),
        getJSON('currency'),
        getJSON('homeMode'),
        getJSON('recentlyViewedIds'),
        getJSON('fxRate'),
        getJSON('dutyRates'),
        getJSON('vehicleMakes'),
        getJSON('language'),
      ]);
      if (ids) setSavedCarIds(ids);
      if (searches) setSavedSearches(searches);
      if (inquiries) setRentalInquiries(inquiries);
      if (mode) setHomeMode(mode);
      if (viewed) setRecentlyViewedIds(viewed);
      if (languageCached) setLanguageState(normalizeLanguage(languageCached));
      // Last known exchange rate first (offline starts format correctly),
      // then the live one. Both best-effort: a rate is a display aid and must
      // never delay or break boot.
      // setRwfRate keeps the module binding in step for the calculators that
      // read it directly; setFx is what actually moves a price on screen, since
      // a module variable cannot re-render anything. Both, every time.
      if (fxCached?.rate) {
        setRwfRate(fxCached.rate);
        setFx({
          rate: fxCached.rate,
          source: fxCached.source || 'cached',
          fetched_at: fxCached.fetched_at || null,
          // A cached rate of unknown age is exactly what "stale" is for.
          stale: true,
        });
      }
      api.get('/fx')
        .then((fx) => {
          if (fx?.rate) {
            setRwfRate(fx.rate);
            setFx({
              rate: fx.rate,
              source: fx.source || 'unknown',
              fetched_at: fx.fetched_at || null,
              stale: Boolean(fx.stale),
            });
            setJSON('fxRate', { rate: fx.rate, source: fx.source, fetched_at: fx.fetched_at });
          }
        })
        .catch(() => {});

      // The import duty schedule, on exactly the same footing: cached copy
      // first so an offline start still calculates, then the live one. It
      // matters more here than on the web — a shipped build cannot be corrected
      // by a deploy, so a wrong rate would live in people's pockets until they
      // updated. Best-effort throughout; marketData keeps the reviewed
      // fallback and boot never waits on this.
      if (dutyCached) setDutyRates(dutyCached);
      api.get('/settings/duty-rates')
        .then((rates) => {
          if (rates?.excise_brackets?.length) {
            setDutyRates(rates);
            setJSON('dutyRates', rates);
          }
        })
        .catch(() => {});

      // The brand list, cached the same way. It used to be a 20-item array
      // frozen inside two screens — with no Chinese marque on it while the
      // catalogue already held three — so a seller with a BYD had to pick the
      // nearest wrong answer. Serving it means the list widens without a
      // release. Cached copy first so an offline submission still offers
      // brands, then the live one.
      if (Array.isArray(makesCached) && makesCached.length) setMakes(makesCached);
      makesApi.getMakes()
        .then((rows) => {
          if (Array.isArray(rows) && rows.length) {
            setMakes(rows);
            setJSON('vehicleMakes', rows);
          }
        })
        .catch(() => {});
      setHydrated(true);
    })();
  }, []);
  useEffect(() => { if (hydrated) setJSON('savedCarIds', savedCarIds); }, [savedCarIds, hydrated]);
  useEffect(() => { if (hydrated) setJSON('savedSearches', savedSearches); }, [savedSearches, hydrated]);
  useEffect(() => { if (hydrated && DEMO_MODE) setJSON('rentalInquiries', rentalInquiries); }, [rentalInquiries, hydrated]);
  useEffect(() => { if (hydrated) setJSON('homeMode', homeMode); }, [homeMode, hydrated]);
  useEffect(() => { if (hydrated) setJSON('recentlyViewedIds', recentlyViewedIds); }, [recentlyViewedIds, hydrated]);

  // --- Mappers to bridge Backend schema to Mobile UI keys ---

  const mapCar = useCallback((c) => {
    // Price history arrives as [{ price, at }, …]; the sparkline wants numbers.
    const priceHistory = Array.isArray(c.price_history)
      ? c.price_history.map((p) => Number(p.price)).filter(Number.isFinite)
      : null;

    return {
      id: c.id,
      title: c.title,
      sellerPhone: c.seller_phone || null,
      sellerWhatsApp: c.seller_whatsapp || null,
      sellerContactAvailable: c.seller_contact_available || { phone: false, whatsapp: false, in_app: true },
      directDealNotice: c.direct_deal_notice || '',
      // The seller's user id — what SellerProfile/TrustScore need to fetch the
      // real trust breakdown instead of falling back to a canned profile.
      sellerId: c.seller_id || null,
      make: c.make,
      model: c.model,
      year: c.year,
      price: c.price,
      // Market intelligence computed server-side from real comparables —
      // these replace the hardcoded demo tables in data/marketData.js.
      belowMarket: c.below_market || 0,
      marketAvg: Number.isFinite(c.market_avg) ? c.market_avg : null,
      marketDiff: Number.isFinite(c.market_diff) ? c.market_diff : null,
      comparables: c.comparables || 0,
      listedDays: Number.isFinite(c.listed_days) ? c.listed_days : null,
      priceHistory: priceHistory && priceHistory.length > 1 ? priceHistory : null,
      mileage: c.mileage,
      fuel: c.fuel_type || 'Petrol',
      transmission: c.transmission || 'Automatic',
      category: c.body_type || 'SUV',
      seller: c.seller_name || 'Verified Seller',
      // The seller's trust score as the server computed it, 0-100, or null.
      //
      // This used to be `seller_trust / 20` rendered as a star rating, with
      // '4.5' substituted when the server sent nothing. Both directions were
      // wrong. POST /reviews is retired, so the review component of the score
      // is permanently zero and 4.0 stars was the highest anyone could ever
      // reach; a genuine ID-verified seller with no completed sales scores
      // 30 + 0 + 20 + 0 = 50 and was shown to buyers as "★ 2.5". Meanwhile a
      // seller the server knew nothing about was awarded a flattering 4.5.
      // A star is a claim about other people's experience; nobody has had one
      // yet, so the app states what is actually verified instead.
      sellerTrust: Number.isFinite(c.seller_trust) ? c.seller_trust : null,
      sellerIdVerified: c.seller_id_verified === 'approved',
      sellerBusinessVerified: c.seller_business_verified === true,
      inspected: !!c.inspected,
      inspectionScore: c.inspection_score,
      type: 'sale',
      image: c.images?.[0] || DEFAULT_CAR_IMAGE,
      images: c.images && c.images.length ? c.images : DEFAULT_CAR_IMAGES,
      location: c.location || 'Kigali',
      drive_side: c.drive_side || 'RHD',
      // saves_count is the live COUNT from saved_cars; cars.saves is a cached
      // column that drifts, so prefer the count when the API sends it.
      saves: Number.isFinite(c.saves_count) ? c.saves_count : (c.saves || 0),
      views: c.views || 0,
      status: c.status,
      description: c.description || '',
      vin: c.vin || '',
    };
  }, []);

  const mapSubmission = useCallback((sub) => {
    const dateStr = sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    // Backend columns are inspection_center / inspection_date / inspection_time
    const center = sub.inspection_center || sub.center || null;
    const inspectionWhen = [sub.inspection_date, sub.inspection_time].filter(Boolean).join(' · ');

    let detail = 'Our team is reviewing your submission';
    if (sub.status === 'approved') {
      detail = 'Approved — book your inspection at any Sawa center';
    } else if (sub.status === 'scheduled') {
      detail = `Inspection: ${inspectionWhen || 'booked'}${center ? ` · ${center}` : ''}`;
    } else if (sub.status === 'live') {
      detail = 'Active listing live on marketplace';
    } else if (sub.status === 'rejected') {
      detail = `Submission not accepted: ${sub.admin_notes || 'Contact support'}`;
    }

    return {
      id: sub.id,
      carTitle: `${sub.year} ${sub.make} ${sub.model}`,
      make: sub.make,
      model: sub.model,
      year: sub.year,
      mileage: sub.mileage,
      askingPrice: sub.asking_price,
      submittedDate: dateStr,
      status: sub.status,
      image: sub.car_images?.[0] || sub.reference_images?.[0] || STUDIO.heroSedan,
      inspectionDate: inspectionWhen || null,
      center,
      listingId: sub.car_id,
      statusDetail: detail,
    };
  }, []);

  const mapNotification = useCallback((n) => {
    const dateObj = new Date(n.created_at);
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      time: timeStr,
      date: dateStr,
      read: n.read,
      meta: n.meta,
    };
  }, []);

  const mapConversation = useCallback((conv) => {
    const isBuyer = conv.buyer_id === currentUser?.id;
    const otherName = isBuyer ? conv.seller_name : conv.buyer_name;
    const lastTime = conv.last_message_at ? new Date(conv.last_message_at) : new Date(conv.created_at);
    const timeStr = lastTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return {
      id: conv.id,
      name: otherName || 'Sawa User',
      last: conv.last_message || 'No messages yet',
      time: timeStr,
      unread: parseInt(conv.unread_count || 0),
      avatar: (otherName || 'I')[0].toUpperCase(),
      // The other participant's user id — what Block needs.
      otherId: isBuyer ? conv.seller_id : conv.buyer_id,
      // No presence system exists yet — a hardcoded green "online" dot on
      // every user was a small lie a trust-first brand can't afford.
      online: false,
      carId: conv.car_id,
      // LEFT JOIN server-side: a removed car no longer erases the thread,
      // it just loses its title.
      carTitle: conv.car_title || (conv.car_id ? conv.car_title : 'Listing removed'),
      carImage: conv.car_images?.[0] || null,
    };
  }, [currentUser?.id]);

  // Fetch cars from the API; fall back to bundled demo data when the backend
  // is unreachable or has no listings yet (backend deployment is Phase 6A).
  const fetchCars = useCallback(async () => {
    try {
      const carList = await carsApi.getCars();
      setBackendReachable(true);
      // An empty catalogue is a true answer, not a failure. Only DEMO_MODE is
      // allowed to substitute fixtures for it.
      if (carList && carList.length) return carList.map(mapCar);
      if (DEMO_MODE) {
        console.warn('Cars API returned no listings — using bundled demo data');
        return mockCars;
      }
      return NONE;
    } catch (err) {
      if (err?.isNetworkError) setBackendReachable(false);
      if (DEMO_MODE) {
        console.warn('Cars API unreachable — using bundled demo data:', err.message);
        return mockCars;
      }
      // Release build: an unreachable marketplace shows as unreachable.
      console.warn('Cars API unreachable:', err.message);
      return NONE;
    }
  }, [mapCar]);

  // Server-side search. The database does the filtering, sorting and paging;
  // the app only renders. Returns { items, exhausted } on success, or null when
  // the backend is unreachable so the caller can fall back to the local set.
  const PAGE_SIZE = 20;
  const searchCars = useCallback(async ({ query, filters, sort, offset = 0 } = {}) => {
    const params = { limit: PAGE_SIZE, offset };

    if (query?.trim()) params.q = query.trim();
    if (filters?.make) params.make = filters.make;
    if (filters?.body) params.body_type = filters.body;
    if (filters?.fuel) params.fuel_type = filters.fuel;
    if (filters?.transmission) params.transmission = filters.transmission;
    if (filters?.driveSide) params.drive_side = filters.driveSide;
    if (filters?.location) params.location = filters.location;
    if (filters?.minPrice) params.min_price = filters.minPrice;
    if (filters?.maxPrice) params.max_price = filters.maxPrice;
    if (filters?.minYear) params.min_year = filters.minYear;
    if (filters?.maxYear) params.max_year = filters.maxYear;

    // Only these columns are whitelisted server-side; anything else is ignored
    const SORTS = {
      'Price ↑': { sort: 'price', order: 'asc' },
      'Price ↓': { sort: 'price', order: 'desc' },
      'Mileage': { sort: 'mileage', order: 'asc' },
      'Newest': { sort: 'year', order: 'desc' },
      'Best match': { sort: 'listed_at', order: 'desc' },
    };
    Object.assign(params, SORTS[sort] || SORTS['Best match']);

    try {
      const rows = await carsApi.getCars(params);
      return { items: rows.map(mapCar), exhausted: rows.length < PAGE_SIZE };
    } catch (err) {
      console.warn('Search API unreachable — filtering the local set:', err.message);
      return null;
    }
  }, [mapCar]);

  // Full detail for one listing — price history, seller phone, market position,
  // and the server-side view counter. Returns null when unavailable so callers
  // keep rendering whatever they already had.
  const fetchCarDetail = useCallback(async (id) => {
    if (!id || !String(id).includes('-')) return null; // demo ids aren't on the server
    try {
      return mapCar(await carsApi.getCar(id));
    } catch (err) {
      console.warn('Car detail unreachable — keeping list data:', err.message);
      return null;
    }
  }, [mapCar]);

  // Rental fleet: API rows -> mobile shape. Availability is confirmed by the
  // provider after an inquiry; the platform does not reserve dates.
  const mapRentalCar = useCallback((rc) => {
    return {
      id: rc.id, title: rc.title, make: rc.make, model: rc.model, year: rc.year,
      category: rc.category, seats: rc.seats, fuel: rc.fuel, transmission: rc.transmission,
      mileage: rc.mileage, listingType: 'rental',
      dailyRate: rc.daily_rate, weeklyRate: rc.weekly_rate, deposit: rc.deposit,
      currency: rc.currency || 'RWF',
      minDays: rc.min_days, inspected: rc.inspected, inspectionScore: rc.inspection_score,
      rating: Number(rc.rating) || 0, trips: rc.trips, location: rc.location,
      image: rc.images?.[0] || null, images: rc.images || [],
      safariReady: !!rc.safari_ready,
      unavailableUntil: rc.unavailable_until || null,
      providerId: rc.provider_id || null,
      providerName: rc.provider_business_name || rc.provider_name || 'Verified rental provider',
      providerContactAvailable: rc.provider_contact_available || { phone: false, whatsapp: false, in_app: true },
      directDealNotice: rc.direct_deal_notice || '',
    };
  }, []);

  const mapRentalInquiry = useCallback((b) => ({
    id: b.id,
    inquiryRef: b.inquiry_ref,
    carId: b.rental_car_id,
    carTitle: b.car_title,
    carImage: b.car_images?.[0] || null,
    startDate: b.start_date,
    days: b.days,
    pickupLocation: b.pickup_location,
    message: b.message,
    preferredChannel: b.preferred_channel,
    providerName: b.provider_business_name || b.provider_name || 'Rental provider',
    status: b.status,
    createdAt: b.created_at,
  }), []);

  const mapAdminInspection = useCallback((inspection) => {
    const rawDate = inspection.scheduled_at || inspection.scheduled_date || null;
    const when = rawDate ? new Date(rawDate) : null;
    const validWhen = when && !Number.isNaN(when.getTime());
    const todayKey = new Date().toLocaleDateString('en-CA');
    const dateKey = validWhen ? when.toLocaleDateString('en-CA') : '';
    const displayTime = validWhen
      ? when.toLocaleString('en-US', { month: dateKey === todayKey ? undefined : 'short', day: dateKey === todayKey ? undefined : 'numeric', hour: 'numeric', minute: '2-digit' })
      : [inspection.scheduled_date, inspection.scheduled_time].filter(Boolean).join(' · ') || 'Time not set';
    return {
      ...inspection,
      seller: inspection.seller_name || 'Seller',
      car: inspection.car_title || [inspection.year, inspection.make, inspection.model].filter(Boolean).join(' ') || 'Vehicle pending listing',
      time: dateKey === todayKey ? `Today · ${displayTime}` : displayTime,
      center: inspection.center || 'Center not set',
      status: dateKey === todayKey ? 'today' : 'upcoming',
      workflowStatus: inspection.status,
      car_id: inspection.car_id || null,
    };
  }, []);

  const fetchRentalCars = useCallback(async () => {
    try {
      const list = await rentalsApi.getRentalCars();
      if (list && list.length) return list.map(mapRentalCar);
      return DEMO_MODE ? RENTAL_CARS : NONE;
    } catch (err) {
      if (err?.isNetworkError) setBackendReachable(false);
      console.warn('Rentals API unreachable:', err.message);
      return DEMO_MODE ? RENTAL_CARS : NONE;
    }
  }, [mapRentalCar]);

  // --- Initial Data Loader ---

  // Each section loads independently and reports its own failure.
  //
  // This was one try/catch wrapped around eight sequential awaits: if the first
  // call threw — a 500 on one malformed id was enough — the remaining seven were
  // skipped, and the user was shown empty Saved, Messages and Notifications
  // screens with no indication that anything had gone wrong. It also serialised
  // six independent round trips that have no reason to wait on each other.
  const loadSection = useCallback(async (label, run) => {
    try {
      await run();
      return true;
    } catch (err) {
      // A section that fails leaves its previous state alone rather than
      // clearing it — stale data beats a blank screen that implies emptiness.
      console.warn(`Could not load ${label}:`, err?.message || err);
      if (err?.isNetworkError) setBackendReachable(false);
      return false;
    }
  }, []);

  const loadInitialData = useCallback(async (user) => {
    setCars(await fetchCars());
    setRentalCars(await fetchRentalCars());
    if (!user) return;

    const sections = [
      ['your rental inquiries', async () => {
        const mine = await rentalsApi.getMyInquiries();
        setRentalInquiries(mine.map(mapRentalInquiry));
      }],
      ['saved cars', async () => {
        const wishList = await carsApi.getSavedCars();
        setSavedCarIds(wishList.map((c) => c.id));
      }],
      // Admins get the whole pipeline instead (added below). Only one of the
      // two ever runs: with both in a concurrent batch they would race to
      // setSubmissions and the winner would be whichever request returned
      // first — the old sequential code got the right answer by accident.
      ...(user.role === 'admin' ? [] : [['your submissions', async () => {
        const subList = await submissionsApi.getSubmissions();
        setSubmissions(subList.map(mapSubmission));
      }]]),
      ['conversations', async () => {
        const convList = await messagesApi.getConversations();
        setConversations(convList.map(mapConversation));
      }],
      ['notifications', async () => {
        const notifList = await notificationsApi.getNotifications();
        setNotifications(notifList.map(mapNotification));
      }],
      ['saved searches', async () => {
        const searchList = await carsApi.getSavedSearches();
        setSavedSearches(searchList.map((s) => ({
          id: s.id,
          label: s.label,
          notifyEnabled: s.notify_enabled,
          make: s.filters?.make,
          model: s.filters?.model,
          category: s.filters?.category,
          maxPrice: s.filters?.maxPrice || s.filters?.max_price,
          maxMileage: s.filters?.maxMileage || s.filters?.max_mileage,
        })));
      }],
    ];

    if (user.role === 'admin') {
      sections.push(
        ['the submission pipeline', async () => {
          const adminSubs = await submissionsApi.getAdminSubmissions();
          setSubmissions(adminSubs.map(mapSubmission));
        }],
        ['the ID verification queue', async () => {
          const queueList = await api.get('/id-verification/queue');
          setPendingVerifications(queueList.map((v) => ({
            id: v.id,
            name: v.name,
            initials: String(v.name || '').split(' ').map((w) => w[0]).join('').toUpperCase(),
            submitted: v.id_submitted_at
              ? new Date(v.id_submitted_at).toLocaleDateString('en-US')
              : '—',
            status: v.id_verified,
          })));
        }],
        ['the inspection queue', async () => {
          const inspectionList = await inspectionsApi.list();
          setAdminInspections(inspectionList
            .filter((inspection) => ['scheduled', 'in_progress'].includes(inspection.status))
            .map(mapAdminInspection));
        }],
      );
    }

    // Concurrent, and no rejection can escape: loadSection resolves either way.
    await Promise.all(sections.map(([label, run]) => loadSection(label, run)));
  }, [fetchCars, fetchRentalCars, loadSection, mapRentalInquiry, mapSubmission,
      mapConversation, mapNotification, mapAdminInspection]);

  // ─── Refresh, on demand ─────────────────────────────────────────────────────
  // The catalogue was fetched exactly once, inside the mount-once effect below,
  // and there was no way to ask for it again: no pull-to-refresh, no refetch on
  // focus, and the single line that sets backendReachable back to true lives
  // inside the fetch that never ran twice.
  //
  // On Rwandan mobile data a first request failing is routine, not exceptional,
  // and it cost the whole session — an empty marketplace under a notice
  // promising listings "as soon as we're back", and the gesture every phone
  // user reaches for first doing nothing at all.
  //
  // Total by construction: fetchCars already resolves rather than rejecting on
  // a network failure, so a refresh can be wired straight to a RefreshControl
  // without a try/catch at every call site.
  const [refreshing, setRefreshing] = useState(false);
  const refreshCatalogue = useCallback(async () => {
    setRefreshing(true);
    try {
      const [nextCars, nextRentals] = await Promise.all([fetchCars(), fetchRentalCars()]);
      setCars(nextCars);
      setRentalCars(nextRentals);
      // A signed-in person's own rows — saved cars, messages, submissions — are
      // reloaded too, because the commonest reason to pull is "I did something
      // on another device" or "the first load failed and I lost my saved list".
      if (isLoggedIn && currentUser?.id) await loadInitialData(currentUser);
    } finally {
      setRefreshing(false);
    }
  }, [fetchCars, fetchRentalCars, isLoggedIn, currentUser, loadInitialData]);

  // Restore the session on startup.
  //
  // The token outlives the process — src/api/client.js only clears the keychain
  // on SESSION_EXPIRED or SESSION_REVOKED, so a wrong password or a dropped
  // connection never signs anyone out. But the PROFILE was fetched fresh on
  // every launch and nothing was cached, so a getMe() that failed on a weak
  // connection left a perfectly valid session rendering as signed out until the
  // next restart: no saved cars, no messages, a "Sign in" button on Profile.
  //
  // So: hydrate from the last known profile immediately, then reconcile with
  // the server. A network failure now costs a slightly stale name, not the
  // session. Only an actual auth answer signs anybody out, and that is the
  // client's job (it clears the keychain), not this effect's.
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await getToken();
        if (token) {
          const cached = await getJSON('cachedProfile', null);
          if (cached?.id) {
            setCurrentUser(withInitials(cached));
            setIsLoggedIn(true);
          }
          const me = await authApi.getMe();
          setCurrentUser(withInitials(me));
          setIsLoggedIn(true);
          setJSON('cachedProfile', me);
          await loadInitialData(me);
        } else {
          setCars(await fetchCars());
          setRentalCars(await fetchRentalCars());
        }
      } catch (err) {
        // A dropped connection is not a logout. The optimistic session from the
        // cached profile stands, and the catalogue below is what a signed-out
        // browse would show anyway — pull-to-refresh retries the rest.
        //
        // Anything that is NOT a network failure is the server's answer about
        // this token, so the optimistic session has to be given back. The API
        // client has already cleared the keychain by this point on an expired or
        // revoked session; leaving isLoggedIn true would show a signed-in shell
        // over a session that no longer exists.
        if (!err?.isNetworkError) {
          setCurrentUser(SIGNED_OUT_USER);
          setIsLoggedIn(false);
          setJSON('cachedProfile', null);
        }
        console.warn('Initial auth setup failed, falling back to public data:', err);
        setCars(await fetchCars());
        setRentalCars(await fetchRentalCars());
      }
    };
    initAuth();
  }, [loadInitialData, fetchCars]);

  // Register this device for push once we know who is signed in. The server
  // keys tokens to the user, so this has to run after auth, not at boot.
  //
  // prompt: false — this effect fired the OS permission dialog the instant
  // "Create account" succeeded, before the user had a message, a saved car or
  // any reason to say yes. That dialog is one-shot (a decline is near-permanent
  // on iOS), so sign-in only SYNCS a permission that already exists; the ASK
  // happens at the first moment notifications have visible value — saving a
  // car (maybeAskForPush) or the Settings toggle.
  useEffect(() => {
    if (!isLoggedIn) return;
    let alive = true;
    // Respect the Settings toggle: a user who turned push off must stay off
    // across restarts — a control that silently re-enables itself is exactly
    // the kind of thing a Play data-safety complaint is made of.
    getJSON('pushEnabled', true).then((enabled) => {
      if (!alive || !enabled) return;
      syncPushToken({ prompt: false }).then((token) => { if (alive && token) setPushToken(token); });
    });
    return () => { alive = false; };
  }, [isLoggedIn]);

  // The one-time contextual ask. Called from the first user action that push
  // notifications visibly serve (saving a car — "we'll tell you when the price
  // drops"). Asks once ever; after that the Settings toggle owns the choice.
  const maybeAskForPush = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const asked = await getJSON('pushAsked', false);
      if (asked) return;
      await setJSON('pushAsked', true);
      const enabled = await getJSON('pushEnabled', true);
      if (!enabled) return;
      const token = await syncPushToken();
      if (token) setPushToken(token);
    } catch (err) {
      console.warn('Push ask skipped:', err?.message);
    }
  }, [isLoggedIn]);

  // The Settings screen's push toggle. Off = the server forgets this device
  // immediately; on = re-register (which may re-prompt for OS permission).
  const setPushEnabled = useCallback(async (enabled) => {
    await setJSON('pushEnabled', enabled);
    if (enabled) {
      const token = await syncPushToken();
      setPushToken(token);
      return !!token;
    }
    await unregisterPushToken(pushToken);
    setPushToken(null);
    return true;
  }, [pushToken]);

  // Connect Socket.io client on login.
  // The teardown MUST be returned from the effect itself, not from inside the
  // getToken().then() — a cleanup returned to a Promise is invisible to React,
  // which is how re-logins used to stack a second live socket on the first.
  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      setSocket((prev) => {
        if (prev) prev.disconnect();
        return null;
      });
      return undefined;
    }

    let cancelled = false;
    let liveSocket = null;

    getToken().then((token) => {
      if (!token || cancelled) return;
      const newSocket = io(BASE_URL, {
        auth: { token },
      });
      liveSocket = newSocket;

        // A rejected handshake (expired JWT, server down) is otherwise
        // invisible — chat just silently stops being realtime.
        newSocket.on('connect_error', (err) => {
          console.warn('Socket connection failed:', err?.message);
        });

        // Socket.io reconnects by itself, but server-side room membership is
        // lost with the old connection — re-join the thread that's open so
        // typing indicators survive a reconnect.
        newSocket.on('connect', () => {
          if (activeConvRef.current) {
            newSocket.emit('join_conversation', activeConvRef.current);
          }
        });

        newSocket.on('new_message', (message) => {
          setChatMessages((prev) => {
            const thread = prev[message.conversation_id] || [];
            if (thread.some((m) => m.id === message.id)) return prev;

            const isMe = message.sender_id === currentUser.id;
            const timeStr = new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

            return {
              ...prev,
              [message.conversation_id]: [
                ...thread,
                {
                  id: message.id,
                  me: isMe,
                  text: message.text,
                  time: timeStr,
                  sender_name: message.sender_name,
                }
              ]
            };
          });

          // Update the conversation list. Unread only grows for a message from
          // the OTHER party in a thread that is NOT currently open (otherwise
          // the badge over-counts while you are literally reading it). The
          // touched thread also moves to the top, so the list orders by recency
          // like the server does — without waiting for a refetch.
          const isMe = message.sender_id === currentUser.id;
          const isOpenThread = activeConvRef.current === message.conversation_id;
          const timeStr = new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === message.conversation_id);
            if (idx === -1) {
              // A thread we don't have yet — someone messaged us for the first
              // time. Pull the authoritative list so it arrives with full car
              // context, and (for an incoming message) drop in an instant row
              // so it shows immediately instead of only after the round-trip.
              messagesApi.getConversations()
                .then((list) => setConversations(list.map(mapConversation)))
                .catch(() => {});
              if (isMe) return prev;
              return [
                {
                  id: message.conversation_id,
                  name: message.sender_name || 'Sawa User',
                  last: message.text,
                  time: timeStr,
                  unread: isOpenThread ? 0 : 1,
                  avatar: (message.sender_name || 'S')[0].toUpperCase(),
                  otherId: message.sender_id,
                  online: false,
                  carId: null,
                  carTitle: null,
                  carImage: null,
                },
                ...prev,
              ];
            }
            const updated = {
              ...prev[idx],
              last: message.text,
              time: timeStr,
              unread: !isMe && !isOpenThread ? (prev[idx].unread || 0) + 1 : prev[idx].unread,
            };
            // Move the touched thread to the top; keep the rest in order.
            return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
          });
        });

        // Live notifications: a price drop, a saved-search match, an account or
        // import update, or a new message all arrive here the instant the server
        // writes the row, so the bell and Notification Center update on every
        // signed-in device without a refresh. Deduped by id in case a refetch
        // and the socket race.
        newSocket.on('notification', (n) => {
          setNotifications((prev) => {
            if (prev.some((x) => x.id === n.id)) return prev;
            return [mapNotification(n), ...prev];
          });
        });

        // Typing indicator: track which conversation the other party is typing in
        newSocket.on('user_typing', ({ conversationId }) => {
          setTypingConvId(conversationId);
        });
        newSocket.on('user_stop_typing', () => {
          setTypingConvId(null);
        });

        setSocket(newSocket);
      });

    return () => {
      cancelled = true;
      if (liveSocket) liveSocket.disconnect();
      setSocket((prev) => (prev === liveSocket ? null : prev));
    };
    // mapConversation is memoised on currentUser?.id, which is already a dep,
    // and mapNotification is stable — neither adds a socket reconnect.
  }, [isLoggedIn, currentUser?.id, mapConversation, mapNotification]);

  // --- Auth operations ---

  // True when the failure is connectivity (backend not deployed), not a rejected
  // credential. The client tags transport failures explicitly; the message test
  // stays as a fallback for errors thrown outside the client wrapper.
  const isNetworkError = (err) =>
    err?.isNetworkError === true ||
    (err?.status === undefined && /fetch|network|timeout|abort/i.test(err?.message || ''));

  const loginUser = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login(email, password);
      const user = data.user;
      // withInitials, not a bare .split: a server response without a name
      // must not crash the sign-in it just succeeded at.
      setCurrentUser(withInitials(user));
      setIsLoggedIn(true);
      setJSON('cachedProfile', user);
      await loadInitialData(user);
    } catch (err) {
      // A release build NEVER grants a session the server did not issue. Signing
      // someone in against credentials nothing verified is an authentication
      // bypass in everything but name, and it hands them an account-shaped UI
      // whose every write silently goes nowhere.
      if (DEMO_MODE && isNetworkError(err)) {
        const name = email.split('@')[0].replace(/[._]/g, ' ') || 'Demo User';
        setCurrentUser({
          ...DEFAULT_USER,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          email,
          initials: name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2),
        });
        setIsLoggedIn(true);
        return;
      }
      if (isNetworkError(err)) {
        setBackendReachable(false);
        const offline = new Error("We couldn't reach Sawa Cars. Check your connection and try again.");
        offline.isNetworkError = true;
        setError(offline.message);
        throw offline;
      }
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadInitialData]);

  // Local demo session — no API round-trip, no real account behind it.
  // DEMO_MODE only: outside it this would present a stranger's name and email
  // ("Alex Morgan") to the user as their own profile, and mark them signed in
  // for writes that reach nobody. Callers hide the entry point via `demoMode`.
  const loginAsGuest = useCallback(() => {
    if (!DEMO_MODE) return false;
    setCurrentUser(DEFAULT_USER);
    setIsLoggedIn(true);
    return true;
  }, []);

  const signUpUser = useCallback(async (name, email, password, role = 'buyer', phone) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.register(name, email, password, role, phone);
      const user = data.user;
      setCurrentUser(withInitials(user));
      setIsLoggedIn(true);
      setJSON('cachedProfile', user);
      await loadInitialData(user);
    } catch (err) {
      // Same rule as sign-in: no server, no account. Pretending otherwise would
      // let someone "register" an email that was never reserved for them.
      if (DEMO_MODE && isNetworkError(err)) {
        setCurrentUser({
          ...DEFAULT_USER,
          name,
          email,
          initials: name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2),
          id_verified: 'none',
        });
        setIsLoggedIn(true);
        return;
      }
      if (isNetworkError(err)) {
        setBackendReachable(false);
        const offline = new Error("We couldn't reach Sawa Cars. Check your connection and try again.");
        offline.isNetworkError = true;
        setError(offline.message);
        throw offline;
      }
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadInitialData]);

  const logoutUser = useCallback(async () => {
    // Drop the push token BEFORE the auth token — the delete needs the JWT,
    // and a shared handset must stop receiving the previous user's alerts.
    await unregisterPushToken(pushToken);
    setPushToken(null);
    try { await authApi.logout(); } catch {}
    // The cached profile is what the next launch restores from. Leaving it
    // behind would sign the handset's previous user back in on the next start.
    setJSON('cachedProfile', null);
    setCurrentUser(SIGNED_OUT_USER);
    setIsLoggedIn(false);
    setSavedCarIds([]);
    setSubmissions(demo(INITIAL_SUBMISSIONS));
    setRentalInquiries([]);
    setNotifications(demo(INITIAL_NOTIFICATIONS || []));
    setConversations(demo(initialConversations || []));
    setSavedSearches(demo(INITIAL_SAVED_SEARCHES));
  }, [pushToken]);

  // Permanent account deletion (Apple 5.1.1(v) / Google Play). Errors propagate
  // so the screen can distinguish authentication, network and server failures.
  // Only on success is local state torn down, and it is torn down completely:
  // leaving a deleted user's saved cars in AsyncStorage would resurrect them on
  // the next sign-in on this handset.
  const deleteAccount = useCallback(async (password, reason, note) => {
    await unregisterPushToken(pushToken);
    const result = await authApi.closeAccount(password, reason, note);
    setPushToken(null);
    setCurrentUser(SIGNED_OUT_USER);
    setIsLoggedIn(false);
    setSavedCarIds([]);
    setSubmissions(demo(INITIAL_SUBMISSIONS));
    setNotifications(demo(INITIAL_NOTIFICATIONS || []));
    setConversations(demo(initialConversations || []));
    setChatMessages(DEMO_MODE ? INITIAL_MESSAGES : {});
    setSavedSearches(demo(INITIAL_SAVED_SEARCHES));
    setRentalInquiries([]);
    setRecentlyViewedIds([]);
    await Promise.all([
      setJSON('savedCarIds', []),
      setJSON('savedSearches', []),
      setJSON('rentalInquiries', []),
      setJSON('recentlyViewedIds', []),
      setJSON('cachedProfile', null),
    ]);
    // The reopen date, which the confirmation screen shows and the confirmation
    // email repeats. A recovery window nobody is told about is a database
    // column, not a feature.
    return result;
  }, [pushToken]);

  // Take a closed account back, inside its thirty days. Deliberately its own
  // call rather than a flag on loginUser: reopening is a decision somebody
  // makes on a screen that explains it, not something a sign-in should do
  // silently because the password happened to be right.
  const reopenAccount = useCallback(async (email, password) => {
    const data = await authApi.reopenAccount(email, password);
    const user = data.user;
    setCurrentUser(withInitials(user));
    setIsLoggedIn(true);
    setJSON('cachedProfile', user);
    await loadInitialData(user);
    return user;
  }, [loadInitialData]);

  const updateCurrentUserProfile = useCallback(async (fields) => {
    const updated = await authApi.updateProfile(fields);
    setCurrentUser(withInitials(updated));
    setJSON('cachedProfile', updated);
    return updated;
  }, []);

  // --- Car wishlisting / bookmarking ---

  const toggleSaveCar = useCallback((id) => {
    // Local-first so the heart always responds; sync to API in the background when possible
    const saving = !savedCarIds.includes(id);
    setSavedCarIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    if (isLoggedIn) {
      carsApi.saveCar(id).catch(() => {}); // backend optional in demo
    }
    // Saving is the moment push has an obvious payoff (price-drop alerts on
    // this exact car) — the right moment to ask, once.
    if (saving) maybeAskForPush();
  }, [isLoggedIn, savedCarIds, maybeAskForPush]);

  const isCarSaved = useCallback((id) => savedCarIds.includes(id), [savedCarIds]);
  const getSavedCars = useCallback(
    () => [...cars, ...rentalCars].filter((c) => savedCarIds.includes(c.id)),
    [cars, rentalCars, savedCarIds]
  );

  // --- Seller listings (legacy fallback) ---

  // --- ID Verification uploads ---

  // docs: { front, back, selfie } — assets from captureImage(), uploaded as
  // real multipart files. A 4xx is a genuine rejection and must reach the user;
  // only an unreachable backend falls back to the local demo state.
  const submitIDVerification = useCallback(async (docs) => {
    setLoading(true);
    try {
      await authApi.submitIdVerification(docs);
      const me = await authApi.getMe();
      setCurrentUser(withInitials(me));
      setJSON('cachedProfile', me);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      // Claiming "under review" for documents that never left the handset would
      // leave the seller waiting on a queue they are not in.
      if (!DEMO_MODE) throw err;
      console.warn('ID verification API unreachable — marking pending locally:', err.message);
      setCurrentUser((prev) => (prev ? { ...prev, id_verified: 'pending' } : null));
    } finally {
      setLoading(false);
    }
  }, []);

  const approveIDVerification = useCallback(() => {
    // legacy client mock trigger
  }, []);
  const rejectIDVerification = useCallback(() => {
    // legacy client mock trigger
  }, []);

  // --- Car Submissions ---

  const addSubmission = useCallback(async (data) => {
    setLoading(true);
    try {
      const mapped = {
        make: data.make,
        model: data.model,
        year: parseInt(data.year),
        mileage: parseInt(data.mileage),
        condition: data.condition,
        fuel_type: data.fuelType || data.fuel_type,
        transmission: data.transmission,
        body_type: data.bodyType || data.body_type,
        color: data.color,
        asking_price: parseInt(data.askingPrice || data.asking_price),
        notes: data.notes,
        accident_notes: data.accidentNotes,
        service_history: data.serviceHistory,
        seller_notes: data.sellerNotes,
      };
      const res = await submissionsApi.createSubmission(mapped);

      // Refresh list
      const list = await submissionsApi.getSubmissions();
      setSubmissions(list.map(mapSubmission));

      return res.id;
    } catch (err) {
      // A rejection is an answer, not an outage — an unverified seller must
      // never end up with a phantom local submission the server never accepted.
      // In a release build an outage is not an excuse for one either: the car
      // would sit in a pipeline no Sawa operator can see.
      if (!isNetworkError(err) || !DEMO_MODE) throw err;
      console.warn('Submissions API unreachable — saving locally:', err.message);
      // Local fallback so the dashboard reflects what the seller just did
      const localSub = {
        id: 'sub' + Date.now(),
        carTitle: `${data.year} ${data.make} ${data.model}`.trim(),
        make: data.make,
        model: data.model,
        year: parseInt(data.year),
        mileage: parseInt(data.mileage) || 0,
        askingPrice: parseInt(data.askingPrice) || 0,
        condition: data.condition,
        fuelType: data.fuelType,
        transmission: data.transmission,
        bodyType: data.bodyType,
        color: data.color,
        notes: data.notes,
        accidentNotes: data.accidentNotes,
        serviceHistory: data.serviceHistory,
        sellerNotes: data.sellerNotes,
        photos: data.photos,
        submittedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'under_review',
        statusDetail: 'Book your inspection slot to continue',
        inspectionDate: null,
        center: null,
        listingId: null,
        image: data.image || STUDIO.suvSideStudio,
      };
      setSubmissions((prev) => [localSub, ...prev]);
      setNotifications((prev) => [{
        id: 'submit_' + Date.now(),
        type: 'listing_update',
        title: 'Submission received',
        body: `${localSub.carTitle} is in. Book your inspection slot to continue.`,
        time: 'Just now',
        date: 'Today',
        read: false,
      }, ...prev]);
      return localSub.id;
    } finally {
      setLoading(false);
    }
  }, [mapSubmission]);

  // Seller books an inspection slot — real API with local fallback
  const scheduleInspection = useCallback(async (id, { center, date, time }) => {
    try {
      await submissionsApi.scheduleInspection(id, { center, date, time });
      const list = await submissionsApi.getSubmissions();
      setSubmissions(list.map(mapSubmission));
    } catch (err) {
      // A slot nobody booked is a seller driving to a center that is not
      // expecting them — and it silently bypasses the capacity check.
      if (!DEMO_MODE) throw err;
      console.warn('Schedule API unreachable — updating locally:', err.message);
      setSubmissions((prev) =>
        prev.map((s) => s.id === id
          ? { ...s, status: 'scheduled', statusDetail: `Inspection: ${date} · ${time} · ${center}`, center }
          : s)
      );
    }
  }, [mapSubmission]);

  const updateSubmissionStatus = useCallback((id, status, detail = '') => {
    // Local-first so the admin UI responds instantly; sync to the API for
    // real (UUID) submissions — local demo ids just no-op server-side.
    setSubmissions((prev) =>
      prev.map((s) => s.id === id ? { ...s, status, statusDetail: detail } : s)
    );
    if (String(id).includes('-')) {
      submissionsApi.updateSubmissionStatus(id, { status, admin_notes: detail || undefined })
        .catch(() => {});
    }
  }, []);

  // Price change on a live listing — no status regression, listing stays live
  const updateSubmissionPrice = useCallback((id, newPrice) => {
    let carId;
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        carId = s.listingId;
        return { ...s, askingPrice: newPrice, statusDetail: 'Price updated — listing stays live' };
      })
    );
    // Sync to the seller price-edit route for real listings (records price
    // history + fires price-drop alerts server-side)
    if (carId && String(carId).includes('-')) {
      carsApi.updateCarPrice(carId, newPrice).catch(() => {});
    }
    setNotifications((prev) => [{
      id: 'price_' + Date.now(),
      type: 'listing_update',
      title: 'Listing price updated',
      body: `Your listing price was changed to $${Number(newPrice).toLocaleString()}. The listing remains live.`,
      time: 'Just now',
      date: 'Today',
      read: false,
    }, ...prev]);
  }, []);

  const relistSubmission = useCallback(async (id, newPrice) => {
    // Local relist update since backend does not support seller edit routes
    setSubmissions((prev) =>
      prev.map((s) => s.id === id
        ? { ...s, status: 'under_review', askingPrice: newPrice, isRelisted: true, statusDetail: 'Relisted — our team is reviewing your updated submission' }
        : s)
    );
    setNotifications((prev) => [{
      id: 'relist_' + Date.now(),
      type: 'listing_update',
      title: 'Car relisted for review',
      body: `Your car has been relisted at the new price. Our team will review within 24 hours.`,
      time: 'Just now',
      date: 'Today',
      read: false,
    }, ...prev]);
  }, []);

  // --- Admin ID verification overrides ---

  const adminApproveVerification = useCallback(async (verificationId) => {
    try {
      await api.patch(`/id-verification/${verificationId}`, { decision: 'approved' });
      setPendingVerifications((prev) =>
        prev.map((v) => v.id === verificationId ? { ...v, status: 'approved' } : v)
      );
    } catch (err) {
      console.warn('Error approving verification via Admin API:', err);
    }
  }, []);

  const adminRejectVerification = useCallback(async (verificationId) => {
    try {
      await api.patch(`/id-verification/${verificationId}`, { decision: 'rejected' });
      setPendingVerifications((prev) =>
        prev.map((v) => v.id === verificationId ? { ...v, status: 'rejected' } : v)
      );
    } catch (err) {
      console.warn('Error rejecting verification via Admin API:', err);
    }
  }, []);

  // --- Chat & Realtime Messaging ---

  const getOrCreateConversation = useCallback(async (carId, sellerId = null) => {
    try {
      const list = await messagesApi.getConversations();
      // Threads are per person now, not per car: there is one conversation with
      // a seller no matter which listing started it. Resolve by the other party
      // so returning to the same seller about a different car continues the same
      // thread instead of looking like a new one. (Falls back to the car match
      // only when no seller id is available.) If nothing is found the caller
      // gets a 'new_' sentinel and the server does the real find-or-create.
      const existing = sellerId
        ? list.find((c) => c.seller_id === sellerId && c.buyer_id === currentUser?.id)
        : list.find((c) => c.car_id === carId);
      if (existing) {
        return existing.id;
      }
      return 'new_' + carId;
    } catch (err) {
      console.warn('Error resolving conversation:', err);
      return 'new_' + carId;
    }
  }, [currentUser?.id]);

  // Join the socket room whenever a thread is opened — realtime messages
  // previously only arrived for conversations created this session.
  const joinConversation = useCallback((convId) => {
    if (socket && convId && !String(convId).startsWith('new_')) {
      socket.emit('join_conversation', convId);
    }
  }, [socket]);

  // Typing signals for the thread currently being typed in
  const sendTyping = useCallback((convId, isTyping) => {
    if (socket && convId && !String(convId).startsWith('new_')) {
      socket.emit(isTyping ? 'typing' : 'stop_typing', { conversationId: convId });
    }
  }, [socket]);

  // ChatScreen declares which thread is on screen (null on unmount). While a
  // thread is active its incoming messages never bump the unread badge.
  const setActiveConversation = useCallback((convId) => {
    activeConvRef.current = convId && !String(convId).startsWith('new_') ? convId : null;
  }, []);

  // Resolve one conversation's metadata (the other party's id, above all)
  // straight from the server. A chat opened from a push or deep link renders
  // before the conversations list has loaded, and Block cannot wait for a
  // list refresh that may never come — safety actions must work on the first
  // attempt, not the second visit.
  const getConversationMeta = useCallback(async (convId) => {
    if (!convId || String(convId).startsWith('new_')) return null;
    try {
      const list = await messagesApi.getConversations();
      if (Array.isArray(list)) {
        setConversations(list.map(mapConversation));
        const conv = list.find((c) => c.id === convId);
        return conv ? mapConversation(conv) : null;
      }
    } catch (err) {
      console.warn('Could not resolve conversation meta:', err?.message);
    }
    return null;
  }, [mapConversation]);

  // Block / report — the Apple-required safety actions on the chat surface.
  const blockUser = useCallback(async (userId) => {
    await messagesApi.blockUser(userId);
    // The server hides the thread from the next fetch; drop it locally now.
    const convList = await messagesApi.getConversations().catch(() => null);
    if (convList) setConversations(convList.map(mapConversation));
  }, [mapConversation]);

  const reportConversation = useCallback(async (convId, reason) => {
    await messagesApi.reportConversation(convId, reason);
  }, []);

  const loadConversationMessages = useCallback(async (convId) => {
    if (convId.startsWith('new_')) return;
    joinConversation(convId);
    try {
      const msgList = await messagesApi.getConversationMessages(convId);
      const mapped = msgList.map((m) => {
        const isMe = m.sender_id === currentUser?.id;
        const timeStr = new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return {
          id: m.id,
          me: isMe,
          text: m.text,
          time: timeStr,
          sender_name: m.sender_name,
        };
      });
      setChatMessages((prev) => ({ ...prev, [convId]: mapped }));
      // The GET marked everything from the other party read server-side —
      // mirror that locally so the badge drops the moment the thread opens
      // instead of at the next full refetch.
      setConversations((prev) =>
        prev.map((c) => (c.id === convId && c.unread ? { ...c, unread: 0 } : c))
      );
    } catch (err) {
      console.warn('Error fetching message history:', err);
    }
  }, [currentUser?.id, joinConversation]);

  const sendMessage = useCallback(async (convId, text, carId = null) => {
    try {
      if (convId.startsWith('new_')) {
        const actualCarId = convId.split('_')[1] || carId;
        const res = await messagesApi.startConversation(actualCarId, text);
        const newConvId = res.conversation.id;

        // Force reload conversations & message list
        const convList = await messagesApi.getConversations();
        setConversations(convList.map(mapConversation));
        await loadConversationMessages(newConvId);

        // Join room
        if (socket) {
          socket.emit('join_conversation', newConvId);
        }

        return newConvId;
      } else {
        const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const optimisticId = 'opt_' + Date.now();
        // Optimistic local add first so UI feels instant
        setChatMessages((prev) => {
          const thread = prev[convId] || [];
          return { ...prev, [convId]: [...thread, { id: optimisticId, me: true, text, time: timeStr, sender_name: currentUser?.name || 'Me' }] };
        });

        try {
          const saved = await messagesApi.sendMessage(convId, text);
          // Swap the optimistic id for the server row's id, so when the
          // server's socket broadcast echoes this message back, the dedupe
          // in the new_message handler recognises it instead of appending
          // a second bubble.
          if (saved?.id) {
            setChatMessages((prev) => ({
              ...prev,
              [convId]: (prev[convId] || []).map((m) =>
                m.id === optimisticId ? { ...m, id: saved.id } : m
              ),
            }));
          }
        } catch (sendErr) {
          // Backend unreachable. In demo we keep the optimistic bubble and add a
          // scripted reply; in a release build a scripted reply would be a
          // message from a seller who never said it, so the bubble is rolled
          // back and the failure surfaced.
          if (!DEMO_MODE) {
            setChatMessages((prev) => ({
              ...prev,
              [convId]: (prev[convId] || []).filter((m) => !String(m.id).startsWith('opt_')),
            }));
            throw sendErr;
          }
          setTimeout(() => {
            const reply = AUTO_REPLIES[Math.floor(Date.now() % AUTO_REPLIES.length)];
            const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            setChatMessages((prev) => {
              const thread = prev[convId] || [];
              return { ...prev, [convId]: [...thread, { id: 'auto_' + Date.now(), me: false, text: reply, time: replyTime }] };
            });
          }, 1200);
        }

        // NOTE: no socket emit here. REST is the single write path — the
        // server's send_message handler also inserts a row, so emitting after
        // the POST used to persist every message twice (two rows, two pushes).
        // Realtime delivery to the other party is the server's job: the POST
        // route broadcasts to the conversation room.
        return convId;
      }
    } catch (err) {
      // Rethrow so the screen can tell the user — swallowing this here is how
      // failed sends used to vanish without a trace.
      console.warn('Error sending message:', err);
      throw err;
    }
  }, [socket, currentUser?.name, mapConversation, loadConversationMessages]);

  const getMessages = useCallback((convId) => chatMessages[convId] || [], [chatMessages]);

  // --- Notifications read/unread ---

  const markNotificationRead = useCallback(async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.warn('Error marking notification read:', err);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.warn('Error marking all notifications read:', err);
    }
  }, []);

  // --- Inspection Checklist Forms ---

  const submitInspectionForm = useCallback(async ({ inspection, results, notes, score }) => {
    const key = inspection?.id || 'latest';
    setInspectionForms((prev) => ({ ...prev, [key]: { inspection, results, notes, score, submittedAt: new Date().toISOString() } }));

    if (!inspection?.id || (DEMO_MODE && !String(inspection.id).includes('-'))) {
      return { success: true, score, car_id: inspection?.car_id || null, demo: true };
    }
    const completed = await inspectionsApi.complete(inspection.id, { checklistResults: results, notes });
    setAdminInspections((current) => current.filter((item) => item.id !== inspection.id));
    return completed;
  }, []);

  // --- Saved Searches ---

  const toggleSavedSearchNotify = useCallback((id) => {
    // Local-first; backend sync is best-effort
    let nextNotify;
    setSavedSearches((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        nextNotify = !s.notifyEnabled;
        return { ...s, notifyEnabled: nextNotify };
      })
    );
    carsApi.toggleSavedSearchNotify(id, nextNotify).catch(() => {});
  }, []);

  const deleteSavedSearch = useCallback((id) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    carsApi.deleteSavedSearch(id).catch(() => {});
  }, []);

  const createSavedSearch = useCallback(async (label, filters) => {
    try {
      const res = await carsApi.createSavedSearch(label, filters);
      const searchList = await carsApi.getSavedSearches();
      setSavedSearches(searchList.map((s) => ({
        id: s.id,
        label: s.label,
        notifyEnabled: s.notify_enabled,
        make: s.filters?.make,
        model: s.filters?.model,
        category: s.filters?.category,
        maxPrice: s.filters?.maxPrice || s.filters?.max_price,
        maxMileage: s.filters?.maxMileage || s.filters?.max_mileage,
      })));
      return res.id;
    } catch (err) {
      // The whole point of a saved search is the alert, and alerts are sent by
      // the server. A local-only row promises notifications that can never fire.
      if (!DEMO_MODE) throw err;
      const localSearch = {
        id: 'ss' + Date.now(),
        label,
        notifyEnabled: true,
        matchCount: 0,
        lastMatch: null,
        ...filters,
      };
      setSavedSearches((prev) => [localSearch, ...prev]);
      return localSearch.id;
    }
  }, []);

  // One brand lookup for the whole app.
  //
  // HomeScreen grew its own name+alias index and every other screen simply did
  // without, which is why a logo an operator had already uploaded appeared on
  // the filter sheet and nowhere else. Resolving in one place also makes the
  // aliases in vehicle_makes earn their keep everywhere: "benz", "VW" and
  // "Mercedes" all land on the same row, so a logo uploaded once is found
  // however a catalogue happens to spell the marque.
  const findMake = useMemo(() => {
    const index = new Map();
    for (const m of makes) {
      index.set(String(m.name || '').toLowerCase(), m);
      for (const alias of m.aliases || []) index.set(String(alias).toLowerCase(), m);
    }
    return (name) => index.get(String(name || '').trim().toLowerCase()) || null;
  }, [makes]);

  // The logo on its own, which is what nearly every caller wants. Undefined
  // rather than null: BrandMark reads a missing logo as "draw the lettermark",
  // and that is the correct rendering until an operator uploads one.
  const brandLogo = useMemo(
    () => (name) => findMake(name)?.logo_url || undefined,
    [findMake],
  );

  const value = {
    // Currency — one rate, one place, every price follows it
    fx,
    // Cars
    cars, savedCarIds, toggleSaveCar, isCarSaved, getSavedCars,
    // Seller Listings
    sellerListings,
    // Submissions pipeline
    submissions, addSubmission, updateSubmissionStatus, scheduleInspection,
    // ID Verification
    idVerificationStatus, submitIDVerification, approveIDVerification, rejectIDVerification,
    // Admin
    pendingVerifications, adminInspections, adminApproveVerification, adminRejectVerification,
    // Notifications
    notifications, markNotificationRead, markAllNotificationsRead,
    inspectionForms, submitInspectionForm,
    relistSubmission, updateSubmissionPrice,
    // Comparison
    comparisonCars, addToComparison, removeFromComparison, clearComparison,
    // Rentals
    fetchCarDetail, searchCars, makes, findMake, brandLogo,
    homeMode, setHomeMode, rentalCars, rentalInquiries, sendRentalInquiry, cancelRentalInquiry,
    recentlyViewedIds, recordCarView,
    currency, toggleCurrency,
    language, languages: LANGUAGES, languageInfo: languageFor(language), locale: localeFor(language), setLanguage, t,
    savedSearches, toggleSavedSearchNotify, deleteSavedSearch, createSavedSearch,
    // Chat messages
    conversations, sendMessage, getMessages, getOrCreateConversation, loadConversationMessages,
    joinConversation, sendTyping, typingConvId, setActiveConversation,
    // Chat safety
    blockUser, reportConversation, getConversationMeta,
    // Authentication
    currentUser, isLoggedIn, loginUser, loginAsGuest, signUpUser, logoutUser, deleteAccount, reopenAccount, updateCurrentUserProfile, loading, error,
    // Push preference (Settings toggle)
    setPushEnabled,
    // Connectivity — false once a read failed at the transport layer, so screens
    // can say "we couldn't reach Sawa" rather than showing an empty marketplace.
    backendReachable, demoMode: DEMO_MODE,
    // Pull-to-refresh, and the "Try again" inside the offline notice.
    refreshCatalogue, refreshing,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export default AppContext;
