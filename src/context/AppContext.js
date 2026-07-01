import React, { createContext, useContext, useState, useCallback } from 'react';
import { cars as initialCars, sellerListings as initialSellerListings, conversations as initialConversations } from '../data/cars';
import { INITIAL_NOTIFICATIONS } from '../data/inspectionData';

const AppContext = createContext();

const DEFAULT_USER = {
  name: 'Alex Morgan',
  email: 'alex.morgan@email.com',
  initials: 'AM',
};

// Seller's car submissions with pipeline stages
const INITIAL_SUBMISSIONS = [
  {
    id: 'sub1',
    carTitle: '2020 Toyota RAV4 XLE AWD',
    make: 'Toyota', model: 'RAV4', year: 2020,
    mileage: 34100,
    askingPrice: 26000,
    submittedDate: 'Jun 25, 2026',
    status: 'live',
    image: 'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=400&q=80',
    inspectionDate: null,
    center: 'Nyarutarama',
    listingId: '3',
    statusDetail: 'Listed 3 days ago · 47 views',
  },
  {
    id: 'sub2',
    carTitle: '2019 Honda Civic Sport',
    make: 'Honda', model: 'Civic', year: 2019,
    mileage: 41000,
    askingPrice: 18500,
    submittedDate: 'Jun 27, 2026',
    status: 'scheduled',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&q=80',
    inspectionDate: 'Jun 29, 2026 · 10:00 AM',
    center: 'Kicukiro',
    listingId: null,
    statusDetail: 'Inspection: Jun 29 · 10:00 AM · Kicukiro Center',
  },
  {
    id: 'sub3',
    carTitle: '2018 Subaru Forester XT',
    make: 'Subaru', model: 'Forester', year: 2018,
    mileage: 58000,
    askingPrice: 22000,
    submittedDate: 'Jun 28, 2026',
    status: 'under_review',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&q=80',
    inspectionDate: null,
    center: null,
    listingId: null,
    statusDetail: 'Our team is reviewing your submission',
  },
];

// Admin: pending ID verifications
const INITIAL_VERIFICATIONS = [
  { id: 'v1', name: 'Jean Pierre Habimana', initials: 'JP', submitted: '2 hours ago', status: 'pending' },
  { id: 'v2', name: 'Marie Claire Uwase', initials: 'MC', submitted: '5 hours ago', status: 'pending' },
  { id: 'v3', name: 'Emmanuel Nsabimana', initials: 'EN', submitted: 'Yesterday', status: 'pending' },
  { id: 'v4', name: 'Diane Mukeshimana', initials: 'DM', submitted: '2 days ago', status: 'pending' },
];

// Pending handover bookings (buyer has committed, admin needs to confirm)
const INITIAL_HANDOVERS = [
  {
    id: 'h1',
    bookingId: 'BK-20260701-001',
    buyer: 'James Uwimana',
    buyerInitials: 'JU',
    seller: 'Jean Pierre H.',
    car: '2019 Toyota RAV4',
    center: 'Nyarutarama Center',
    date: 'Jul 3, 2026',
    time: '10:00 AM',
    status: 'pending',
  },
  {
    id: 'h2',
    bookingId: 'BK-20260701-002',
    buyer: 'Grace Murekatete',
    buyerInitials: 'GM',
    seller: 'Alice Keza',
    car: '2021 Honda CR-V',
    center: 'Kicukiro Center',
    date: 'Jul 5, 2026',
    time: '2:00 PM',
    status: 'pending',
  },
];

// Admin: scheduled inspections
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

const AUTO_REPLIES = [
  "Thanks for your message! Let me check on that for you.",
  "That's a great question. I'll get back to you shortly with more details.",
  "Absolutely! We can arrange that. When works best for you?",
  "I appreciate your interest. This vehicle has been very popular.",
  "Sure thing! I can send over the full inspection report right away.",
  "Great to hear from you! Let me pull up the details on that.",
];

export function AppProvider({ children }) {
  const [cars] = useState(initialCars);
  const [savedCarIds, setSavedCarIds] = useState([]);
  const [sellerListings, setSellerListings] = useState(initialSellerListings);
  const [conversations, setConversations] = useState(initialConversations);
  const [chatMessages, setChatMessages] = useState(INITIAL_MESSAGES);
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Seller submission pipeline
  const [submissions, setSubmissions] = useState(INITIAL_SUBMISSIONS);
  // ID verification: 'none' | 'pending' | 'approved' | 'rejected'
  const [idVerificationStatus, setIdVerificationStatus] = useState('none');

  // Admin data
  const [pendingVerifications, setPendingVerifications] = useState(INITIAL_VERIFICATIONS);
  const [adminInspections] = useState(INITIAL_INSPECTIONS_ADMIN);

  // Phase 2 — Notifications
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  // Phase 2 — Submitted inspection forms (keyed by inspectionId)
  const [inspectionForms, setInspectionForms] = useState({});

  // Phase 3 — Purchase requests / handover bookings
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [handovers, setHandovers] = useState(INITIAL_HANDOVERS);

  // Phase 4 — Comparison (max 3 cars)
  const [comparisonCars, setComparisonCars] = useState([]);
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

  // Phase 4 — Currency toggle
  const [currency, setCurrency] = useState('USD');
  const toggleCurrency = useCallback(() => {
    setCurrency((prev) => (prev === 'USD' ? 'RWF' : 'USD'));
  }, []);

  // Phase 4 — Saved searches
  const [savedSearches, setSavedSearches] = useState([
    { id: 'ss1', label: 'Toyota RAV4 · SUV · < $30k', make: 'Toyota', model: 'RAV4', category: 'SUV', maxPrice: 30000, notifyEnabled: true, matchCount: 3, lastMatch: '2 days ago' },
    { id: 'ss2', label: 'BMW Sedan · Any year · < $45k', make: 'BMW', category: 'Sedan', maxPrice: 45000, notifyEnabled: false, matchCount: 1, lastMatch: '1 week ago' },
    { id: 'ss3', label: 'Electric car · < 30k miles', category: 'EV', maxMileage: 30000, notifyEnabled: true, matchCount: 5, lastMatch: 'Today' },
  ]);
  const toggleSavedSearchNotify = useCallback((id) => {
    setSavedSearches((prev) => prev.map((s) => s.id === id ? { ...s, notifyEnabled: !s.notifyEnabled } : s));
  }, []);
  const deleteSavedSearch = useCallback((id) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // --- Car saves ---
  const toggleSaveCar = useCallback((id) => {
    setSavedCarIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);
  const isCarSaved = useCallback((id) => savedCarIds.includes(id), [savedCarIds]);
  const getSavedCars = useCallback(() => cars.filter((c) => savedCarIds.includes(c.id)), [cars, savedCarIds]);

  // --- Seller listings (legacy auctions) ---
  const addListing = useCallback((listing) => {
    setSellerListings((prev) => [listing, ...prev]);
  }, []);

  // --- ID Verification ---
  const submitIDVerification = useCallback(() => {
    setIdVerificationStatus('pending');
  }, []);
  const approveIDVerification = useCallback(() => {
    setIdVerificationStatus('approved');
  }, []);
  const rejectIDVerification = useCallback(() => {
    setIdVerificationStatus('rejected');
  }, []);

  // --- Car Submissions ---
  const addSubmission = useCallback((data) => {
    const newSub = {
      id: 'sub' + Date.now(),
      ...data,
      submittedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'under_review',
      statusDetail: 'Our team is reviewing your submission',
      inspectionDate: null,
      center: null,
      listingId: null,
    };
    setSubmissions((prev) => [newSub, ...prev]);
    return newSub.id;
  }, []);

  const updateSubmissionStatus = useCallback((id, status, detail = '') => {
    setSubmissions((prev) =>
      prev.map((s) => s.id === id ? { ...s, status, statusDetail: detail } : s)
    );
  }, []);

  // Phase 5 — Relist a car at a new price
  const relistSubmission = useCallback((id, newPrice) => {
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

  // --- Admin: Verify ID ---
  const adminApproveVerification = useCallback((verificationId) => {
    setPendingVerifications((prev) =>
      prev.map((v) => v.id === verificationId ? { ...v, status: 'approved' } : v)
    );
  }, []);
  const adminRejectVerification = useCallback((verificationId) => {
    setPendingVerifications((prev) =>
      prev.map((v) => v.id === verificationId ? { ...v, status: 'rejected' } : v)
    );
  }, []);

  // --- Chat ---
  const sendMessage = useCallback((convId, text) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setChatMessages((prev) => {
      const thread = prev[convId] || [];
      return { ...prev, [convId]: [...thread, { id: String(thread.length + 1), me: true, text, time: timeStr }] };
    });
    setConversations((prev) =>
      prev.map((c) => c.id === convId ? { ...c, last: text, time: timeStr, unread: 0 } : c)
    );
    setTimeout(() => {
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      setChatMessages((prev) => {
        const thread = prev[convId] || [];
        return { ...prev, [convId]: [...thread, { id: String(thread.length + 1), me: false, text: reply, time: replyTime }] };
      });
      setConversations((prev) =>
        prev.map((c) => c.id === convId ? { ...c, last: reply, time: replyTime, unread: 1 } : c)
      );
    }, 1500);
  }, []);

  const getMessages = useCallback((convId) => chatMessages[convId] || [], [chatMessages]);

  // --- Phase 2: Notifications ---
  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // --- Phase 2: Inspection Forms ---
  const submitInspectionForm = useCallback(({ inspection, results, notes, score }) => {
    const key = inspection?.id || 'latest';
    setInspectionForms((prev) => ({ ...prev, [key]: { inspection, results, notes, score, submittedAt: new Date().toISOString() } }));
  }, []);

  // --- Phase 3: Handover Bookings ---
  const bookHandover = useCallback((car, { center, date, time }) => {
    const bookingId = 'BK-' + Date.now().toString(36).toUpperCase();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const newRequest = {
      id: bookingId,
      car,
      status: 'reserved',
      center,
      date,
      time,
      bookedAt: now.toISOString(),
      bookedTime: timeStr,
      completedAt: null,
    };
    setPurchaseRequests((prev) => [newRequest, ...prev]);

    // Add to admin handovers queue
    setHandovers((prev) => [{
      id: 'h_' + Date.now(),
      bookingId,
      buyer: currentUser.name,
      buyerInitials: currentUser.initials,
      seller: car.seller,
      car: car.title,
      center,
      date,
      time,
      status: 'pending',
    }, ...prev]);

    // Notification: booking confirmed
    setNotifications((prev) => [{
      id: 'book_' + Date.now(),
      type: 'listing_update',
      title: 'Handover slot booked',
      body: `Your slot for the ${car.title} is confirmed at ${center} on ${date} at ${time}. The car is now reserved for you.`,
      time: 'Just now',
      date: 'Today',
      read: false,
      bookingId,
    }, ...prev]);

    return bookingId;
  }, [currentUser]);

  // Legacy alias — keeps any existing code that calls addPurchaseRequest working
  const addPurchaseRequest = bookHandover;

  // Admin: confirm a handover happened → mark complete, archive listing
  const confirmHandover = useCallback((handoverId) => {
    setHandovers((prev) =>
      prev.map((h) => h.id === handoverId ? { ...h, status: 'complete' } : h)
    );
    // Find the matching purchase request and mark complete
    setHandovers((prev) => {
      const h = prev.find((x) => x.id === handoverId);
      if (h) {
        setPurchaseRequests((reqs) =>
          reqs.map((r) => r.id === h.bookingId ? { ...r, status: 'complete', completedAt: new Date().toISOString() } : r)
        );
        setNotifications((notifs) => [{
          id: 'sold_' + Date.now(),
          type: 'listing_update',
          title: 'Handover confirmed',
          body: `The ${h.car} handover has been completed and confirmed by the Inzozi team. Your 7-day return guarantee is now active.`,
          time: 'Just now',
          date: 'Today',
          read: false,
        }, ...notifs]);
      }
      return prev;
    });
  }, []);

  // --- Auth ---
  const loginUser = useCallback((name, email) => {
    setCurrentUser({ name, email, initials: name.split(' ').map((w) => w[0]).join('').toUpperCase() });
    setIsLoggedIn(true);
  }, []);
  const logoutUser = useCallback(() => {
    setIsLoggedIn(false);
  }, []);

  const value = {
    // Cars
    cars, savedCarIds, toggleSaveCar, isCarSaved, getSavedCars,
    // Seller (legacy)
    sellerListings, addListing,
    // Submissions pipeline
    submissions, addSubmission, updateSubmissionStatus,
    // ID Verification
    idVerificationStatus, submitIDVerification, approveIDVerification, rejectIDVerification,
    // Admin
    pendingVerifications, adminInspections, adminApproveVerification, adminRejectVerification,
    // Phase 2
    notifications, markNotificationRead, markAllNotificationsRead,
    inspectionForms, submitInspectionForm,
    // Phase 3
    purchaseRequests, bookHandover, addPurchaseRequest,
    handovers, confirmHandover,
    // Phase 5
    relistSubmission,
    // Phase 4
    comparisonCars, addToComparison, removeFromComparison, clearComparison,
    currency, toggleCurrency,
    savedSearches, toggleSavedSearchNotify, deleteSavedSearch,
    // Chat
    conversations, sendMessage, getMessages,
    // Auth
    currentUser, isLoggedIn, loginUser, logoutUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export default AppContext;
