// Brand-new (0 km) import catalogue — the offline fallback for the list the
// backend serves from global_import_catalog.
//
// GENERATED from backend/data/import-catalog.json by scripts/build-import-catalog.js.
// Edit that JSON and re-run that script; edits made here are lost.
//
// Price, freight, engine size and photographs are deliberately absent. The
// version of this file before the brand-new rebuild carried all four, invented:
// hand-typed FOB figures attributed to no exporter, and 33 image references
// pointing at just 7 generic stock photographs, so a BYD Atto 3 and a Toyota
// Hilux rendered the same picture. A model carries its marque, body style,
// fuels and origin — all facts — and the buyer asks for the rest.

export const FALLBACK_IMPORT_CATALOG = [
  // Toyota — Japan (Yokohama)
  { id: 'imp-toyota-vitz', make: 'Toyota', model: 'Vitz', bodyType: 'Hatchback', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 1 },
  { id: 'imp-toyota-yaris', make: 'Toyota', model: 'Yaris', bodyType: 'Hatchback', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 2 },
  { id: 'imp-toyota-yaris-cross', make: 'Toyota', model: 'Yaris Cross', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 3 },
  { id: 'imp-toyota-corolla', make: 'Toyota', model: 'Corolla', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 4 },
  { id: 'imp-toyota-corolla-cross', make: 'Toyota', model: 'Corolla Cross', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 5 },
  { id: 'imp-toyota-camry', make: 'Toyota', model: 'Camry', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 6 },
  { id: 'imp-toyota-raize', make: 'Toyota', model: 'Raize', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 7 },
  { id: 'imp-toyota-rush', make: 'Toyota', model: 'Rush', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 8 },
  { id: 'imp-toyota-c-hr', make: 'Toyota', model: 'C-HR', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 9 },
  { id: 'imp-toyota-rav4', make: 'Toyota', model: 'RAV4', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 10 },
  { id: 'imp-toyota-harrier', make: 'Toyota', model: 'Harrier', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 11 },
  { id: 'imp-toyota-fortuner', make: 'Toyota', model: 'Fortuner', bodyType: 'SUV', fuelTypes: ['Diesel', 'Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 12 },
  { id: 'imp-toyota-land-cruiser-prado', make: 'Toyota', model: 'Land Cruiser Prado', bodyType: 'SUV', fuelTypes: ['Diesel', 'Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 13 },
  { id: 'imp-toyota-land-cruiser-300', make: 'Toyota', model: 'Land Cruiser 300', bodyType: 'SUV', fuelTypes: ['Diesel', 'Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 14 },
  { id: 'imp-toyota-land-cruiser-70', make: 'Toyota', model: 'Land Cruiser 70', bodyType: 'SUV', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 15 },
  { id: 'imp-toyota-hilux', make: 'Toyota', model: 'Hilux', bodyType: 'Pickup', fuelTypes: ['Diesel', 'Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 16 },
  { id: 'imp-toyota-hiace', make: 'Toyota', model: 'Hiace', bodyType: 'Van', fuelTypes: ['Diesel', 'Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 17 },
  { id: 'imp-toyota-coaster', make: 'Toyota', model: 'Coaster', bodyType: 'Bus', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 18 },
  { id: 'imp-toyota-avanza', make: 'Toyota', model: 'Avanza', bodyType: 'MPV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 19 },
  { id: 'imp-toyota-noah', make: 'Toyota', model: 'Noah', bodyType: 'MPV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 20 },
  { id: 'imp-toyota-alphard', make: 'Toyota', model: 'Alphard', bodyType: 'MPV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 21 },
  { id: 'imp-toyota-dyna', make: 'Toyota', model: 'Dyna', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 22 },
  { id: 'imp-toyota-bz4x', make: 'Toyota', model: 'bZ4X', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 23 },

  // Lexus — Japan (Yokohama)
  { id: 'imp-lexus-ux', make: 'Lexus', model: 'UX', bodyType: 'SUV', fuelTypes: ['Hybrid', 'Electric'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 1 },
  { id: 'imp-lexus-nx', make: 'Lexus', model: 'NX', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 2 },
  { id: 'imp-lexus-rx', make: 'Lexus', model: 'RX', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 3 },
  { id: 'imp-lexus-gx', make: 'Lexus', model: 'GX', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 4 },
  { id: 'imp-lexus-lx', make: 'Lexus', model: 'LX', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 5 },
  { id: 'imp-lexus-tx', make: 'Lexus', model: 'TX', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 6 },
  { id: 'imp-lexus-es', make: 'Lexus', model: 'ES', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 7 },
  { id: 'imp-lexus-ls', make: 'Lexus', model: 'LS', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 8 },
  { id: 'imp-lexus-lm', make: 'Lexus', model: 'LM', bodyType: 'MPV', fuelTypes: ['Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 9 },
  { id: 'imp-lexus-rz', make: 'Lexus', model: 'RZ', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 10 },

  // Nissan — Japan (Yokohama)
  { id: 'imp-nissan-march', make: 'Nissan', model: 'March', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 1 },
  { id: 'imp-nissan-note', make: 'Nissan', model: 'Note', bodyType: 'Hatchback', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 2 },
  { id: 'imp-nissan-sunny', make: 'Nissan', model: 'Sunny', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 3 },
  { id: 'imp-nissan-sentra', make: 'Nissan', model: 'Sentra', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 4 },
  { id: 'imp-nissan-altima', make: 'Nissan', model: 'Altima', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 5 },
  { id: 'imp-nissan-juke', make: 'Nissan', model: 'Juke', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 6 },
  { id: 'imp-nissan-kicks', make: 'Nissan', model: 'Kicks', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 7 },
  { id: 'imp-nissan-qashqai', make: 'Nissan', model: 'Qashqai', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 8 },
  { id: 'imp-nissan-x-trail', make: 'Nissan', model: 'X-Trail', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 9 },
  { id: 'imp-nissan-pathfinder', make: 'Nissan', model: 'Pathfinder', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 10 },
  { id: 'imp-nissan-patrol', make: 'Nissan', model: 'Patrol', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 11 },
  { id: 'imp-nissan-navara', make: 'Nissan', model: 'Navara', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 12 },
  { id: 'imp-nissan-nv350-urvan', make: 'Nissan', model: 'NV350 Urvan', bodyType: 'Van', fuelTypes: ['Diesel', 'Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 13 },
  { id: 'imp-nissan-leaf', make: 'Nissan', model: 'Leaf', bodyType: 'Hatchback', fuelTypes: ['Electric'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 14 },
  { id: 'imp-nissan-ariya', make: 'Nissan', model: 'Ariya', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 15 },

  // Honda — Japan (Yokohama)
  { id: 'imp-honda-fit', make: 'Honda', model: 'Fit', bodyType: 'Hatchback', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 1 },
  { id: 'imp-honda-civic', make: 'Honda', model: 'Civic', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 2 },
  { id: 'imp-honda-accord', make: 'Honda', model: 'Accord', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 3 },
  { id: 'imp-honda-wr-v', make: 'Honda', model: 'WR-V', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 4 },
  { id: 'imp-honda-hr-v', make: 'Honda', model: 'HR-V', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 5 },
  { id: 'imp-honda-cr-v', make: 'Honda', model: 'CR-V', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 6 },
  { id: 'imp-honda-pilot', make: 'Honda', model: 'Pilot', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 7 },
  { id: 'imp-honda-odyssey', make: 'Honda', model: 'Odyssey', bodyType: 'MPV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 8 },
  { id: 'imp-honda-freed', make: 'Honda', model: 'Freed', bodyType: 'MPV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 9 },
  { id: 'imp-honda-e-ny1', make: 'Honda', model: 'e:Ny1', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 10 },

  // Mazda — Japan (Yokohama)
  { id: 'imp-mazda-mazda2', make: 'Mazda', model: 'Mazda2', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 1 },
  { id: 'imp-mazda-mazda3', make: 'Mazda', model: 'Mazda3', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 2 },
  { id: 'imp-mazda-mazda6', make: 'Mazda', model: 'Mazda6', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 3 },
  { id: 'imp-mazda-cx-3', make: 'Mazda', model: 'CX-3', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 4 },
  { id: 'imp-mazda-cx-30', make: 'Mazda', model: 'CX-30', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 5 },
  { id: 'imp-mazda-cx-5', make: 'Mazda', model: 'CX-5', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 6 },
  { id: 'imp-mazda-cx-60', make: 'Mazda', model: 'CX-60', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 7 },
  { id: 'imp-mazda-cx-8', make: 'Mazda', model: 'CX-8', bodyType: 'SUV', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 8 },
  { id: 'imp-mazda-cx-9', make: 'Mazda', model: 'CX-9', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 9 },
  { id: 'imp-mazda-bt-50', make: 'Mazda', model: 'BT-50', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 10 },

  // Mitsubishi — Japan (Yokohama)
  { id: 'imp-mitsubishi-mirage', make: 'Mitsubishi', model: 'Mirage', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 1 },
  { id: 'imp-mitsubishi-attrage', make: 'Mitsubishi', model: 'Attrage', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 2 },
  { id: 'imp-mitsubishi-xpander', make: 'Mitsubishi', model: 'Xpander', bodyType: 'MPV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 3 },
  { id: 'imp-mitsubishi-asx', make: 'Mitsubishi', model: 'ASX', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 4 },
  { id: 'imp-mitsubishi-eclipse-cross', make: 'Mitsubishi', model: 'Eclipse Cross', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 5 },
  { id: 'imp-mitsubishi-outlander', make: 'Mitsubishi', model: 'Outlander', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 6 },
  { id: 'imp-mitsubishi-montero-sport', make: 'Mitsubishi', model: 'Montero Sport', bodyType: 'SUV', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 7 },
  { id: 'imp-mitsubishi-pajero-sport', make: 'Mitsubishi', model: 'Pajero Sport', bodyType: 'SUV', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 8 },
  { id: 'imp-mitsubishi-l200-triton', make: 'Mitsubishi', model: 'L200 Triton', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 9 },
  { id: 'imp-mitsubishi-canter', make: 'Mitsubishi', model: 'Canter', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 10 },

  // Suzuki — Japan (Kobe)
  { id: 'imp-suzuki-alto', make: 'Suzuki', model: 'Alto', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 1 },
  { id: 'imp-suzuki-wagon-r', make: 'Suzuki', model: 'Wagon R', bodyType: 'Hatchback', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 2 },
  { id: 'imp-suzuki-swift', make: 'Suzuki', model: 'Swift', bodyType: 'Hatchback', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 3 },
  { id: 'imp-suzuki-baleno', make: 'Suzuki', model: 'Baleno', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 4 },
  { id: 'imp-suzuki-dzire', make: 'Suzuki', model: 'Dzire', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 5 },
  { id: 'imp-suzuki-ciaz', make: 'Suzuki', model: 'Ciaz', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 6 },
  { id: 'imp-suzuki-ignis', make: 'Suzuki', model: 'Ignis', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 7 },
  { id: 'imp-suzuki-jimny', make: 'Suzuki', model: 'Jimny', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 8 },
  { id: 'imp-suzuki-vitara', make: 'Suzuki', model: 'Vitara', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 9 },
  { id: 'imp-suzuki-grand-vitara', make: 'Suzuki', model: 'Grand Vitara', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 10 },
  { id: 'imp-suzuki-ertiga', make: 'Suzuki', model: 'Ertiga', bodyType: 'MPV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 11 },
  { id: 'imp-suzuki-apv', make: 'Suzuki', model: 'APV', bodyType: 'Van', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 12 },
  { id: 'imp-suzuki-carry', make: 'Suzuki', model: 'Carry', bodyType: 'Truck', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Kobe', condition: 'new', displayOrder: 13 },

  // Subaru — Japan (Yokohama)
  { id: 'imp-subaru-impreza', make: 'Subaru', model: 'Impreza', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 1 },
  { id: 'imp-subaru-crosstrek', make: 'Subaru', model: 'Crosstrek', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 2 },
  { id: 'imp-subaru-forester', make: 'Subaru', model: 'Forester', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 3 },
  { id: 'imp-subaru-outback', make: 'Subaru', model: 'Outback', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 4 },
  { id: 'imp-subaru-legacy', make: 'Subaru', model: 'Legacy', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 5 },
  { id: 'imp-subaru-ascent', make: 'Subaru', model: 'Ascent', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 6 },
  { id: 'imp-subaru-wrx', make: 'Subaru', model: 'WRX', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 7 },
  { id: 'imp-subaru-solterra', make: 'Subaru', model: 'Solterra', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 8 },

  // Isuzu — Japan (Yokohama)
  { id: 'imp-isuzu-d-max', make: 'Isuzu', model: 'D-Max', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 1 },
  { id: 'imp-isuzu-mu-x', make: 'Isuzu', model: 'MU-X', bodyType: 'SUV', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 2 },
  { id: 'imp-isuzu-npr', make: 'Isuzu', model: 'NPR', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 3 },
  { id: 'imp-isuzu-nqr', make: 'Isuzu', model: 'NQR', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 4 },
  { id: 'imp-isuzu-fvr', make: 'Isuzu', model: 'FVR', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 5 },
  { id: 'imp-isuzu-frr', make: 'Isuzu', model: 'FRR', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'Japan', originPort: 'Yokohama', condition: 'new', displayOrder: 6 },

  // Hyundai — South Korea (Incheon)
  { id: 'imp-hyundai-grand-i10', make: 'Hyundai', model: 'Grand i10', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 1 },
  { id: 'imp-hyundai-i20', make: 'Hyundai', model: 'i20', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 2 },
  { id: 'imp-hyundai-i30', make: 'Hyundai', model: 'i30', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 3 },
  { id: 'imp-hyundai-accent', make: 'Hyundai', model: 'Accent', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 4 },
  { id: 'imp-hyundai-avante', make: 'Hyundai', model: 'Avante', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 5 },
  { id: 'imp-hyundai-elantra', make: 'Hyundai', model: 'Elantra', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 6 },
  { id: 'imp-hyundai-sonata', make: 'Hyundai', model: 'Sonata', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 7 },
  { id: 'imp-hyundai-grandeur', make: 'Hyundai', model: 'Grandeur', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 8 },
  { id: 'imp-hyundai-venue', make: 'Hyundai', model: 'Venue', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 9 },
  { id: 'imp-hyundai-bayon', make: 'Hyundai', model: 'Bayon', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 10 },
  { id: 'imp-hyundai-kona', make: 'Hyundai', model: 'Kona', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid', 'Electric'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 11 },
  { id: 'imp-hyundai-creta', make: 'Hyundai', model: 'Creta', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 12 },
  { id: 'imp-hyundai-tucson', make: 'Hyundai', model: 'Tucson', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel', 'Hybrid'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 13 },
  { id: 'imp-hyundai-santa-fe', make: 'Hyundai', model: 'Santa Fe', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel', 'Hybrid'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 14 },
  { id: 'imp-hyundai-palisade', make: 'Hyundai', model: 'Palisade', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 15 },
  { id: 'imp-hyundai-staria', make: 'Hyundai', model: 'Staria', bodyType: 'Van', fuelTypes: ['Diesel'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 16 },
  { id: 'imp-hyundai-h-1-starex', make: 'Hyundai', model: 'H-1 Starex', bodyType: 'Van', fuelTypes: ['Diesel'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 17 },
  { id: 'imp-hyundai-porter', make: 'Hyundai', model: 'Porter', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 18 },
  { id: 'imp-hyundai-mighty', make: 'Hyundai', model: 'Mighty', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 19 },
  { id: 'imp-hyundai-ioniq-5', make: 'Hyundai', model: 'Ioniq 5', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 20 },
  { id: 'imp-hyundai-ioniq-6', make: 'Hyundai', model: 'Ioniq 6', bodyType: 'Sedan', fuelTypes: ['Electric'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 21 },
  { id: 'imp-hyundai-ioniq-9', make: 'Hyundai', model: 'Ioniq 9', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 22 },

  // Kia — South Korea (Incheon)
  { id: 'imp-kia-picanto', make: 'Kia', model: 'Picanto', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 1 },
  { id: 'imp-kia-rio', make: 'Kia', model: 'Rio', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 2 },
  { id: 'imp-kia-k3', make: 'Kia', model: 'K3', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 3 },
  { id: 'imp-kia-k5', make: 'Kia', model: 'K5', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 4 },
  { id: 'imp-kia-k8', make: 'Kia', model: 'K8', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 5 },
  { id: 'imp-kia-soul', make: 'Kia', model: 'Soul', bodyType: 'Hatchback', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 6 },
  { id: 'imp-kia-stonic', make: 'Kia', model: 'Stonic', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 7 },
  { id: 'imp-kia-seltos', make: 'Kia', model: 'Seltos', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 8 },
  { id: 'imp-kia-niro', make: 'Kia', model: 'Niro', bodyType: 'SUV', fuelTypes: ['Hybrid', 'Electric'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 9 },
  { id: 'imp-kia-sportage', make: 'Kia', model: 'Sportage', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel', 'Hybrid'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 10 },
  { id: 'imp-kia-sorento', make: 'Kia', model: 'Sorento', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel', 'Hybrid'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 11 },
  { id: 'imp-kia-mohave', make: 'Kia', model: 'Mohave', bodyType: 'SUV', fuelTypes: ['Diesel'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 12 },
  { id: 'imp-kia-telluride', make: 'Kia', model: 'Telluride', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 13 },
  { id: 'imp-kia-carnival', make: 'Kia', model: 'Carnival', bodyType: 'MPV', fuelTypes: ['Petrol', 'Diesel', 'Hybrid'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 14 },
  { id: 'imp-kia-bongo', make: 'Kia', model: 'Bongo', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 15 },
  { id: 'imp-kia-ev3', make: 'Kia', model: 'EV3', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 16 },
  { id: 'imp-kia-ev6', make: 'Kia', model: 'EV6', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 17 },
  { id: 'imp-kia-ev9', make: 'Kia', model: 'EV9', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 18 },

  // Genesis — South Korea (Incheon)
  { id: 'imp-genesis-g70', make: 'Genesis', model: 'G70', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 1 },
  { id: 'imp-genesis-g80', make: 'Genesis', model: 'G80', bodyType: 'Sedan', fuelTypes: ['Petrol', 'Electric'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 2 },
  { id: 'imp-genesis-g90', make: 'Genesis', model: 'G90', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 3 },
  { id: 'imp-genesis-gv60', make: 'Genesis', model: 'GV60', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 4 },
  { id: 'imp-genesis-gv70', make: 'Genesis', model: 'GV70', bodyType: 'SUV', fuelTypes: ['Petrol', 'Electric'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 5 },
  { id: 'imp-genesis-gv80', make: 'Genesis', model: 'GV80', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel'], originCountry: 'South Korea', originPort: 'Incheon', condition: 'new', displayOrder: 6 },

  // BYD — China (Shanghai)
  { id: 'imp-byd-dolphin', make: 'BYD', model: 'Dolphin', bodyType: 'Hatchback', fuelTypes: ['Electric'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 1 },
  { id: 'imp-byd-seagull', make: 'BYD', model: 'Seagull', bodyType: 'Hatchback', fuelTypes: ['Electric'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 2 },
  { id: 'imp-byd-atto-3', make: 'BYD', model: 'Atto 3', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 3 },
  { id: 'imp-byd-yuan-plus', make: 'BYD', model: 'Yuan Plus', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 4 },
  { id: 'imp-byd-seal', make: 'BYD', model: 'Seal', bodyType: 'Sedan', fuelTypes: ['Electric'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 5 },
  { id: 'imp-byd-seal-u', make: 'BYD', model: 'Seal U', bodyType: 'SUV', fuelTypes: ['Electric', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 6 },
  { id: 'imp-byd-han', make: 'BYD', model: 'Han', bodyType: 'Sedan', fuelTypes: ['Electric', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 7 },
  { id: 'imp-byd-qin-plus', make: 'BYD', model: 'Qin Plus', bodyType: 'Sedan', fuelTypes: ['Electric', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 8 },
  { id: 'imp-byd-song-plus', make: 'BYD', model: 'Song Plus', bodyType: 'SUV', fuelTypes: ['Electric', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 9 },
  { id: 'imp-byd-song-pro', make: 'BYD', model: 'Song Pro', bodyType: 'SUV', fuelTypes: ['Electric', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 10 },
  { id: 'imp-byd-tang', make: 'BYD', model: 'Tang', bodyType: 'SUV', fuelTypes: ['Electric', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 11 },
  { id: 'imp-byd-sealion-6', make: 'BYD', model: 'Sealion 6', bodyType: 'SUV', fuelTypes: ['Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 12 },
  { id: 'imp-byd-sealion-7', make: 'BYD', model: 'Sealion 7', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 13 },
  { id: 'imp-byd-shark', make: 'BYD', model: 'Shark', bodyType: 'Pickup', fuelTypes: ['Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 14 },
  { id: 'imp-byd-m6', make: 'BYD', model: 'M6', bodyType: 'MPV', fuelTypes: ['Electric'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 15 },

  // Chery — China (Shanghai)
  { id: 'imp-chery-qq', make: 'Chery', model: 'QQ', bodyType: 'Hatchback', fuelTypes: ['Petrol', 'Electric'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 1 },
  { id: 'imp-chery-arrizo-5', make: 'Chery', model: 'Arrizo 5', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 2 },
  { id: 'imp-chery-arrizo-6', make: 'Chery', model: 'Arrizo 6', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 3 },
  { id: 'imp-chery-arrizo-8', make: 'Chery', model: 'Arrizo 8', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 4 },
  { id: 'imp-chery-tiggo-2-pro', make: 'Chery', model: 'Tiggo 2 Pro', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 5 },
  { id: 'imp-chery-tiggo-4-pro', make: 'Chery', model: 'Tiggo 4 Pro', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 6 },
  { id: 'imp-chery-tiggo-7-pro', make: 'Chery', model: 'Tiggo 7 Pro', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 7 },
  { id: 'imp-chery-tiggo-8-pro', make: 'Chery', model: 'Tiggo 8 Pro', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 8 },
  { id: 'imp-chery-tiggo-9', make: 'Chery', model: 'Tiggo 9', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 9 },
  { id: 'imp-chery-omoda-5', make: 'Chery', model: 'Omoda 5', bodyType: 'SUV', fuelTypes: ['Petrol', 'Electric'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 10 },
  { id: 'imp-chery-jaecoo-7', make: 'Chery', model: 'Jaecoo 7', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 11 },

  // Geely — China (Ningbo)
  { id: 'imp-geely-coolray', make: 'Geely', model: 'Coolray', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Ningbo', condition: 'new', displayOrder: 1 },
  { id: 'imp-geely-azkarra', make: 'Geely', model: 'Azkarra', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Ningbo', condition: 'new', displayOrder: 2 },
  { id: 'imp-geely-okavango', make: 'Geely', model: 'Okavango', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Ningbo', condition: 'new', displayOrder: 3 },
  { id: 'imp-geely-monjaro', make: 'Geely', model: 'Monjaro', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Ningbo', condition: 'new', displayOrder: 4 },
  { id: 'imp-geely-emgrand', make: 'Geely', model: 'Emgrand', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Ningbo', condition: 'new', displayOrder: 5 },
  { id: 'imp-geely-preface', make: 'Geely', model: 'Preface', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Ningbo', condition: 'new', displayOrder: 6 },
  { id: 'imp-geely-starray', make: 'Geely', model: 'Starray', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Ningbo', condition: 'new', displayOrder: 7 },
  { id: 'imp-geely-geometry-c', make: 'Geely', model: 'Geometry C', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'China', originPort: 'Ningbo', condition: 'new', displayOrder: 8 },
  { id: 'imp-geely-ex5', make: 'Geely', model: 'EX5', bodyType: 'SUV', fuelTypes: ['Electric'], originCountry: 'China', originPort: 'Ningbo', condition: 'new', displayOrder: 9 },

  // Haval — China (Tianjin)
  { id: 'imp-haval-jolion', make: 'Haval', model: 'Jolion', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 1 },
  { id: 'imp-haval-h6', make: 'Haval', model: 'H6', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 2 },
  { id: 'imp-haval-h9', make: 'Haval', model: 'H9', bodyType: 'SUV', fuelTypes: ['Petrol', 'Diesel'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 3 },
  { id: 'imp-haval-dargo', make: 'Haval', model: 'Dargo', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 4 },
  { id: 'imp-haval-h7', make: 'Haval', model: 'H7', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 5 },

  // GWM — China (Tianjin)
  { id: 'imp-gwm-poer', make: 'GWM', model: 'Poer', bodyType: 'Pickup', fuelTypes: ['Diesel', 'Petrol'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 1 },
  { id: 'imp-gwm-wingle-5', make: 'GWM', model: 'Wingle 5', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 2 },
  { id: 'imp-gwm-wingle-7', make: 'GWM', model: 'Wingle 7', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 3 },
  { id: 'imp-gwm-tank-300', make: 'GWM', model: 'Tank 300', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 4 },
  { id: 'imp-gwm-tank-500', make: 'GWM', model: 'Tank 500', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 5 },
  { id: 'imp-gwm-ora-03', make: 'GWM', model: 'Ora 03', bodyType: 'Hatchback', fuelTypes: ['Electric'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 6 },

  // Changan — China (Shanghai)
  { id: 'imp-changan-alsvin', make: 'Changan', model: 'Alsvin', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 1 },
  { id: 'imp-changan-eado', make: 'Changan', model: 'Eado', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 2 },
  { id: 'imp-changan-cs35-plus', make: 'Changan', model: 'CS35 Plus', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 3 },
  { id: 'imp-changan-cs55-plus', make: 'Changan', model: 'CS55 Plus', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 4 },
  { id: 'imp-changan-cs75-plus', make: 'Changan', model: 'CS75 Plus', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 5 },
  { id: 'imp-changan-cs85', make: 'Changan', model: 'CS85', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 6 },
  { id: 'imp-changan-uni-k', make: 'Changan', model: 'UNI-K', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 7 },
  { id: 'imp-changan-uni-t', make: 'Changan', model: 'UNI-T', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 8 },
  { id: 'imp-changan-hunter', make: 'Changan', model: 'Hunter', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 9 },

  // Jetour — China (Shanghai)
  { id: 'imp-jetour-x50', make: 'Jetour', model: 'X50', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 1 },
  { id: 'imp-jetour-x70', make: 'Jetour', model: 'X70', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 2 },
  { id: 'imp-jetour-x90', make: 'Jetour', model: 'X90', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 3 },
  { id: 'imp-jetour-dashing', make: 'Jetour', model: 'Dashing', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 4 },
  { id: 'imp-jetour-t2', make: 'Jetour', model: 'T2', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 5 },

  // MG — China (Shanghai)
  { id: 'imp-mg-mg3', make: 'MG', model: 'MG3', bodyType: 'Hatchback', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 1 },
  { id: 'imp-mg-mg5', make: 'MG', model: 'MG5', bodyType: 'Sedan', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 2 },
  { id: 'imp-mg-zs', make: 'MG', model: 'ZS', bodyType: 'SUV', fuelTypes: ['Petrol', 'Electric'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 3 },
  { id: 'imp-mg-hs', make: 'MG', model: 'HS', bodyType: 'SUV', fuelTypes: ['Petrol', 'Hybrid'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 4 },
  { id: 'imp-mg-rx5', make: 'MG', model: 'RX5', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 5 },
  { id: 'imp-mg-rx8', make: 'MG', model: 'RX8', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 6 },
  { id: 'imp-mg-mg4', make: 'MG', model: 'MG4', bodyType: 'Hatchback', fuelTypes: ['Electric'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 7 },
  { id: 'imp-mg-extender', make: 'MG', model: 'Extender', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 8 },

  // Foton — China (Tianjin)
  { id: 'imp-foton-tunland', make: 'Foton', model: 'Tunland', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 1 },
  { id: 'imp-foton-aumark', make: 'Foton', model: 'Aumark', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 2 },
  { id: 'imp-foton-ollin', make: 'Foton', model: 'Ollin', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 3 },
  { id: 'imp-foton-auman', make: 'Foton', model: 'Auman', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 4 },
  { id: 'imp-foton-view', make: 'Foton', model: 'View', bodyType: 'Van', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Tianjin', condition: 'new', displayOrder: 5 },

  // JAC — China (Shanghai)
  { id: 'imp-jac-t6', make: 'JAC', model: 'T6', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 1 },
  { id: 'imp-jac-t8', make: 'JAC', model: 'T8', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 2 },
  { id: 'imp-jac-t9', make: 'JAC', model: 'T9', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 3 },
  { id: 'imp-jac-js4', make: 'JAC', model: 'JS4', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 4 },
  { id: 'imp-jac-n-series', make: 'JAC', model: 'N-Series', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 5 },

  // Dongfeng — China (Shanghai)
  { id: 'imp-dongfeng-rich-6', make: 'Dongfeng', model: 'Rich 6', bodyType: 'Pickup', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 1 },
  { id: 'imp-dongfeng-glory-580', make: 'Dongfeng', model: 'Glory 580', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 2 },
  { id: 'imp-dongfeng-forthing-t5', make: 'Dongfeng', model: 'Forthing T5', bodyType: 'SUV', fuelTypes: ['Petrol'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 3 },
  { id: 'imp-dongfeng-captain', make: 'Dongfeng', model: 'Captain', bodyType: 'Truck', fuelTypes: ['Diesel'], originCountry: 'China', originPort: 'Shanghai', condition: 'new', displayOrder: 4 },
];

// Brand-first browsing. Somebody importing a car knows they want a Hyundai
// long before they know which Hyundai, so the catalogue is entered through the
// marque. Derived from the list above rather than kept as a second array, so a
// brand can never appear with no models behind it.
export function importCatalogMakes() {
  const byMake = new Map();
  for (const item of FALLBACK_IMPORT_CATALOG) {
    const entry = byMake.get(item.make) || {
      make: item.make,
      originCountry: item.originCountry,
      modelCount: 0,
      bodyTypes: new Set(),
    };
    entry.modelCount += 1;
    entry.bodyTypes.add(item.bodyType);
    byMake.set(item.make, entry);
  }
  return [...byMake.values()]
    .map((e) => ({ ...e, bodyTypes: [...e.bodyTypes].sort() }))
    .sort((a, b) => a.make.localeCompare(b.make));
}

export function importCatalogModelsForMake(make) {
  if (!make) return [];
  const key = String(make).toLowerCase();
  return FALLBACK_IMPORT_CATALOG
    .filter((item) => item.make.toLowerCase() === key)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function searchImportCatalog(query = '', filters = {}) {
  const q = String(query || '').toLowerCase().trim();
  let list = FALLBACK_IMPORT_CATALOG;

  if (q) {
    list = list.filter(
      (item) =>
        item.make.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        `${item.make} ${item.model}`.toLowerCase().includes(q) ||
        item.bodyType.toLowerCase().includes(q) ||
        item.originCountry.toLowerCase().includes(q) ||
        item.fuelTypes.some((f) => f.toLowerCase().includes(q)),
    );
  }

  if (filters.make) {
    list = list.filter((item) => item.make.toLowerCase() === filters.make.toLowerCase());
  }
  if (filters.originCountry) {
    list = list.filter((item) => item.originCountry.toLowerCase() === filters.originCountry.toLowerCase());
  }
  if (filters.bodyType) {
    list = list.filter((item) => item.bodyType.toLowerCase() === filters.bodyType.toLowerCase());
  }
  if (filters.fuelType) {
    const fuel = filters.fuelType.toLowerCase();
    list = list.filter((item) => item.fuelTypes.some((f) => f.toLowerCase() === fuel));
  }

  return list;
}

export function getImportCatalogItem(id) {
  return FALLBACK_IMPORT_CATALOG.find((item) => item.id === id) || null;
}

export default FALLBACK_IMPORT_CATALOG;
