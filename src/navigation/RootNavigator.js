import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TabNavigator from './TabNavigator';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SignInScreen from '../screens/SignInScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import FiltersScreen from '../screens/FiltersScreen';
import SellerDashboardScreen from '../screens/SellerDashboardScreen';
import ListingWizardScreen from '../screens/ListingWizardScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import InspectionReportScreen from '../screens/InspectionReportScreen';
import SettingsScreen from '../screens/SettingsScreen';
// Phase 1 — New screens
import IDVerificationScreen from '../screens/IDVerificationScreen';
import CarSubmissionScreen from '../screens/CarSubmissionScreen';
import InspectionSchedulingScreen from '../screens/InspectionSchedulingScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
// Phase 2 — Trust Engine
import InspectionFormScreen from '../screens/InspectionFormScreen';
import PhotoUploadScreen from '../screens/PhotoUploadScreen';
import VehicleHistoryScreen from '../screens/VehicleHistoryScreen';
import SellerProfileScreen from '../screens/SellerProfileScreen';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';
// Phase 3 — Communication & Transactions
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
// Phase 4 — Buyer Power Tools
import ComparisonScreen from '../screens/ComparisonScreen';
import MapScreen from '../screens/MapScreen';
import DutyCalculatorScreen from '../screens/DutyCalculatorScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="Filters" component={FiltersScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} />
      <Stack.Screen name="ListingWizard" component={ListingWizardScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="InspectionReport" component={InspectionReportScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      {/* Phase 1 */}
      <Stack.Screen name="IDVerification" component={IDVerificationScreen} />
      <Stack.Screen name="CarSubmission" component={CarSubmissionScreen} />
      <Stack.Screen
        name="InspectionScheduling"
        component={InspectionSchedulingScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
      {/* Phase 2 */}
      <Stack.Screen name="InspectionForm" component={InspectionFormScreen} />
      <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
      <Stack.Screen name="VehicleHistory" component={VehicleHistoryScreen} />
      <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
      {/* Phase 3 */}
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      {/* Phase 4 */}
      <Stack.Screen name="Comparison" component={ComparisonScreen} />
      <Stack.Screen name="MapView" component={MapScreen} />
      <Stack.Screen name="DutyCalculator" component={DutyCalculatorScreen} />
    </Stack.Navigator>
  );
}
