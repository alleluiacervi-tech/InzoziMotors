import React, { createContext, useContext, useState, useCallback } from 'react';
import { cars as initialCars, sellerListings as initialSellerListings, conversations as initialConversations } from '../data/cars';

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
