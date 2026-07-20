import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { AppProvider } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';
import AnimatedSplash from './src/components/AnimatedSplash';
import FeedbackHost from './src/components/Feedback';
import { getJSON } from './src/storage';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
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
