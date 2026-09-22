// gesture-handler must be the FIRST import in the entry file — it patches
// the native event system before anything else touches it, and importing it
// later (even one line into App.js) leaves Android's gesture responder chain
// half-configured. This is a documented Expo/RNGH requirement, not a style
// choice.
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
