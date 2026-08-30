import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AppProvider } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';
import linking from './src/navigation/linking';
import { navigationRef, initPushNavigation, flushPendingPushNavigation } from './src/utils/pushNavigation';
import AnimatedSplash from './src/components/AnimatedSplash';
import ErrorBoundary from './src/components/ErrorBoundary';
import FeedbackHost from './src/components/Feedback';
import UpdateBanner from './src/components/UpdateBanner';
import { getJSON } from './src/storage';

export default function App() {
  // Satoshi (Indian Type Foundry, Fontshare) — bundled rather than fetched, so
  // the first frame is never unstyled. It ships 400/500/700/900 only; the
  // theme's six weight slots collapse onto those four (see src/theme/index.js).
  const [fontsLoaded, fontError] = useFonts({
    'Satoshi-Regular': require('./assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Medium': require('./assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-Bold': require('./assets/fonts/Satoshi-Bold.ttf'),
    'Satoshi-Black': require('./assets/fonts/Satoshi-Black.ttf'),
  });
  const [splashDone, setSplashDone] = useState(false);
  const [initialRoute, setInitialRoute] = useState(null);

  // Where a launch lands.
  //
  // Onboarding is a first-run explanation, and Welcome is a sign-in door. A
  // person who has already seen both and closed the app should reopen it on the
  // marketplace — not be walked past the pitch and the door again every single
  // time. Browsing needs no account (contact is gated at the point of contact,
  // not at the front of the app), and Profile carries a Sign in for anyone
  // signed out, so nothing is unreachable by skipping Welcome.
  //
  // A storage failure lands on Main for the same reason: an existing user
  // stranded on a marketing screen is a worse outcome than a brand-new user who
  // misses the tour.
  useEffect(() => {
    getJSON('onboardingSeen', false)
      .then((seen) => setInitialRoute(seen ? 'Main' : 'Onboarding'))
      .catch(() => setInitialRoute('Main'));
  }, []);

  // Route push-notification taps to their subject (chat thread, car, order).
  useEffect(() => initPushNavigation(), []);

  // Fonts gate everything (the splash itself uses them); the storage read only
  // gates the navigator — the splash shows immediately and covers the wait.
  // If loading *fails*, fontsLoaded stays false forever — proceeding with the
  // system typeface beats a permanent white screen (unknown fontFamily names
  // fall back natively on both platforms).
  if (!fontsLoaded && !fontError) return null;

  return (
    // Outermost on purpose: a throw anywhere — a screen, the navigator, the
    // context provider itself — lands here instead of a permanent white
    // screen. Reload remounts the whole tree.
    <ErrorBoundary>
    <AppProvider>
      <SafeAreaProvider>
        {initialRoute && (
          // `linking` is what makes sawa://cars/<id> and https://sawacars.com/cars/<id>
          // land on the car rather than the home feed. Without it the website's
          // "Open in app" buttons and every push-notification tap on a cold
          // start discarded their path. See src/navigation/linking.js.
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            onReady={flushPendingPushNavigation}
          >
            <StatusBar style="dark" />
            <RootNavigator initialRoute={initialRoute} />
          </NavigationContainer>
        )}
        {/* Floats over the app when a downloaded update is waiting. Renders
            nothing at all otherwise, and nothing ever in a dev build. */}
        <UpdateBanner />
        <FeedbackHost />
        {(!splashDone || !initialRoute) && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
      </SafeAreaProvider>
    </AppProvider>
    </ErrorBoundary>
  );
}
