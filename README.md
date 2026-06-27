# Inzozi Motors — Mobile App (Frontend)

A premium used-car marketplace app built with **React Native + Expo**, implementing the
visual design from `Inzozi Motors.html`. Buy, sell, and auction inspected vehicles with
escrow-protected payments and 7-day returns.

> **Frontend only.** All data is mocked (`src/data/cars.js`). No backend, auth, or payments
> are wired up — buttons navigate between screens so the full flow is clickable.

## Run it

```bash
npm install
npm start
```

Then:
- Press `w` to open in a **web browser**, or
- Scan the QR code with the **Expo Go** app (iOS/Android), or
- Press `a` / `i` for an Android emulator / iOS simulator.

## Tech stack

| Layer        | Choice                                    |
| ------------ | ----------------------------------------- |
| Framework    | Expo (React Native 0.76)                  |
| Navigation   | React Navigation 7 (native-stack + tabs)  |
| Icons        | `@expo/vector-icons` (Ionicons)           |
| Gradients    | `expo-linear-gradient`                    |
| Vector logo  | `react-native-svg`                        |

## Project structure

```
src/
  theme/            Design tokens — colors, spacing, radius, typography, shadows
  data/             Mock vehicles, sellers, conversations
  components/       Button, Badge, CarCard, Screen, BackHeader, Logo, SectionHeader...
  navigation/       RootNavigator (stack) + TabNavigator (custom raised "Sell" tab)
  screens/          All app screens (see below)
App.js              NavigationContainer + SafeAreaProvider entry
```

## Screens implemented

**Auth / onboarding:** Welcome · Sign Up · Sign In
**Tabs:** Home Feed · Search · Sell · Saved · Profile
**Buyer flow:** Search Results · Filters · Vehicle Detail · Inspection Report · Checkout
**Seller flow:** Seller Dashboard · Listing Wizard (Details → Photos → Pricing)
**Messaging:** Messages · Chat
**Account:** Settings

## Design tokens

Brand navy `#0A1A3F` · Primary blue `#2563EB` · Success green `#059669` · Amber `#F59E0B`.
Headings use weight 800 with tight letter-spacing. See `src/theme/`.

## Next steps (backend)

When you're ready to make it real, wire up:
- **Supabase** — auth, Postgres (cars / users / auctions / messages), storage for photos
- **Stripe** — escrow checkout & financing
- **Supabase Realtime / Pusher** — live auction bidding
- **react-native-maps** — the Map View screen
