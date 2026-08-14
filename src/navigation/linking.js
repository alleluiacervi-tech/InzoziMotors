// ─────────────────────────────────────────────────────────────────────────────
// Deep link routing.
//
// The website has been advertising links the app could not answer. Every "Open
// in app" button fires a sawa:// URL (web/src/components/app/useDeepLink.ts),
// and web/public/.well-known/ serves both an apple-app-site-association and an
// assetlinks.json — but the app declared no associatedDomains, no
// intentFilters, and passed no linking config to NavigationContainer. Universal
// links did not work at all, and the custom scheme opened the app on the home
// feed with the path thrown away.
//
// Paths are deliberately identical to the website's own URLs (/cars/<id>,
// /rentals/<id>), so one string serves both the https link and the scheme link
// and there is nothing to keep in sync. The web side emits the same shape.
//
// No expo-linking dependency: the scheme is already declared in app.config.js,
// and hardcoding it here would be a second source of truth for the same value.
// ─────────────────────────────────────────────────────────────────────────────

export const linking = {
  prefixes: [
    'sawa://',
    'https://sawacars.com',
    'https://www.sawacars.com',
  ],

  config: {
    screens: {
      // A deep link carries an id, never a car object — the detail screens
      // fetch when they receive carId/rentalId instead of car.
      VehicleDetail: 'cars/:carId',
      RentalDetail: 'rentals/:rentalId',
      InspectionReport: 'cars/:carId/inspection',
      OrderTracking: 'orders/:bookingId',
      // Push-notification taps land here (see src/utils/pushNavigation.js) —
      // a "New message" push carries conversationId in its data payload.
      Chat: 'chat/:convId',
      Messages: 'messages',
      Disputes: 'disputes',
      NotificationCenter: 'notifications',
      SellerDashboard: 'selling',
      ImportOrders: 'imports',
      SawaPromise: 'promise',
      BuyingGuide: 'how-it-works',
      DutyCalculator: 'tools/import-duty',
      Financing: 'tools/finance',
      CarValuation: 'tools/valuation',

      Main: {
        screens: {
          Home: '',
          Search: 'search',
          Saved: 'saved',
          Profile: 'account',
        },
      },
    },
  },
};

export default linking;
