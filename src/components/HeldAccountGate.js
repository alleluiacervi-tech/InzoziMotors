import React from 'react';
import { useApp } from '../context/AppContext';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';

// The signed-in account is held as a suspected bot (backend lib/signup-risk.js
// and middleware/auth.js): nothing but the email code works, so nothing else
// is shown. Renders nothing for everyone else.
export default function HeldAccountGate() {
  const { isLoggedIn, currentUser } = useApp();
  if (!isLoggedIn || !currentUser?.access_hold) return null;
  return <VerifyEmailScreen />;
}
