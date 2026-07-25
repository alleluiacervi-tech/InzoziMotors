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
  name: 'Inzozi Motors',
  slug: 'inzozi-motors',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'inzozimotors',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.inzozi.motors',
    infoPlist: {
      // Seller KYC documents and the 36-angle listing shoot both need the camera
      NSCameraUsageDescription:
        'Inzozi Motors uses the camera to photograph your ID for seller verification and to capture vehicle photos.',
      NSPhotoLibraryUsageDescription:
        'Inzozi Motors needs access to your photos so you can attach existing vehicle or ID images.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    package: 'com.inzozi.motors',
    permissions: ['CAMERA', 'READ_MEDIA_IMAGES'],
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
          'Inzozi Motors needs access to your photos so you can attach existing vehicle or ID images.',
        cameraPermission:
          'Inzozi Motors uses the camera to photograph your ID for seller verification and to capture vehicle photos.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/adaptive-icon.png',
        color: '#DB0632',
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
    eas: {
      // Filled in by `eas init` — required before the first cloud build.
      projectId: process.env.EAS_PROJECT_ID || undefined,
    },
  },
});
