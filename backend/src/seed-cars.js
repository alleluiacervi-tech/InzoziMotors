// Seeds the marketplace sales inventory for local development.
// Run: node src/seed-cars.js — safe to re-run (skips if any cars exist).
// Ensures a demo verified seller exists, then inserts 15 live listings
// (sourced from the mobile app's mock data, Kigali-localised) plus one
// initial price_history row per car.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

const SELLER_EMAIL    = process.env.SEED_SELLER_EMAIL    || 'seller@inzozi.rw';
const SELLER_PASSWORD = process.env.SEED_SELLER_PASSWORD || 'seller1234';
const SELLER_NAME     = process.env.SEED_SELLER_NAME     || 'Inzozi Demo Seller';

// title, make, model, year, mileage(km), fuel_type, transmission, body_type,
// color, price(USD), location, drive_side, description, images[], inspection_score(/150)
const CARS = [
  {
    title: '2022 Tesla Model 3 Long Range',
    make: 'Tesla', model: 'Model 3', year: 2022,
    mileage: 18420, fuel: 'Electric', transmission: 'Automatic',
    body: 'Sedan', color: 'Pearl White', price: 24900,
    location: 'Nyarutarama, Kigali', drive: 'LHD',
    description: 'Long Range AWD with autopilot. Single owner, full charging kit included. Passed the Inzozi 150-point inspection with flying colours.',
    score: 147,
    images: [
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80',
      'https://images.unsplash.com/photo-1617704548623-340376564e68?w=800&q=80',
      'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80',
    ],
  },
  {
    title: '2021 BMW 4 Series M Sport',
    make: 'BMW', model: '4 Series', year: 2021,
    mileage: 27900, fuel: 'Petrol', transmission: 'Automatic',
    body: 'Sedan', color: 'Alpine White', price: 31500,
    location: 'Kiyovu, Kigali', drive: 'RHD',
    description: 'M Sport package, heated leather seats, adaptive cruise. Japanese import with full service history.',
    score: 141,
    images: [
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
      'https://images.unsplash.com/photo-1556800572-1b8aeef2c54f?w=800&q=80',
    ],
  },
  {
    title: '2020 Toyota RAV4 XLE AWD',
    make: 'Toyota', model: 'RAV4', year: 2020,
    mileage: 34100, fuel: 'Hybrid', transmission: 'Automatic',
    body: 'SUV', color: 'Silver Metallic', price: 26300,
    location: 'Kimihurura, Kigali', drive: 'RHD',
    description: 'Hybrid AWD, excellent fuel economy for Kigali hills. Priced below market average for its class.',
    score: 145,
    images: [
      'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=800&q=80',
      'https://images.unsplash.com/photo-1621007947382-cc34aa8668c2?w=800&q=80',
    ],
  },
  {
    title: '2019 Ford F-150 Lariat',
    make: 'Ford', model: 'F-150', year: 2019,
    mileage: 41200, fuel: 'Petrol', transmission: 'Automatic',
    body: 'Truck', color: 'Magnetic Grey', price: 33750,
    location: 'Kacyiru, Kigali', drive: 'LHD',
    description: 'Lariat trim with tow package and bed liner. Ideal work truck, well maintained with documented services.',
    score: 132,
    images: [
      'https://images.unsplash.com/photo-1603598154505-0192e5365a35?w=800&q=80',
      'https://images.unsplash.com/photo-1533557838117-7cc82763de40?w=800&q=80',
    ],
  },
  {
    title: '2023 Hyundai Ioniq 5 SEL',
    make: 'Hyundai', model: 'Ioniq 5', year: 2023,
    mileage: 9800, fuel: 'Electric', transmission: 'Automatic',
    body: 'SUV', color: 'Cyber Grey', price: 38900,
    location: 'Remera, Kigali', drive: 'LHD',
    description: 'Nearly new EV crossover with ultra-fast charging. Remaining factory warranty transfers to buyer.',
    score: 150,
    images: [
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80',
      'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80',
    ],
  },
  {
    title: '2021 Mercedes-Benz GLC 300',
    make: 'Mercedes-Benz', model: 'GLC 300', year: 2021,
    mileage: 22500, fuel: 'Petrol', transmission: 'Automatic',
    body: 'SUV', color: 'Obsidian Black', price: 41200,
    location: 'Kicukiro, Kigali', drive: 'LHD',
    description: 'Premium compact SUV, panoramic roof, Burmester sound. Accident-free with verified mileage.',
    score: 143,
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
    ],
  },
  {
    title: '2022 Honda Civic Sport',
    make: 'Honda', model: 'Civic', year: 2022,
    mileage: 15400, fuel: 'Petrol', transmission: 'Automatic',
    body: 'Sedan', color: 'Sonic Grey', price: 21800,
    location: 'Nyarugenge, Kigali', drive: 'RHD',
    description: 'Sport trim with alloy wheels and lane assist. Great first car — economical and reliable.',
    score: 144,
    images: [
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
      'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=800&q=80',
    ],
  },
  {
    title: '2020 Jeep Grand Cherokee Laredo',
    make: 'Jeep', model: 'Grand Cherokee', year: 2020,
    mileage: 32600, fuel: 'Petrol', transmission: 'Automatic',
    body: 'SUV', color: 'Granite Crystal', price: 28500,
    location: 'Kibagabaga, Kigali', drive: 'LHD',
    description: 'Capable 4x4 for upcountry trips. New all-terrain tyres fitted at inspection.',
    score: 128,
    images: [
      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80',
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&q=80',
    ],
  },
  {
    title: '2021 Ram 1500 Limited',
    make: 'Ram', model: '1500', year: 2021,
    mileage: 26300, fuel: 'Diesel', transmission: 'Automatic',
    body: 'Truck', color: 'Diamond Black', price: 45900,
    location: 'Gikondo, Kigali', drive: 'LHD',
    description: 'Limited trim diesel with air suspension and 12-inch touchscreen. Powerful and refined.',
    score: 138,
    images: [
      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80',
      'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80',
    ],
  },
  {
    title: '2023 Tesla Model Y Performance',
    make: 'Tesla', model: 'Model Y', year: 2023,
    mileage: 8200, fuel: 'Electric', transmission: 'Automatic',
    body: 'SUV', color: 'Midnight Silver', price: 43200,
    location: 'Gisozi, Kigali', drive: 'LHD',
    description: 'Performance dual motor, 0-100 in 3.7s. Priced below market — high demand listing.',
    score: 149,
    images: [
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&q=80',
      'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&q=80',
    ],
  },
  {
    title: '2022 Audi A4 Premium Plus',
    make: 'Audi', model: 'A4', year: 2022,
    mileage: 19500, fuel: 'Petrol', transmission: 'Automatic',
    body: 'Sedan', color: 'Navarra Blue', price: 32400,
    location: 'Kanombe, Kigali', drive: 'RHD',
    description: 'Quattro AWD, virtual cockpit, matrix LED lights. Meticulously kept executive sedan.',
    score: 142,
    images: [
      'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&q=80',
      'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80',
    ],
  },
  {
    title: '2022 Volkswagen Golf GTI',
    make: 'Volkswagen', model: 'Golf GTI', year: 2022,
    mileage: 11200, fuel: 'Petrol', transmission: 'Automatic',
    body: 'Hatchback', color: 'Tornado Red', price: 29900,
    location: 'Kagarama, Kigali', drive: 'RHD',
    description: 'Iconic hot hatch, DSG gearbox, tartan interior. Low mileage and fully stock.',
    score: 146,
    images: [
      'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
    ],
  },
  {
    title: '2022 Land Rover Defender 110',
    make: 'Land Rover', model: 'Defender', year: 2022,
    mileage: 16500, fuel: 'Hybrid', transmission: 'Automatic',
    body: 'SUV', color: 'Pangea Green', price: 67000,
    location: 'Nyarutarama, Kigali', drive: 'RHD',
    description: 'Defender 110 P400e hybrid. Seven seats, air suspension, ready for any Rwandan road.',
    score: 140,
    images: [
      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
    ],
  },
  {
    title: '2023 Kia Telluride SX',
    make: 'Kia', model: 'Telluride', year: 2023,
    mileage: 6100, fuel: 'Petrol', transmission: 'Automatic',
    body: 'SUV', color: 'Everlasting Silver', price: 45200,
    location: 'Kimihurura, Kigali', drive: 'LHD',
    description: 'Flagship 8-seater family SUV, dual sunroofs, ventilated seats. Practically new.',
    score: 148,
    images: [
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&q=80',
      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80',
    ],
  },
  {
    title: '2021 Lexus ES 350 Ultra Luxury',
    make: 'Lexus', model: 'ES', year: 2021,
    mileage: 19200, fuel: 'Petrol', transmission: 'Automatic',
    body: 'Sedan', color: 'Atomic Silver', price: 38500,
    location: 'Kiyovu, Kigali', drive: 'RHD',
    description: 'Ultra Luxury trim — semi-aniline leather, Mark Levinson audio. Priced below market average.',
    score: 145,
    images: [
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
      'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=800&q=80',
    ],
  },
];

async function ensureSeller() {
  const hash = await bcrypt.hash(SELLER_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, id_verified, trust_score, completed_sales)
     VALUES ($1, $2, $3, 'seller', 'approved', 82, 14)
     ON CONFLICT (email) DO NOTHING`,
    [SELLER_NAME, SELLER_EMAIL, hash]
  );
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [SELLER_EMAIL]);
  return rows[0].id;
}

async function seed() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM cars');
  if (rows[0].n > 0) {
    console.log(`Cars already seeded (${rows[0].n} listings) — skipping`);
    await pool.end();
    return;
  }

  const sellerId = await ensureSeller();

  // Marketing photography shipped with the repo (backend/uploads/seed) replaces
  // the Unsplash placeholders, so seeded listings look like the real product on
  // every surface. SEED_ASSET_BASE must be a host the CLIENT can reach —
  // localhost is right for the web on the same machine; a phone needs the LAN IP.
  const ASSET_BASE = process.env.SEED_ASSET_BASE || 'http://localhost:3000';
  const su = (f) => `${ASSET_BASE}/uploads/seed/${f}`;
  const SEED_IMAGE_SETS = [
    [su('hero-sedan-studio.jpeg'), su('paint-purple.jpeg'), su('paint-glossy-black.jpeg')],
    [su('suv-side-studio.jpeg'), su('suv-side-03.jpeg'), su('suv-side-04.jpeg')],
    [su('hero-gt-coast.jpeg'), su('paint-skylight-silk.jpeg'), su('paint-silver.jpeg')],
    [su('hero-suv-courtyard.jpeg'), su('suv-side-07.jpeg'), su('paint-solar-bronze.jpeg')],
    [su('paint-blue.jpeg'), su('paint-01.jpeg'), su('paint-03.jpeg')],
    [su('paint-glossy-grey.jpeg'), su('paint-05.jpeg'), su('paint-06.jpeg')],
    [su('paint-white.jpeg'), su('paint-grey.jpeg'), su('paint-purple-2.jpeg')],
  ];
  CARS.forEach((c, i) => { c.images = SEED_IMAGE_SETS[i % SEED_IMAGE_SETS.length]; });

  for (const c of CARS) {
    const { rows: inserted } = await pool.query(
      `INSERT INTO cars
         (seller_id, title, make, model, year, mileage, fuel_type, transmission,
          body_type, color, price, location, drive_side, description, images,
          inspected, inspection_score, status, listed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
               TRUE, $16, 'live', NOW())
       RETURNING id`,
      [
        sellerId, c.title, c.make, c.model, c.year, c.mileage, c.fuel,
        c.transmission, c.body, c.color, c.price, c.location, c.drive,
        c.description, c.images, c.score,
      ]
    );
    await pool.query(
      `INSERT INTO price_history (car_id, price, changed_by) VALUES ($1, $2, $3)`,
      [inserted[0].id, c.price, sellerId]
    );
  }

  console.log(`✅ Seeded ${CARS.length} live car listings (seller: ${SELLER_EMAIL})`);
  await pool.end();
}

seed().catch((err) => { console.error('car seed failed:', err.message); process.exit(1); });
