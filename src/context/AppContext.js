import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DEFAULT_CAR_IMAGE, DEFAULT_CAR_IMAGES, STUDIO } from '../data/carImageAssets';
import { categories, formatPrice, formatMiles, cars as mockCars, conversations as initialConversations, sellerListings as initialSellerListings } from '../data/cars';
import { INITIAL_NOTIFICATIONS } from '../data/inspectionData';
import { RENTAL_CARS } from '../data/rentals';
import authApi from '../api/auth';
import carsApi from '../api/cars';
import submissionsApi from '../api/submissions';
import handoversApi from '../api/handovers';
import messagesApi from '../api/messages';
import notificationsApi from '../api/notifications';
import rentalsApi from '../api/rentals';
import api, { BASE_URL, getToken } from '../api/client';
import io from 'socket.io-client';
import { syncPushToken, unregisterPushToken } from '../utils/push';
import { getJSON, setJSON } from '../storage';

const AppContext = createContext();

// Demo user shown when no backend auth token exists
const DEFAULT_USER = {
  name: 'Alex Morgan',
  email: 'alex.morgan@email.com',
  initials: 'AM',
  id_verified: 'none', // 'none' so the ID verification flow is demoable
};

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
    { id: '1', me: false, text: 'Your purchase request has been confirmed ✓', time: 'Yesterday' },
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
  const [cars, setCars] = useState(mockCars);
  const [savedCarIds, setSavedCarIds] = useState([]);
  const [sellerListings, setSellerListings] = useState(initialSellerListings || []);
  const [conversations, setConversations] = useState(initialConversations || []);
  const [chatMessages, setChatMessages] = useState(INITIAL_MESSAGES);
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Seller submission pipeline
  const [submissions, setSubmissions] = useState(INITIAL_SUBMISSIONS);

  // ID verification status derived from current user profile
  const idVerificationStatus = currentUser?.id_verified || 'none';

  // Admin data
  const [pendingVerifications, setPendingVerifications] = useState(INITIAL_VERIFICATIONS);
  const [adminInspections] = useState(INITIAL_INSPECTIONS_ADMIN);

  // Notifications
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS || []);

  // Submitted inspection forms (keyed by inspectionId)
  const [inspectionForms, setInspectionForms] = useState({});

  // Purchase requests / handover bookings
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [handovers, setHandovers] = useState([]);

  // Comparison (max 3 cars)
  const [comparisonCars, setComparisonCars] = useState([]);

  // Rentals — separate fleet from sale inventory (mock, no backend yet)
  const [homeMode, setHomeMode] = useState('buy'); // 'buy' | 'rent'
  const [rentalCars, setRentalCars] = useState(RENTAL_CARS);
  const [rentalBookings, setRentalBookings] = useState([]);
  const bookRental = useCallback(async (booking) => {
    let bookingId;
    try {
      const created = await rentalsApi.bookRental(booking.carId, {
        start_date: booking.startDateISO,
        days: booking.days,
        pickup_window: booking.time,
        airport_pickup: !!booking.airportPickup,
        center: booking.center,
      });
      bookingId = created?.id || created?.booking_ref;
      const mine = await rentalsApi.getMyBookings();
      setRentalBookings(mine.map(mapRentalBooking));
    } catch (err) {
      console.warn('Rental booking API unreachable — booking locally:', err.message);
      const newBooking = {
        id: 'rb' + Date.now(),
        status: 'confirmed',
        ...booking,
      };
      bookingId = newBooking.id;
      setRentalBookings((prev) => [newBooking, ...prev]);
    }
    setNotifications((prev) => [{
      id: 'rental_' + Date.now(),
      type: 'listing_update',
      title: 'Rental booking confirmed',
      body: `${booking.carTitle} is reserved from ${booking.startDate} for ${booking.days} day${booking.days > 1 ? 's' : ''}. Pick up at ${booking.center}.`,
      time: 'Just now',
      date: 'Today',
      read: false,
    }, ...prev]);
    return bookingId;
  }, []);
  const updateRentalBookingStatus = useCallback((id, status, record = null) => {
    // Optimistic local update; backend sync is best-effort
    setRentalBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
    rentalsApi.updateBookingStatus(id, status, record).catch(() => {});
  }, []);

  // Socket state
  const [socket, setSocket] = useState(null);
  const [typingConvId, setTypingConvId] = useState(null);

  // Expo push token for this device, held so logout can unregister it
  const [pushToken, setPushToken] = useState(null);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState(INITIAL_SAVED_SEARCHES);

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
  const [currency, setCurrency] = useState('USD');
  const toggleCurrency = useCallback(() => {
    setCurrency((prev) => (prev === 'USD' ? 'RWF' : 'USD'));
  }, []);

  // Recently viewed — powers the Home personalization rail
  const [recentlyViewedIds, setRecentlyViewedIds] = useState([]);
  const recordCarView = useCallback((id) => {
    setRecentlyViewedIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 10));
  }, []);

  // --- Persistence: saved cars, saved searches, rental bookings, currency ---
  // Hydrate once on mount; only persist after hydration so defaults never
  // overwrite what the user already stored.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    (async () => {
      const [ids, searches, bookings, cur, requests, mode, viewed] = await Promise.all([
        getJSON('savedCarIds'),
        getJSON('savedSearches'),
        getJSON('rentalBookings'),
        getJSON('currency'),
        getJSON('purchaseRequests'),
        getJSON('homeMode'),
        getJSON('recentlyViewedIds'),
      ]);
      if (ids) setSavedCarIds(ids);
      if (searches) setSavedSearches(searches);
      if (bookings) setRentalBookings(bookings);
      if (cur) setCurrency(cur);
      if (requests) setPurchaseRequests(requests);
      if (mode) setHomeMode(mode);
      if (viewed) setRecentlyViewedIds(viewed);
      setHydrated(true);
    })();
  }, []);
  useEffect(() => { if (hydrated) setJSON('savedCarIds', savedCarIds); }, [savedCarIds, hydrated]);
  useEffect(() => { if (hydrated) setJSON('savedSearches', savedSearches); }, [savedSearches, hydrated]);
  useEffect(() => { if (hydrated) setJSON('rentalBookings', rentalBookings); }, [rentalBookings, hydrated]);
  useEffect(() => { if (hydrated) setJSON('currency', currency); }, [currency, hydrated]);
  useEffect(() => { if (hydrated) setJSON('purchaseRequests', purchaseRequests); }, [purchaseRequests, hydrated]);
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
      rating: parseFloat(c.seller_trust ? (c.seller_trust / 20).toFixed(1) : '4.5'),
      distance: 2.5,
      inspected: !!c.inspected,
      inspectionScore: c.inspection_score,
      returnDays: 7,
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
      detail = 'Approved — book your inspection at any Inzozi center';
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

  const mapHandover = useCallback((h) => {
    return {
      id: h.id,                    // UUID — what the API routes match on
      bookingRef: h.booking_id,    // 'BK-…' — display only
      car: {
        id: h.car_id,
        title: h.car_title,
        price: h.price,
        image: h.car_images?.[0] || STUDIO.paintBlack,
        seller: h.seller_name,
      },
      status: h.status === 'pending' ? 'reserved' : h.status === 'confirmed' ? 'booked' : h.status === 'complete' ? 'complete' : 'cancelled',
      center: h.center,
      date: h.handover_date,
      time: h.handover_time,
      bookedAt: h.booked_at,
      bookedTime: new Date(h.booked_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      completedAt: h.confirmed_at,
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
      name: otherName || 'Inzozi Motors User',
      last: conv.last_message || 'No messages yet',
      time: timeStr,
      unread: parseInt(conv.unread_count || 0),
      avatar: (otherName || 'I')[0].toUpperCase(),
      online: true,
      carId: conv.car_id,
      carTitle: conv.car_title,
      carImage: conv.car_images?.[0] || null,
    };
  }, [currentUser?.id]);

  // Fetch cars from the API; fall back to bundled demo data when the backend
  // is unreachable or has no listings yet (backend deployment is Phase 6A).
  const fetchCars = useCallback(async () => {
    try {
      const carList = await carsApi.getCars();
      if (carList && carList.length) return carList.map(mapCar);
      console.warn('Cars API returned no listings — using bundled demo data');
    } catch (err) {
      console.warn('Cars API unreachable — using bundled demo data:', err.message);
    }
    return mockCars;
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

  // Rental fleet: API rows -> mobile shape; booked ranges -> greyed-out day indexes
  const mapRentalCar = useCallback((rc) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const unavailable = new Set();
    (rc.booked_ranges || []).forEach((r) => {
      const offset = Math.round((new Date(r.start_date) - today) / 86400000);
      for (let i = 0; i < r.days; i++) {
        const idx = offset + i;
        if (idx >= 0 && idx < 14) unavailable.add(idx);
      }
    });
    return {
      id: rc.id, title: rc.title, make: rc.make, model: rc.model, year: rc.year,
      category: rc.category, seats: rc.seats, fuel: rc.fuel, transmission: rc.transmission,
      mileage: rc.mileage, listingType: 'rental',
      dailyRate: rc.daily_rate, weeklyRate: rc.weekly_rate, deposit: rc.deposit,
      minDays: rc.min_days, inspected: rc.inspected, inspectionScore: rc.inspection_score,
      rating: Number(rc.rating) || 0, trips: rc.trips, location: rc.location,
      image: rc.images?.[0] || null, images: rc.images || [],
      safariReady: !!rc.safari_ready,
      unavailableDays: [...unavailable],
    };
  }, []);

  const mapRentalBooking = useCallback((b) => ({
    id: b.id,
    bookingRef: b.booking_ref,
    carId: b.rental_car_id,
    carTitle: b.car_title,
    carImage: b.car_images?.[0] || null,
    startDate: b.start_date,
    time: b.pickup_window,
    days: b.days,
    center: b.center || b.car_location,
    subtotal: b.subtotal,
    deposit: b.deposit,
    pickupFee: b.pickup_fee,
    total: b.total,
    // Counter walkaround records — what check-in/return shows back to the renter
    pickupRecord: b.pickup_record || null,
    returnRecord: b.return_record || null,
    status: b.status === 'upcoming' ? 'confirmed' : b.status,
  }), []);

  const fetchRentalCars = useCallback(async () => {
    try {
      const list = await rentalsApi.getRentalCars();
      if (list && list.length) return list.map(mapRentalCar);
    } catch (err) {
      console.warn('Rentals API unreachable — using bundled fleet:', err.message);
    }
    return RENTAL_CARS;
  }, [mapRentalCar]);

  // --- Initial Data Loader ---

  const loadInitialData = useCallback(async (user) => {
    setCars(await fetchCars());
    setRentalCars(await fetchRentalCars());
    try {

      if (user) {
        try {
          const myRentals = await rentalsApi.getMyBookings();
          setRentalBookings(myRentals.map(mapRentalBooking));
        } catch {}
      }


      if (user) {
        const wishList = await carsApi.getSavedCars();
        setSavedCarIds(wishList.map((c) => c.id));

        const subList = await submissionsApi.getSubmissions();
        setSubmissions(subList.map(mapSubmission));

        const myHandovers = await handoversApi.getMyHandovers();
        setPurchaseRequests(myHandovers.map(mapHandover));

        const convList = await messagesApi.getConversations();
        setConversations(convList.map(mapConversation));

        const notifList = await notificationsApi.getNotifications();
        setNotifications(notifList.map(mapNotification));

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

        if (user.role === 'admin') {
          // Admins see the whole submission pipeline, not just their own
          try {
            const adminSubs = await submissionsApi.getAdminSubmissions();
            setSubmissions(adminSubs.map(mapSubmission));
          } catch {}

          const queueList = await api.get('/id-verification/queue');
          setPendingVerifications(queueList.map((v) => ({
            id: v.id,
            name: v.name,
            initials: v.name.split(' ').map((w) => w[0]).join('').toUpperCase(),
            submitted: new Date(v.submitted_at).toLocaleDateString('en-US'),
            status: v.id_verified,
          })));

          const adminHandovers = await handoversApi.getAdminHandovers('pending');
          setHandovers(adminHandovers.map((h) => ({
            id: h.id,
            bookingId: h.booking_id,
            buyer: h.buyer_name,
            buyerInitials: h.buyer_name.split(' ').map((w) => w[0]).join('').toUpperCase(),
            seller: h.seller_name,
            car: h.car_title,
            center: h.center,
            date: h.handover_date,
            time: h.handover_time,
            status: h.status,
          })));
        }
      }
    } catch (err) {
      console.warn('Error loading initial data from API:', err);
    }
  }, [fetchCars, fetchRentalCars, mapRentalBooking, mapSubmission, mapHandover, mapConversation, mapNotification]);

  // Check auth token and trigger load on app startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await authApi.getMe();
          setCurrentUser({
            ...me,
            initials: me.name.split(' ').map((w) => w[0]).join('').toUpperCase(),
          });
          setIsLoggedIn(true);
          await loadInitialData(me);
        } else {
          setCars(await fetchCars());
          setRentalCars(await fetchRentalCars());
        }
      } catch (err) {
        console.warn('Initial auth setup failed, falling back to public data:', err);
        setCars(await fetchCars());
        setRentalCars(await fetchRentalCars());
      }
    };
    initAuth();
  }, [loadInitialData, fetchCars]);

  // Register this device for push once we know who is signed in. The server
  // keys tokens to the user, so this has to run after auth, not at boot.
  useEffect(() => {
    if (!isLoggedIn) return;
    let alive = true;
    syncPushToken().then((token) => { if (alive && token) setPushToken(token); });
    return () => { alive = false; };
  }, [isLoggedIn]);

  // Connect Socket.io client on login
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      getToken().then((token) => {
        if (!token) return;
        const newSocket = io(BASE_URL, {
          auth: { token },
        });

        newSocket.on('connect', () => {
          console.log('Socket.io connected to server');
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

          // Refresh conversations summaries
          setConversations((prev) =>
            prev.map((c) =>
              c.id === message.conversation_id
                ? {
                    ...c,
                    last: message.text,
                    time: new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                    unread: message.sender_id !== currentUser.id ? (c.unread || 0) + 1 : c.unread,
                  }
                : c
            )
          );
        });

        // Typing indicator: track which conversation the other party is typing in
        newSocket.on('user_typing', ({ conversationId }) => {
          setTypingConvId(conversationId);
        });
        newSocket.on('user_stop_typing', () => {
          setTypingConvId(null);
        });

        setSocket(newSocket);

        return () => {
          newSocket.disconnect();
        };
      });
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [isLoggedIn, currentUser?.id]);

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
      setCurrentUser({
        ...user,
        initials: user.name.split(' ').map((w) => w[0]).join('').toUpperCase(),
      });
      setIsLoggedIn(true);
      await loadInitialData(user);
    } catch (err) {
      if (isNetworkError(err)) {
        // Backend unreachable (Phase 6 not deployed) — demo login
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
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadInitialData]);

  // Local guest session — no API round-trip
  const loginAsGuest = useCallback(() => {
    setCurrentUser(DEFAULT_USER);
    setIsLoggedIn(true);
  }, []);

  const signUpUser = useCallback(async (name, email, password, role = 'buyer') => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.register(name, email, password, role);
      const user = data.user;
      setCurrentUser({
        ...user,
        initials: user.name.split(' ').map((w) => w[0]).join('').toUpperCase(),
      });
      setIsLoggedIn(true);
      await loadInitialData(user);
    } catch (err) {
      if (isNetworkError(err)) {
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
    setCurrentUser(DEFAULT_USER);
    setIsLoggedIn(false);
    setSavedCarIds([]);
    setSubmissions(INITIAL_SUBMISSIONS);
    setPurchaseRequests([]);
    setNotifications(INITIAL_NOTIFICATIONS || []);
    setConversations(initialConversations || []);
    setSavedSearches(INITIAL_SAVED_SEARCHES);
  }, [pushToken]);

  // --- Car wishlisting / bookmarking ---

  const toggleSaveCar = useCallback((id) => {
    // Local-first so the heart always responds; sync to API in the background when possible
    setSavedCarIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    if (isLoggedIn) {
      carsApi.saveCar(id).catch(() => {}); // backend optional in demo
    }
  }, [isLoggedIn]);

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
    } catch (err) {
      if (!isNetworkError(err)) throw err;
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
      if (!isNetworkError(err)) throw err;
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

  const getOrCreateConversation = useCallback(async (carId) => {
    try {
      const list = await messagesApi.getConversations();
      const existing = list.find((c) => c.car_id === carId);
      if (existing) {
        return existing.id;
      }
      return 'new_' + carId;
    } catch (err) {
      console.warn('Error resolving conversation:', err);
      return 'new_' + carId;
    }
  }, []);

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
        // Optimistic local add first so UI feels instant
        setChatMessages((prev) => {
          const thread = prev[convId] || [];
          return { ...prev, [convId]: [...thread, { id: 'opt_' + Date.now(), me: true, text, time: timeStr, sender_name: currentUser?.name || 'Me' }] };
        });

        try {
          await messagesApi.sendMessage(convId, text);
        } catch {
          // Backend unreachable — keep the optimistic message and add an auto-reply for demo
          setTimeout(() => {
            const reply = AUTO_REPLIES[Math.floor(Date.now() % AUTO_REPLIES.length)];
            const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            setChatMessages((prev) => {
              const thread = prev[convId] || [];
              return { ...prev, [convId]: [...thread, { id: 'auto_' + Date.now(), me: false, text: reply, time: replyTime }] };
            });
          }, 1200);
        }

        // Emit via Socket.io if connected
        if (socket) {
          socket.emit('send_message', { conversationId: convId, text });
        }
        return convId;
      }
    } catch (err) {
      console.warn('Error sending message:', err);
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

  const submitInspectionForm = useCallback(({ inspection, results, notes, score }) => {
    const key = inspection?.id || 'latest';
    setInspectionForms((prev) => ({ ...prev, [key]: { inspection, results, notes, score, submittedAt: new Date().toISOString() } }));
    
    if (inspection?.id) {
      api.post(`/inspections/${inspection.id}/complete`, { checklist_results: results, notes })
        .then(() => {
          if (currentUser?.role === 'admin') {
            api.get('/id-verification/queue').then((queueList) => {
              setPendingVerifications(queueList.map((v) => ({
                id: v.id,
                name: v.name,
                initials: v.name.split(' ').map((w) => w[0]).join('').toUpperCase(),
                submitted: new Date(v.submitted_at).toLocaleDateString('en-US'),
                status: v.id_verified,
              })));
            });
          }
        })
        .catch((err) => console.warn('Error completing inspection form:', err));
    }
  }, [currentUser]);

  // --- Handover Checkout Bookings ---

  const bookHandover = useCallback(async (car, { center, date, time, contactPhone } = {}) => {
    setLoading(true);
    try {
      const res = await handoversApi.bookHandover({
        car_id: car.id,
        center: center || null,
        handover_date: date || null,
        handover_time: time || null,
        contact_phone: contactPhone || null,
      });

      const myHandovers = await handoversApi.getMyHandovers();
      setPurchaseRequests(myHandovers.map(mapHandover));

      const notifs = await notificationsApi.getNotifications();
      setNotifications(notifs.map(mapNotification));

      // The UUID is what routes match on; screens show bookingRef for display
      return res.id || res.booking_id;
    } catch (err) {
      // Only fabricate a local booking when the backend is unreachable.
      // A 4xx/409 is a real rejection (bad phone, car taken) — surface it.
      if (!isNetworkError(err)) throw err;
      console.warn('Handover API unreachable — booking locally:', err.message);
      // Local fallback so checkout + order tracking work in the demo
      const localId = 'HB' + String(Date.now()).slice(-6);
      const localBooking = {
        id: localId,
        carId: car.id,
        carTitle: car.title,
        carImage: car.image,
        price: car.price || car.currentBid,
        center: center || 'To be arranged',
        date: date || 'Pending confirmation',
        time: time || '',
        contactPhone: contactPhone || null,
        status: 'reserved',
        createdAt: new Date().toISOString(),
      };
      setPurchaseRequests((prev) => [localBooking, ...prev]);
      setNotifications((prev) => [{
        id: 'handover_' + Date.now(),
        type: 'listing_update',
        title: 'Handover booked',
        body: `${car.title} is reserved for you — ${date} at ${time}, ${center}.`,
        time: 'Just now',
        date: 'Today',
        read: false,
      }, ...prev]);
      return localId;
    } finally {
      setLoading(false);
    }
  }, [mapHandover, mapNotification]);

  const cancelHandover = useCallback((bookingId) => {
    handoversApi.cancelHandover?.(bookingId)?.catch?.(() => {});
    setPurchaseRequests((prev) => prev.filter((r) => r.id !== bookingId));
  }, []);

  const addPurchaseRequest = bookHandover;

  const confirmHandover = useCallback(async (handoverId) => {
    try {
      // The backend split confirm (pending → confirmed) from complete
      // (car sold + commission + trust). "Confirm & Mark Sold" needs both.
      await handoversApi.confirmHandover(handoverId).catch(() => {}); // no-op if already confirmed
      await handoversApi.completeHandover(handoverId);
      setHandovers((prev) =>
        prev.map((h) => h.id === handoverId ? { ...h, status: 'complete' } : h)
      );
      if (currentUser) {
        const myHandovers = await handoversApi.getMyHandovers();
        setPurchaseRequests(myHandovers.map(mapHandover));
      }
    } catch (err) {
      if (isNetworkError(err)) {
        // Demo mode — local update only
        setHandovers((prev) =>
          prev.map((h) => h.id === handoverId ? { ...h, status: 'complete' } : h)
        );
        return;
      }
      console.warn('Error completing handover via API:', err);
      throw err;
    }
  }, [currentUser, mapHandover]);

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
      // Local fallback
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

  const value = {
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
    // Handovers & checkout
    purchaseRequests, bookHandover, addPurchaseRequest, cancelHandover,
    handovers, confirmHandover,
    relistSubmission, updateSubmissionPrice,
    // Comparison
    comparisonCars, addToComparison, removeFromComparison, clearComparison,
    // Rentals
    fetchCarDetail, searchCars,
    homeMode, setHomeMode, rentalCars, rentalBookings, bookRental, updateRentalBookingStatus,
    recentlyViewedIds, recordCarView,
    currency, toggleCurrency,
    savedSearches, toggleSavedSearchNotify, deleteSavedSearch, createSavedSearch,
    // Chat messages
    conversations, sendMessage, getMessages, getOrCreateConversation, loadConversationMessages,
    joinConversation, sendTyping, typingConvId,
    // Authentication
    currentUser, isLoggedIn, loginUser, loginAsGuest, signUpUser, logoutUser, loading, error,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export default AppContext;
