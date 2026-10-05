# Sign in with Google and Apple

Where each option appears:

| | Google | Apple |
|---|---|---|
| App, iPhone | yes | yes |
| App, Android | yes | no (Apple's sheet is iOS-only) |
| Website | yes | **no, by decision** |

An account made with Apple in the app can still use the website: *Forgot
password* on sawacars.com sets a password for it. The code ships **off**: a button appears only once its provider is configured, so
nobody is shown a button that cannot work. This page is everything a person has
to do to switch it on.

## How it works

- **One account per person.** The first Google/Apple sign-in either finds the
  account already linked to that provider, or joins the existing account with
  the same *provider-verified* email, or creates a new password-less account
  (`user_identities`, migration 0056). An unverified email that matches an
  existing account is refused (`EMAIL_IN_USE`), never merged.
- **What a provider cannot give, we ask once.** Google and Apple supply a name
  and email, never a phone number or buyer/seller choice. Right after sign-up,
  a new account is shown *One last step* (web `/signup/complete`, app
  `CompleteProfile`). **Signing in never asks for a phone**, even if that step
  was skipped; the number can be added later in the profile.
  `POST /auth/oauth/complete-profile` works once only.
- **Same rules as a password.** Admins must use their password
  (`ADMIN_PASSWORD_ONLY`); suspended or deleted accounts are refused; a closed
  account inside its 30 days is offered *Reopen*, exactly as at password sign-in.
- **Tokens are verified, never trusted.** The API checks each ID token's
  signature against Google's and Apple's published keys, its issuer, its
  audience (the client ids below), expiry and nonce (`backend/src/lib/oauth.js`).
- **Closing an account revokes Apple's tokens** (App Store guideline 5.1.1(v)),
  using the Sign in with Apple key (`backend/src/lib/apple-tokens.js`).
- **Website**: Google's server-side flow, authorization code + PKCE. State,
  nonce and verifier live in a 10-minute httpOnly SameSite=Lax cookie, and
  the session ends up in the same httpOnly `sawa_session` cookie as a password
  sign-in. No provider SDK reaches the browser.
- **App**: native sheets — `expo-apple-authentication` (iOS only) and
  `@react-native-google-signin/google-signin`. These are native modules, so they
  arrive in **store build 1.0.9**, never over the air.

## 1. Google (Google Cloud Console)

Project → *APIs & Services*.

1. **OAuth consent screen / Branding**: app name *Sawa Cars*, the logo, support
   email, home page `https://sawacars.com`, privacy policy
   `https://sawacars.com/legal/privacy`, terms `https://sawacars.com/legal/terms`,
   authorised domain `sawacars.com`. Scopes: `openid`, `email`, `profile` only
   (no verification review is needed for these). Submit for **brand
   verification** so the sheet shows "Sawa Cars" and the logo rather than the
   bare domain. Set publishing status to *In production*.
2. **Credentials → Create OAuth client ID**, three times:
   | Type | Settings | Used by |
   |---|---|---|
   | Web application | Authorised redirect URI `https://sawacars.com/api/auth/oauth/google/callback` | website; also the audience of the app's ID tokens |
   | iOS | Bundle ID `com.sawacars.app` | the iOS app's native sheet |
   | Android | Package `com.sawacars.apps`, SHA-1 of the **Play App Signing** key (Play Console → *Test and release → App integrity*). Add a second Android client with the upload key's SHA-1 for internal builds. | the Android app |

   The **upload key** is the EAS keystore *Build Credentials 4RrJX5tVp0*
   (production, created 5 Oct 2026; fingerprints are public, not secrets):
   - SHA-1 `3D:DC:17:C4:83:B9:98:7A:B3:2E:22:06:B4:E9:3A:C6:14:0B:22:AB`
   - SHA-256 `B0:5B:F0:D2:1E:3D:7E:3B:27:D0:9B:DB:8E:5B:A9:61:E9:8A:17:34:5F:9B:59:F4:D5:DF:EC:B3:4C:B0:0A:06`
     (already in `assetlinks.json`)

   Play re-signs every build it distributes, internal testing included, with
   its own **app signing key**, which exists only after the first `.aab` is
   uploaded. Until that client exists, Google sign-in works only in EAS-built
   APKs, not in builds installed from Play.

## 2. Apple (developer.apple.com, Team `5Z2LA9U639`)

1. **Identifiers → `com.sawacars.app`**: tick *Sign in with Apple* (primary App
   ID). The app already declares the entitlement (`ios.usesAppleSignIn`).
2. **Keys → +**: tick *Sign in with Apple*, primary App ID `com.sawacars.app`.
   Download the `.p8` (only once) and note its Key ID.
3. **Services → Sign in with Apple for Email Communication**: register
   `sawacars.com` and the sender `no-reply@sawacars.com`. Without this, mail to
   people who chose *Hide My Email* (`@privaterelay.appleid.com`) is dropped.

## 3. Where each value goes

Production values go in the VPS's `.env` (read by `docker-compose.prod.yml`) and
in EAS environment variables. Never commit them.

| Variable | Where | Value |
|---|---|---|
| `GOOGLE_CLIENT_IDS` | backend | Web, iOS and Android client ids, comma-separated |
| `APPLE_CLIENT_IDS` | backend | `com.sawacars.app` |
| `APPLE_TEAM_ID` | backend | `5Z2LA9U639` |
| `APPLE_KEY_ID` | backend | the key's id from step 2.2 |
| `APPLE_PRIVATE_KEY` | backend | the `.p8` contents on one line, newlines as `\n` |
| `GOOGLE_CLIENT_ID` | web | the **Web** client id |
| `GOOGLE_CLIENT_SECRET` | web | the Web client's secret |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | EAS (production) | the **Web** client id |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | EAS (production) | the **iOS** client id (also sets the app's URL scheme) |

Then redeploy the API and website (`ops.yml` or the next merge to `main`), and
build the app (1.0.9) after the EAS variables are set: the Google iOS URL scheme
is baked into the build.

## 4. Check it

- `curl https://api.sawacars.com/auth/oauth/providers` → `{"google":true,"apple":true}`.
- sawacars.com/signin shows *Continue with Google*; a new Google account lands on
  *One last step*, then the page it came from.
- In the app (1.0.9, iPhone): *Continue with Apple* and *Continue with Google*
  on the sign-in and sign-up screens; Android shows Google only.
- Close a test account signed up with Apple: the Apple ID's *Sign in with
  Apple* list (Settings → Apple ID → Sign-In & Security) no longer shows Sawa
  Cars.

## Troubleshooting

| Symptom | Cause |
|---|---|
| No buttons anywhere | `GOOGLE_CLIENT_IDS` / `APPLE_CLIENT_IDS` empty on the API |
| Website button missing | `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` missing on the web container |
| Google `redirect_uri_mismatch` | the Web client's redirect URI does not match exactly |
| Sign-in works then "not available right now" | the API does not list that client id in `GOOGLE_CLIENT_IDS` / `APPLE_CLIENT_IDS` |
| Android `DEVELOPER_ERROR` | the Android client's SHA-1 is not the key that signed this build |
| App shows no Google button | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` not set when the build was made |
