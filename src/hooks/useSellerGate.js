import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { showConfirm, showToast } from '../components/Feedback';

// Inzozi's hard rule: identity is mandatory before a car can enter the
// pipeline. The server enforces it (requireVerified on POST /submissions) —
// this is the friendly front door so the seller meets the requirement where it
// makes sense, not as a 403 after filling in a four-step form.
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
          message: 'Selling on Inzozi needs an account — we verify every seller before a car goes live.',
          confirmLabel: 'Sign In',
          cancelLabel: 'Not now',
        });
        if (ok) navigation.navigate('SignIn');
        return false;
      }

      if (idVerificationStatus === 'approved') {
        navigation.navigate(destination, params);
        return true;
      }

      if (idVerificationStatus === 'pending') {
        showToast('Your identity check is under review — we will notify you within 24 hours.', 'info');
        navigation.navigate('IDVerification');
        return false;
      }

      const rejected = idVerificationStatus === 'rejected';
      const ok = await showConfirm({
        title: rejected ? 'Re-verify your identity' : 'Verify your identity first',
        message: rejected
          ? 'Your last submission was not accepted. Send clearer photos of your ID and we will re-check within 24 hours.'
          : 'Every Inzozi seller is verified before listing — it takes about two minutes and only has to be done once.',
        confirmLabel: rejected ? 'Re-submit Documents' : 'Verify Now',
        cancelLabel: 'Not now',
      });
      if (ok) {
        navigation.navigate('IDVerification', { returnTo: destination, returnParams: params });
      }
      return false;
    },
    [isLoggedIn, idVerificationStatus, navigation]
  );
}

export default useSellerGate;
