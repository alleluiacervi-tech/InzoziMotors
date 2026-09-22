import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useFonts } from 'expo-font';
import { AppProvider } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';
import linking from './src/navigation/linking';
import { navigationRef, initPushNavigation, flushPendingPushNavigation } from './src/utils/pushNavigation';
import AnimatedSplash from './src/components/AnimatedSplash';
import ErrorBoundary from './src/components/ErrorBoundary';
import FeedbackHost from './src/components/Feedback';
import UpdateBanner from './src/components/UpdateBanner';
import StoreUpdateGate from './src/components/StoreUpdateGate';
import { getJSON } from './src/storage';

// Light icons on the dark theme, dark icons on the light theme — the
// inverse of the background, which is what makes status-bar content
// readable in both. Split out because App() renders ThemeProvider and
// cannot itself read the context it renders.
function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

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
  // null while the storage read is in flight, then true only on the very first
  // launch after an install.
  const [firstRun, setFirstRun] = useState(null);

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
  //
  // The same read decides whether the branded splash runs at all. It is a
  // tap-through screen with no auto-dismiss — a genuine brand moment the first
  // time, and a toll booth every time after that. Somebody opening the app to
  // check one price should get the marketplace, not a logo animation and a
  // Next button. So it plays once, on the launch that also shows the tour, and
  // never again.
  useEffect(() => {
    getJSON('onboardingSeen', false)
      .then((seen) => { setFirstRun(!seen); setInitialRoute(seen ? 'Main' : 'Onboarding'); })
      .catch(() => { setFirstRun(false); setInitialRoute('Main'); });
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
    {/* Outermost of the interactive tree, on purpose: gesture-handler only
        recognizes gestures on views beneath a GestureHandlerRootView, and
        putting it anywhere but the top silently breaks gestures started from
        a modal or a screen mounted outside that subtree. flex: 1 is required —
        without it the root view collapses to zero height on Android and every
        gesture in the app stops responding, a failure mode with no error and
        no stack trace. */}
    <GestureHandlerRootView style={styles.root}>
    <ThemeProvider>
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
            <ThemedStatusBar />
            <RootNavigator initialRoute={initialRoute} />
          </NavigationContainer>
        )}
        {/* Floats over the app when a downloaded update is waiting. Renders
            nothing at all otherwise, and nothing ever in a dev build. */}
        <UpdateBanner />
        {/* The other kind of update: a new BINARY, which only a store can
            give you. Silent unless the server says one exists. */}
        <StoreUpdateGate />
        <FeedbackHost />
        {firstRun && !splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
        {/* The storage read above takes a few milliseconds, and the native
            splash has already handed over by the time it resolves. Without
            this a returning launch flashes whatever is behind the tree before
            the navigator mounts. Same white the native splash uses, so the
            handover is invisible rather than a blink. */}
        {!initialRoute && <View style={styles.launchCover} />}
      </SafeAreaProvider>
    </AppProvider>
    </ThemeProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Deliberately NOT theme-aware — see the comment above where this is
  // rendered. It must match the native splash screen's own fixed white,
  // not the app's current theme.
  launchCover: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF', zIndex: 99 },
});
