import { STUDIO } from './carImageAssets';
// Mock rental fleet — separate inventory from sale listings.
// Every rental car is Sawa-certified (same 150-point inspection as sale cars).

const LEGACY_RENTAL_CARS = [
  {
    id: 'r1',
    title: 'Toyota RAV4 Hybrid',
    make: 'Toyota',
    model: 'RAV4',
    year: 2023,
    category: 'SUV',
    seats: 5,
    fuel: 'Hybrid',
    transmission: 'Automatic',
    mileage: 21000,
    listingType: 'rental',
    dailyRate: 55,
    weeklyRate: 330,
    deposit: 200,
    minDays: 1,
    inspected: true,
    inspectionScore: 148,
    rating: 4.9,
    trips: 42,
    location: 'Nyarutarama, Kigali',
    unavailableDays: [2, 3, 9],
    image: STUDIO.suvSideStudio,
    images: [
      STUDIO.paintWhite,
      STUDIO.suvSide04,
    ],
    seller: 'Sawa Fleet',
  },
  {
    id: 'r2',
    title: 'Toyota Land Cruiser Prado',
    make: 'Toyota',
    model: 'Land Cruiser Prado',
    year: 2022,
    category: 'SUV',
    seats: 7,
    fuel: 'Diesel',
    transmission: 'Automatic',
    mileage: 38000,
    listingType: 'rental',
    dailyRate: 120,
    weeklyRate: 720,
    deposit: 500,
    minDays: 2,
    safariReady: true,
    inspected: true,
    inspectionScore: 146,
    rating: 4.8,
    trips: 67,
    location: 'Kimihurura, Kigali',
    unavailableDays: [0, 1, 6, 7],
    image: STUDIO.paintSilver,
    images: [
      STUDIO.heroSuv,
      STUDIO.paintGrey,
    ],
    seller: 'Sawa Fleet',
  },
  {
    id: 'r3',
    title: 'Toyota Corolla',
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    category: 'Sedan',
    seats: 5,
    fuel: 'Gasoline',
    transmission: 'Automatic',
    mileage: 29000,
    listingType: 'rental',
    dailyRate: 40,
    weeklyRate: 240,
    deposit: 150,
    minDays: 1,
    inspected: true,
    inspectionScore: 145,
    rating: 4.7,
    trips: 89,
    location: 'Remera, Kigali',
    unavailableDays: [4],
    image: STUDIO.suvSide07,
    images: [
      STUDIO.paintBlue,
      STUDIO.paintGlossyGrey,
    ],
    seller: 'Sawa Fleet',
  },
  {
    id: 'r4',
    title: 'Mitsubishi Pajero Sport',
    make: 'Mitsubishi',
    model: 'Pajero Sport',
    year: 2021,
    category: 'SUV',
    seats: 7,
    fuel: 'Diesel',
    transmission: 'Automatic',
    mileage: 52000,
    listingType: 'rental',
    dailyRate: 90,
    weeklyRate: 540,
    deposit: 400,
    minDays: 2,
    safariReady: true,
    inspected: true,
    inspectionScore: 142,
    rating: 4.6,
    trips: 38,
    location: 'Kicukiro, Kigali',
    unavailableDays: [5, 6, 12],
    image: STUDIO.suvSide03,
    images: [
      STUDIO.paintSkylight,
    ],
    seller: 'Sawa Fleet',
  },
  {
    id: 'r5',
    title: 'Toyota Hilux Double Cab',
    make: 'Toyota',
    model: 'Hilux',
    year: 2022,
    category: 'Truck',
    seats: 5,
    fuel: 'Diesel',
    transmission: 'Manual',
    mileage: 44000,
    listingType: 'rental',
    dailyRate: 85,
    weeklyRate: 510,
    deposit: 350,
    minDays: 1,
    safariReady: true,
    inspected: true,
    inspectionScore: 144,
    rating: 4.8,
    trips: 51,
    location: 'Kanombe, Kigali',
    unavailableDays: [8, 9, 10],
    image: STUDIO.paint01,
    images: [
      STUDIO.suvSideStudio,
    ],
    seller: 'Sawa Fleet',
  },
  {
    id: 'r6',
    title: 'Hyundai Tucson',
    make: 'Hyundai',
    model: 'Tucson',
    year: 2023,
    category: 'SUV',
    seats: 5,
    fuel: 'Gasoline',
    transmission: 'Automatic',
    mileage: 16000,
    listingType: 'rental',
    dailyRate: 50,
    weeklyRate: 300,
    deposit: 200,
    minDays: 1,
    inspected: true,
    inspectionScore: 149,
    rating: 4.9,
    trips: 24,
    location: 'Nyarutarama, Kigali',
    unavailableDays: [],
    image: STUDIO.paintWhite,
    images: [
      STUDIO.suvSide04,
    ],
    seller: 'Sawa Fleet',
  },
  {
    id: 'r7',
    title: 'Suzuki Jimny',
    make: 'Suzuki',
    model: 'Jimny',
    year: 2022,
    category: 'SUV',
    seats: 4,
    fuel: 'Gasoline',
    transmission: 'Manual',
    mileage: 25000,
    listingType: 'rental',
    dailyRate: 45,
    weeklyRate: 270,
    deposit: 150,
    minDays: 1,
    safariReady: true,
    inspected: true,
    inspectionScore: 143,
    rating: 4.7,
    trips: 33,
    location: 'Kiyovu, Kigali',
    unavailableDays: [1, 2],
    image: STUDIO.paintSilver,
    images: [
      STUDIO.heroSuv,
    ],
    seller: 'Sawa Fleet',
  },
  {
    id: 'r8',
    title: 'Kia Sportage',
    make: 'Kia',
    model: 'Sportage',
    year: 2023,
    category: 'SUV',
    seats: 5,
    fuel: 'Gasoline',
    transmission: 'Automatic',
    mileage: 12000,
    listingType: 'rental',
    dailyRate: 52,
    weeklyRate: 312,
    deposit: 200,
    minDays: 1,
    inspected: true,
    inspectionScore: 147,
    rating: 4.8,
    trips: 19,
    location: 'Kimihurura, Kigali',
    unavailableDays: [11, 12, 13],
    image: STUDIO.paintGrey,
    images: [
      STUDIO.suvSide07,
    ],
    seller: 'Sawa Fleet',
  },
];

export const RENTAL_CARS = LEGACY_RENTAL_CARS.map((car) => ({
  ...car,
  currency: 'RWF',
  dailyRate: Math.round(car.dailyRate * 1470),
  weeklyRate: Math.round(car.weeklyRate * 1470),
  deposit: Math.round(car.deposit * 1470),
}));

// What every Sawa rental includes — shown on detail screen
export const RENTAL_INCLUDES = [
  { icon: 'shield-checkmark-outline', label: 'Comprehensive insurance' },
  { icon: 'construct-outline', label: '24/7 roadside assistance' },
  { icon: 'speedometer-outline', label: 'Unlimited kilometres' },
  { icon: 'sparkles-outline', label: 'Cleaned & sanitised' },
];

// Pickup locations — the 3 Sawa centers + airport meet-and-greet
export const RENTAL_CENTERS = [
  { id: 'c1', name: 'Nyarutarama Center', area: 'Nyarutarama', fee: 0 },
  { id: 'c2', name: 'Kicukiro Center', area: 'Kicukiro', fee: 0 },
  { id: 'c3', name: 'Kimironko Center', area: 'Kimironko', fee: 0 },
  { id: 'c4', name: "Kigali Int'l Airport", area: 'Kanombe', fee: 30000, airport: true },
];

// Each rental car lives at one Sawa center — pickup happens where the car is.
// Airport meet & greet stays available as an optional paid add-on.
const HOME_CENTER_BY_AREA = {
  Nyarutarama: 'c1', Kiyovu: 'c1', Kimihurura: 'c1',
  Kicukiro: 'c2', Kanombe: 'c2',
  Remera: 'c3', Kimironko: 'c3',
};

export function getPickupCenter(car) {
  const area = (car.location || '').split(',')[0].trim();
  const id = HOME_CENTER_BY_AREA[area] || 'c1';
  return RENTAL_CENTERS.find((c) => c.id === id);
}

export const AIRPORT_PICKUP = RENTAL_CENTERS.find((c) => c.airport);

// Pickup windows — staff confirm the exact time on WhatsApp
export const PICKUP_WINDOWS = ['Morning · 8AM–12PM', 'Afternoon · 1PM–5PM'];

// Digital check-in — photo walkaround slots (both at pickup and return)
export const CHECKIN_PHOTOS = [
  { key: 'front', label: 'Front', icon: 'car-outline' },
  { key: 'back', label: 'Rear', icon: 'car-outline' },
  { key: 'left', label: 'Left side', icon: 'car-sport-outline' },
  { key: 'right', label: 'Right side', icon: 'car-sport-outline' },
  { key: 'odometer', label: 'Odometer', icon: 'speedometer-outline' },
  { key: 'fuel', label: 'Fuel gauge', icon: 'water-outline' },
];

// Duration presets for the booking screen
export const DURATION_PRESETS = [1, 2, 3, 5, 7, 14];

// Next N days as pickers — index-based so unavailableDays can reference them
export function getRentalDates(count = 14) {
  const dates = [];
  const base = new Date(); // always start from today
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push({
      index: i,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      full: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    });
  }
  return dates;
}

// Trip cost: weekly rate kicks in per full week, remainder at daily rate
export function calcTripCost(car, days) {
  const weeks = Math.floor(days / 7);
  const remainder = days % 7;
  const subtotal = weeks * car.weeklyRate + remainder * car.dailyRate;
  return { subtotal, deposit: car.deposit, total: subtotal + car.deposit };
}
