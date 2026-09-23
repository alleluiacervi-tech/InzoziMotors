// gesture-handler must be the FIRST import in the entry file — it patches
// the native event system before anything else touches it, and importing it
// later (even one line into App.js) leaves Android's gesture responder chain
// half-configured. This is a documented Expo/RNGH requirement, not a style
// choice.
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import { bootTheme } from './src/theme/boot';

// App (and through it every screen) is required only after the theme is
// chosen: screens build their StyleSheets from `colors` at module load, so
// importing them first would bake the wrong palette into all of them.
function Root() {
  const [App, setApp] = useState(null);
  useEffect(() => {
    bootTheme().then(() => setApp(() => require('./App').default));
  }, []);
  return App ? <App /> : null;
}

registerRootComponent(Root);
