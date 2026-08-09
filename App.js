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
import FeedbackHost from './src/components/Feedback';
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

  useEffect(() => {
    getJSON('onboardingSeen', false)
      .then((seen) => setInitialRoute(seen ? 'Welcome' : 'Onboarding'))
      .catch(() => setInitialRoute('Welcome'));
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
        <FeedbackHost />
        {(!splashDone || !initialRoute) && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
      </SafeAreaProvider>
    </AppProvider>
  );
}
