// Expo config as JS so the API host can come from the environment instead of
// being frozen into the bundle. Precedence:
//   EXPO_PUBLIC_API_URL  →  per-profile default (eas.json)  →  local dev host
//
// The mobile app is NOT hosted anywhere — it ships through the App Store and
// Play Store and talks to the backend on the VPS. Anything the app must know
// about that server has to travel through here.

const DEV_FALLBACK = null; // resolved on-device in src/api/client.js
const EAS_PROJECT_ID = 'f2c5d3f8-8777-4b97-96ec-1482d374a42a';

export default ({ config }) => ({
  ...config,
  name: 'Sawa Cars',
  slug: 'sawa-cars',
  owner: 'alleluiacervi',
  // A literal, deliberately. This briefly read
  // `process.env.APP_VERSION || '1.0.4'`, which existed only so the publish
  // workflow could force a runtime version and fan one bundle out to every
  // historical runtime — the change that crashed the app on launch. With the
  // override in place, `runtimeVersion` below silently becomes whatever an
  // environment variable says, and Constants.expoConfig.version reports that
  // forged value rather than the binary's real one, so the app misreports its
  // own version. The build and the publish must agree on this number, and the
  // only way to guarantee that is for it not to be configurable.
  version: '1.0.6',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'sawa',
  // 'automatic': lets useColorScheme() actually report the OS setting.
  // This was hard-locked to 'light', which is a stronger claim than it looks
  // — RN's useColorScheme() reports whatever userInterfaceStyle allows, so
  // the app could not have detected system dark mode even if every screen
  // were theme-aware. ThemeContext.js still layers its own System/Light/Dark
  // override on top and defaults to System, so this only changes what the
  // platform reports as the starting signal, not the final decision.
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    // Never hold the splash screen waiting on the network. A launch on a weak
    // connection must start the app from the bundle it already has; the new one
    // downloads behind it and src/components/UpdateBanner offers to apply it.
    // The default is already 0, but a launch-blocking timeout is the kind of
    // thing that gets added later "just to be safe" and is then very hard to
    // notice, so it is written down.
    fallbackToCacheTimeout: 0,
    checkAutomatically: 'ON_LOAD',
  },
  // The OTA compatibility key. Every build of a given `version` can receive any
  // update published from a tree at that same version, which is what makes
  // shipping a fix without a store review possible. Bumping `version` above
  // deliberately cuts that line: installs on the old version stop receiving
  // updates and need a new build from the store, because a native change cannot
  // travel over the air. src/utils/updates.js says exactly that to the user
  // rather than offering a button that would do nothing.
  runtimeVersion: {
    policy: 'appVersion',
  },
  // Configured through the expo-splash-screen plugin below — a top-level
  // `splash` key does nothing without that package installed, which is
  // exactly the state this repo shipped in for months: the key was here,
  // the package wasn't, and every launch was a plain white flash.
  // Only what the app actually shows. '**/*' also shipped about.png, sawa.png
  // and refference.png — roughly 4 MB of marketing and design-reference art
  // that no screen requires — into every download.
  assetBundlePatterns: [
    'assets/cars/**',
    'assets/banks/**',
    'assets/fonts/**',
    'assets/welcome-hero.jpg',
    'assets/icon.png',
    'assets/adaptive-icon.png',
    'assets/splash.png',
    'assets/favicon.png',
  ],
  ios: {
    // Phone-first for v1: the app is portrait-locked and untested on iPad, and
    // supportsTablet commits the submission to iPad screenshots and makes any
    // iPad layout bug a rejection basis. Opt in deliberately later, not by default.
    supportsTablet: false,
    bundleIdentifier: 'com.sawacars.app',
    // Universal Links. Pairs with web/public/.well-known/apple-app-site-association,
    // whose appID placeholder must be replaced with the real Team ID before
    // these verify — until then iOS silently falls back to opening Safari.
    associatedDomains: [
      'applinks:sawacars.com',
      'applinks:www.sawacars.com',
    ],
    infoPlist: {
      // Seller KYC documents and the flexible listing gallery need the camera.
      NSCameraUsageDescription:
        'Sawa uses the camera to photograph your ID for seller verification and to capture vehicle photos.',
      NSPhotoLibraryUsageDescription:
        'Sawa needs access to your photos so you can attach existing vehicle or ID images.',
      // Only standard HTTPS/ATS encryption — answering here skips the export-
      // compliance question that otherwise stalls every App Store submission.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      // The foreground is the white "S" on transparency; the launcher paints
      // this colour behind it and applies its own mask.
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#CC050F',
    },
    // Differs from the iOS bundle id on purpose: com.sawacars.app is held by a
    // personal Play account, so the company account publishes under this name.
    package: 'com.sawacars.android',
    permissions: [
      'CAMERA',
      'android.permission.POST_NOTIFICATIONS',
    ],
    // The merged manifest must match what the app actually does:
    //  · RECORD_AUDIO — injected by expo-image-picker for video capture, but
    //    every picker call in src/utils/media.js is mediaTypes: ['images'].
    //  · READ_MEDIA_IMAGES — requested by NO code path on ANY OS version:
    //    on Android 13+ the picker resolves to the system photo picker (no
    //    permission), on ≤12 it uses READ_EXTERNAL_STORAGE. Declaring it only
    //    dragged the app into Play's Photo & Video Permissions review.
    //  · READ/WRITE_EXTERNAL_STORAGE stay UNBLOCKED on purpose: the picker's
    //    runtime still requests them on devices running Android ≤12 — a real
    //    share of phones here — and a manifest block would auto-deny those
    //    requests and silently break "choose from library" on exactly those
    //    devices.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_MEDIA_IMAGES',
    ],
    // App Links. `autoVerify` is what makes Android open these in the app
    // rather than offering a chooser, and it depends on
    // web/public/.well-known/assetlinks.json carrying the real Play App
    // Signing SHA-256 — the placeholder there must be replaced first.
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'sawacars.com', pathPrefix: '/cars' },
          { scheme: 'https', host: 'www.sawacars.com', pathPrefix: '/cars' },
          { scheme: 'https', host: 'sawacars.com', pathPrefix: '/rentals' },
          { scheme: 'https', host: 'www.sawacars.com', pathPrefix: '/rentals' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-asset',
    'expo-font',
    'expo-secure-store',
    [
      // The native launch screen — what shows before the JS bundle (and the
      // AnimatedSplash it renders) has loaded.
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Sawa needs access to your photos so you can attach existing vehicle or ID images.',
        cameraPermission:
          'Sawa uses the camera to photograph your ID for seller verification and to capture vehicle photos.',
        // Exactly false, not omitted: the config plugin only DELETES
        // NSMicrophoneUsageDescription for === false — anything else ships
        // Expo's generic boilerplate for a microphone the app never uses,
        // which surfaces in the App Store privacy disclosure.
        microphonePermission: false,
      },
    ],
    [
      // Play Store requires new apps to target API 36 — pin it rather than
      // inheriting whatever the SDK default happens to be at build time.
      'expo-build-properties',
      {
        android: { compileSdkVersion: 36, targetSdkVersion: 36 },
      },
    ],
    [
      // Real push notifications (src/utils/push.js, src/utils/pushNavigation.js).
      // On Android this plugin is what adds POST_NOTIFICATIONS (API 33+) to the
      // manifest — nothing to declare by hand. icon must be a white silhouette
      // on transparency (the OS tints and masks it itself), so it reuses the
      // adaptive-icon's own foreground rather than a second asset to keep in
      // sync. This alone does not make push live: it still needs a real APNs
      // key (iOS) and FCM config (Android) uploaded via `eas credentials`, and
      // a native rebuild + store resubmission — see CLAUDE.md section 5.
      'expo-notifications',
      {
        icon: './assets/adaptive-icon.png',
        color: '#CC050F',
      },
    ],
  ],
  extra: {
    // Set EXPO_PUBLIC_API_URL in eas.json (per profile) or the shell for local
    // device testing against a LAN address. Null means "auto-detect dev host".
    apiUrl: process.env.EXPO_PUBLIC_API_URL || DEV_FALLBACK,
    // The public website. The app links out to it for the privacy policy and
    // terms — pages Google Play requires to be reachable from inside the app,
    // and which have to be one text rather than two copies that drift.
    siteUrl: process.env.EXPO_PUBLIC_SITE_URL || 'https://sawacars.com',
    eas: {
      // Public project identity (not a credential). Keeping it in source makes
      // release builds and Expo push-token registration resolve the same EAS
      // project on every machine; the environment override remains useful for
      // an intentionally separate staging project.
      projectId: process.env.EAS_PROJECT_ID || EAS_PROJECT_ID,
    },
  },
});
