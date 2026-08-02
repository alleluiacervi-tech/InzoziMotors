// Expo config as JS so the API host can come from the environment instead of
// being frozen into the bundle. Precedence:
//   EXPO_PUBLIC_API_URL  →  per-profile default (eas.json)  →  local dev host
//
// The mobile app is NOT hosted anywhere — it ships through the App Store and
// Play Store and talks to the backend on the VPS. Anything the app must know
// about that server has to travel through here.

const DEV_FALLBACK = null; // resolved on-device in src/api/client.js

export default ({ config }) => ({
  ...config,
  name: 'Sawa Cars',
  slug: 'sawa',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'sawa',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  // Only what the app actually shows. '**/*' also shipped about.png, sawa.png
  // and refference.png — roughly 4 MB of marketing and design-reference art
  // that no screen requires — into every download.
  assetBundlePatterns: [
    'assets/cars/**',
    'assets/fonts/**',
    'assets/welcome-hero.jpg',
    'assets/icon.png',
    'assets/adaptive-icon.png',
    'assets/splash.png',
    'assets/favicon.png',
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.sawacars.app',
    // Universal Links. Pairs with web/public/.well-known/apple-app-site-association,
    // whose appID placeholder must be replaced with the real Team ID before
    // these verify — until then iOS silently falls back to opening Safari.
    associatedDomains: [
      'applinks:sawacars.com',
      'applinks:www.sawacars.com',
    ],
    infoPlist: {
      // Seller KYC documents and the 36-angle listing shoot both need the camera
      NSCameraUsageDescription:
        'Sawa uses the camera to photograph your ID for seller verification and to capture vehicle photos.',
      NSPhotoLibraryUsageDescription:
        'Sawa needs access to your photos so you can attach existing vehicle or ID images.',
    },
  },
  android: {
    adaptiveIcon: {
      // The foreground is the white "S" on transparency; the launcher paints
      // this colour behind it and applies its own mask.
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#CC050F',
    },
    package: 'com.sawacars.app',
    permissions: ['CAMERA', 'READ_MEDIA_IMAGES'],
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
      'expo-image-picker',
      {
        photosPermission:
          'Sawa needs access to your photos so you can attach existing vehicle or ID images.',
        cameraPermission:
          'Sawa uses the camera to photograph your ID for seller verification and to capture vehicle photos.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/adaptive-icon.png',
        color: '#CC050F',
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
      // Filled in by `eas init` — required before the first cloud build.
      projectId: process.env.EAS_PROJECT_ID || undefined,
    },
  },
});
