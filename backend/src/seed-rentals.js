// Seeds the Inzozi rental fleet for local development.
// Run: node src/seed-rentals.js — safe to re-run (skips if fleet exists).
require('dotenv').config();
const pool = require('./db');

const FLEET = [
  [
    "Toyota RAV4 Hybrid",
    "Toyota",
    "RAV4",
    2023,
    "SUV",
    5,
    "Hybrid",
    "Automatic",
    21000,
    55,
    330,
    200,
    1,
    148,
    4.9,
    42,
    "Nyarutarama, Kigali",
    [
      "https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=800&q=80",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80"
    ]
  ],
  [
    "Toyota Land Cruiser Prado",
    "Toyota",
    "Land Cruiser Prado",
    2022,
    "SUV",
    7,
    "Diesel",
    "Automatic",
    38000,
    120,
    720,
    500,
    2,
    146,
    4.8,
    67,
    "Kimihurura, Kigali",
    [
      "https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=800&q=80",
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80"
    ]
  ],
  [
    "Toyota Corolla",
    "Toyota",
    "Corolla",
    2022,
    "Sedan",
    5,
    "Gasoline",
    "Automatic",
    29000,
    40,
    240,
    150,
    1,
    145,
    4.7,
    89,
    "Remera, Kigali",
    [
      "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800&q=80",
      "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&q=80"
    ]
  ],
  [
    "Mitsubishi Pajero Sport",
    "Mitsubishi",
    "Pajero Sport",
    2021,
    "SUV",
    7,
    "Diesel",
    "Automatic",
    52000,
    90,
    540,
    400,
    2,
    142,
    4.6,
    38,
    "Kicukiro, Kigali",
    [
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80"
    ]
  ],
  [
    "Toyota Hilux Double Cab",
    "Toyota",
    "Hilux",
    2022,
    "Truck",
    5,
    "Diesel",
    "Manual",
    44000,
    85,
    510,
    350,
    1,
    144,
    4.8,
    51,
    "Kanombe, Kigali",
    [
      "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80"
    ]
  ],
  [
    "Hyundai Tucson",
    "Hyundai",
    "Tucson",
    2023,
    "SUV",
    5,
    "Gasoline",
    "Automatic",
    16000,
    50,
    300,
    200,
    1,
    149,
    4.9,
    24,
    "Nyarutarama, Kigali",
    [
      "https://images.unsplash.com/photo-1633859036120-b41cbfd2bf30?w=800&q=80"
    ]
  ],
  [
    "Suzuki Jimny",
    "Suzuki",
    "Jimny",
    2022,
    "SUV",
    4,
    "Gasoline",
    "Manual",
    25000,
    45,
    270,
    150,
    1,
    143,
    4.7,
    33,
    "Kiyovu, Kigali",
    [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80"
    ]
  ],
  [
    "Kia Sportage",
    "Kia",
    "Sportage",
    2023,
    "SUV",
    5,
    "Gasoline",
    "Automatic",
    12000,
    52,
    312,
    200,
    1,
    147,
    4.8,
    19,
    "Kimihurura, Kigali",
    [
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80"
    ]
  ]
];

async function seed() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM rental_cars');
  if (rows[0].n > 0) {
    console.log(`Rental fleet already seeded (${rows[0].n} cars) — skipping`);
    await pool.end();
    return;
  }
  const SAFARI_MODELS = ['Land Cruiser Prado', 'Pajero Sport', 'Hilux', 'Jimny'];
  // Same marketing photography as the sale seeds (backend/uploads/seed) — the
  // fleet is the same product wearing the same clothes. Index 17 is images[].
  const ASSET_BASE = process.env.SEED_ASSET_BASE || 'http://localhost:3000';
  const su = (f) => `${ASSET_BASE}/uploads/seed/${f}`;
  const RENTAL_IMAGE_SETS = [
    [su('suv-side-03.jpeg'), su('suv-side-04.jpeg')],
    [su('suv-side-07.jpeg'), su('suv-side-studio.jpeg')],
    [su('paint-silver.jpeg'), su('paint-glossy-grey.jpeg')],
    [su('paint-blue.jpeg'), su('paint-white.jpeg')],
  ];
  FLEET.forEach((c, i) => { c[17] = RENTAL_IMAGE_SETS[i % RENTAL_IMAGE_SETS.length]; });

  for (const c of FLEET) {
    const safariReady = SAFARI_MODELS.includes(c[2]); // c[2] = model
    await pool.query(
      `INSERT INTO rental_cars
         (title, make, model, year, category, seats, fuel, transmission, mileage,
          daily_rate, weekly_rate, deposit, min_days, inspection_score, rating,
          trips, location, images, safari_ready)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [...c, safariReady]
    );
  }
  console.log(`✅ Seeded ${FLEET.length} rental cars`);
  await pool.end();
}

seed().catch((err) => { console.error('rental seed failed:', err.message); process.exit(1); });
