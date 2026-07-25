import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TabNavigator from './TabNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SignInScreen from '../screens/SignInScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import FiltersScreen from '../screens/FiltersScreen';
import SellerDashboardScreen from '../screens/SellerDashboardScreen';
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
import SavedScreen from '../screens/SavedScreen';
import ComparisonScreen from '../screens/ComparisonScreen';
import MapScreen from '../screens/MapScreen';
import DutyCalculatorScreen from '../screens/DutyCalculatorScreen';
// Phase 5 — Growth Features
import SellerAnalyticsScreen from '../screens/SellerAnalyticsScreen';
import AdminAnalyticsScreen from '../screens/AdminAnalyticsScreen';
import DealerProfileScreen from '../screens/DealerProfileScreen';
import FinancingScreen from '../screens/FinancingScreen';
import TrustScoreScreen from '../screens/TrustScoreScreen';
import ReferralScreen from '../screens/ReferralScreen';
// Rentals
import RentalDetailScreen from '../screens/RentalDetailScreen';
import RentalBookingScreen from '../screens/RentalBookingScreen';
import MyRentalsScreen from '../screens/MyRentalsScreen';
import RentalCheckInScreen from '../screens/RentalCheckInScreen';
// Seller tools
import SellScreen from '../screens/SellScreen';
import CarValuationScreen from '../screens/CarValuationScreen';
// Trust
import InzoziPromiseScreen from '../screens/InzoziPromiseScreen';
import BuyingGuideScreen from '../screens/BuyingGuideScreen';
import ShowroomScreen from '../screens/ShowroomScreen';
import DisputesScreen from '../screens/DisputesScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator({ initialRoute = 'Onboarding' }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="Filters" component={FiltersScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} />
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
      <Stack.Screen name="Saved" component={SavedScreen} />
      <Stack.Screen name="Comparison" component={ComparisonScreen} />
      <Stack.Screen name="MapView" component={MapScreen} />
      <Stack.Screen name="DutyCalculator" component={DutyCalculatorScreen} />
      {/* Phase 5 */}
      <Stack.Screen name="SellerAnalytics" component={SellerAnalyticsScreen} />
      <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
      <Stack.Screen name="DealerProfile" component={DealerProfileScreen} />
      <Stack.Screen name="Financing" component={FinancingScreen} />
      <Stack.Screen name="TrustScore" component={TrustScoreScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      {/* Rentals */}
      <Stack.Screen name="RentalDetail" component={RentalDetailScreen} />
      <Stack.Screen
        name="RentalBooking"
        component={RentalBookingScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="MyRentals" component={MyRentalsScreen} />
      <Stack.Screen name="RentalCheckIn" component={RentalCheckInScreen} />
      <Stack.Screen name="Sell" component={SellScreen} />
      <Stack.Screen name="CarValuation" component={CarValuationScreen} />
      <Stack.Screen name="InzoziPromise" component={InzoziPromiseScreen} />
      <Stack.Screen name="BuyingGuide" component={BuyingGuideScreen} />
      <Stack.Screen name="Showroom" component={ShowroomScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Disputes" component={DisputesScreen} />
    </Stack.Navigator>
  );
}
