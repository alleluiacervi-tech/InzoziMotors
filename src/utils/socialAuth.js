// ─────────────────────────────────────────────────────────────────────────────
// Sign in with Apple (iOS) and Sign in with Google (iOS + Android), natively.
//
// Each returns the payload POST /auth/oauth/:provider expects, or null when the
// person cancelled — a cancel is a choice, not an error, and shows nothing.
// The ID token is verified on the server (backend/src/lib/oauth.js); nothing
// here decides who anybody is.
//
// Availability needs all of:
//   Apple   iOS 13+, and the server's APPLE_CLIENT_IDS (checked by the caller)
//   Google  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (the token's audience), plus
//           EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID on iOS — the same variable
//           app.config.js uses to add the native URL scheme, so a build
//           without it never draws a button that would crash
// ─────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

export function googleConfigured() {
  if (!GOOGLE_WEB_CLIENT_ID) return false;
  return Platform.OS !== 'ios' || Boolean(GOOGLE_IOS_CLIENT_ID);
}

export async function appleAvailable() {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Sign in with Apple. The nonce's SHA-256 goes to Apple and comes back inside
 *  the token; the raw value goes to our server, which checks the two match. */
export async function signInWithApple() {
  const nonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error('Apple did not return a sign-in token.');
    return {
      id_token: credential.identityToken,
      nonce,
      // Apple shares the name once, on the very first authorization, and only
      // here — never inside the token. Sent now or never known.
      full_name: credential.fullName
        ? { givenName: credential.fullName.givenName, familyName: credential.fullName.familyName }
        : null,
      // Exchanged by the server for the token it must revoke at account deletion.
      authorization_code: credential.authorizationCode || null,
    };
  } catch (err) {
    if (err?.code === 'ERR_REQUEST_CANCELED') return null;
    throw err;
  }
}

let googleConfiguredOnce = false;

/** Sign in with Google. The token's audience is the web client id, which is
 *  what the server is configured to accept from every client. */
export async function signInWithGoogle() {
  if (!googleConfiguredOnce) {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      offlineAccess: false,
    });
    googleConfiguredOnce = true;
  }
  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();
    // v13+ answers { type: 'success' | 'cancelled', data }; older versions
    // returned the user directly. Read both so a library bump cannot break this.
    if (response?.type === 'cancelled') return null;
    const idToken = response?.data?.idToken ?? response?.idToken;
    if (!idToken) throw new Error('Google did not return a sign-in token.');
    // Forget the Google session on this device: on a shared phone the next
    // person must get the account chooser, not the previous person's account.
    GoogleSignin.signOut().catch(() => {});
    return { id_token: idToken };
  } catch (err) {
    if (err?.code === statusCodes.SIGN_IN_CANCELLED) return null;
    if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      const e = new Error('PLAY_SERVICES');
      e.code = 'PLAY_SERVICES';
      throw e;
    }
    throw err;
  }
}
