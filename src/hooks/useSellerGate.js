import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { showConfirm, showToast } from '../components/Feedback';

// Sellers may submit first; the team verifies identity during onboarding and
// inspection. Identity remains mandatory before a listing or contact channel
// can become public, but it must not block the workflow that obtains it.
//
//   const gate = useSellerGate(navigation);
//   <Pressable onPress={() => gate('CarSubmission')} />
//
// Returns true only when the caller was allowed through and navigation happened.
export function useSellerGate(navigation) {
  const { isLoggedIn, idVerificationStatus } = useApp();

  return useCallback(
    async (destination, params) => {
      if (!isLoggedIn) {
        const ok = await showConfirm({
          title: 'Sign in to sell',
          message: 'Selling on Sawa Cars needs an account — we verify every seller before a car goes live.',
          confirmLabel: 'Sign In',
          cancelLabel: 'Not now',
        });
        if (ok) navigation.navigate('SignIn');
        return false;
      }

      if (idVerificationStatus !== 'approved') {
        showToast('You can submit now. Identity approval is required before your listing and contact details become public.', 'info');
      }
      navigation.navigate(destination, params);
      return true;
    },
    [isLoggedIn, idVerificationStatus, navigation]
  );
}

export default useSellerGate;
