import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AppProvider } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';
import AnimatedSplash from './src/components/AnimatedSplash';
import FeedbackHost from './src/components/Feedback';
import { getJSON } from './src/storage';

export default function App() {
  // Satoshi (Indian Type Foundry, Fontshare) — bundled rather than fetched, so
  // the first frame is never unstyled. It ships 400/500/700/900 only; the
  // theme's six weight slots collapse onto those four (see src/theme/index.js).
  const [fontsLoaded] = useFonts({
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

  // Fonts gate everything (the splash itself uses them); the storage read only
  // gates the navigator — the splash shows immediately and covers the wait.
  if (!fontsLoaded) return null;

  return (
    <AppProvider>
      <SafeAreaProvider>
        {initialRoute && (
          <NavigationContainer>
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
