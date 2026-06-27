import React, { createContext, useContext, useState, useCallback } from 'react';
import { cars as initialCars, sellerListings as initialSellerListings, conversations as initialConversations } from '../data/cars';

const AppContext = createContext();

const DEFAULT_USER = {
  name: 'Alex Morgan',
  email: 'alex.morgan@email.com',
  initials: 'AM',
};

const INITIAL_MESSAGES = {
  c1: [
    { id: '1', me: false, text: "Hi! Thanks for your interest in the BMW 4 Series. It's still available.", time: '11:20 AM' },
    { id: '2', me: true, text: 'Great! Is the price negotiable?', time: '11:22 AM' },
    { id: '3', me: false, text: "We can do $30,800 if you're ready this week. It just passed our 150-point inspection.", time: '11:25 AM' },
    { id: '4', me: true, text: 'Sounds good. Can I schedule a test drive Saturday?', time: '11:28 AM' },
    { id: '5', me: false, text: "Absolutely — Saturday at 11:30 AM works. I'll send the address.", time: '11:30 AM' },
  ],
  c2: [
    { id: '1', me: false, text: 'Your escrow payment has been confirmed ✓', time: 'Yesterday' },
    { id: '2', me: true, text: 'Thank you! When will the car be delivered?', time: 'Yesterday' },
    { id: '3', me: false, text: "Estimated delivery is within 3-5 business days. We'll send tracking info soon.", time: 'Yesterday' },
  ],
  c3: [
    { id: '1', me: false, text: 'Thanks for your interest in the RAV4!', time: 'Mon' },
    { id: '2', me: true, text: 'Is this still available? And does it come with the extended warranty?', time: 'Mon' },
    { id: '3', me: false, text: 'Yes, still available! It includes a 2-year/24k mile powertrain warranty.', time: 'Mon' },
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

  const toggleSaveCar = useCallback((id) => {
    setSavedCarIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const isCarSaved = useCallback(
    (id) => savedCarIds.includes(id),
    [savedCarIds]
  );

  const getSavedCars = useCallback(
    () => cars.filter((c) => savedCarIds.includes(c.id)),
    [cars, savedCarIds]
  );

  const addListing = useCallback((listing) => {
    setSellerListings((prev) => [listing, ...prev]);
  }, []);

  const sendMessage = useCallback((convId, text) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    setChatMessages((prev) => {
      const thread = prev[convId] || [];
      const newMsg = { id: String(thread.length + 1), me: true, text, time: timeStr };
      return { ...prev, [convId]: [...thread, newMsg] };
    });

    // Update last message preview in conversations list
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, last: text, time: timeStr, unread: 0 } : c
      )
    );

    // Auto-reply after delay
    setTimeout(() => {
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      const replyTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      setChatMessages((prev) => {
        const thread = prev[convId] || [];
        const replyMsg = { id: String(thread.length + 1), me: false, text: reply, time: replyTime };
        return { ...prev, [convId]: [...thread, replyMsg] };
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, last: reply, time: replyTime, unread: 1 } : c
        )
      );
    }, 1500);
  }, []);

  const getMessages = useCallback(
    (convId) => chatMessages[convId] || [],
    [chatMessages]
  );

  const loginUser = useCallback((name, email) => {
    setCurrentUser({ name, email, initials: name.split(' ').map((w) => w[0]).join('').toUpperCase() });
    setIsLoggedIn(true);
  }, []);

  const logoutUser = useCallback(() => {
    setIsLoggedIn(false);
  }, []);

  const value = {
    cars,
    savedCarIds,
    toggleSaveCar,
    isCarSaved,
    getSavedCars,
    sellerListings,
    addListing,
    conversations,
    sendMessage,
    getMessages,
    currentUser,
    isLoggedIn,
    loginUser,
    logoutUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export default AppContext;
