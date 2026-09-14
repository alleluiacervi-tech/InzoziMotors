/*
 * Generates the two copies of the brand-new import catalogue from one source.
 *
 *   backend/data/import-catalog.json   <- edit this
 *     ├─ backend/migrations/00XX_*.sql  (seeded once, by the migration)
 *     └─ src/data/importCatalog.js      (the app's offline fallback)
 *
 * Why a generator: the mobile fallback and the database used to be two
 * hand-maintained lists of the same vehicles, which is the same trap
 * web/src/lib/business.ts warns about — two copies of one truth, free to
 * drift. Run `node scripts/build-import-catalog.js` after editing the JSON.
 * (Invoked by path rather than an npm script so package.json stays untouched:
 * a new entry there reads as native-sensitive to mobile-update.yml's guard and
 * would stop this from shipping over the air.)
 *
 * This writes the mobile fallback only. The database is seeded by a migration,
 * because migrations are forward-only and applied once; re-seeding on every
 * run would erase the prices and photographs an admin has entered. To change
 * the model list in production, add a migration.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'backend/data/import-catalog.json');
const target = path.join(root, 'src/data/importCatalog.js');

const data = JSON.parse(fs.readFileSync(source, 'utf8'));

const slug = (make, model) =>
  `${make}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const lines = [];
let count = 0;
for (const make of data.makes) {
  lines.push(`  // ${make.name} — ${make.origin_country} (${make.origin_port})`);
  make.models.forEach((m, i) => {
    count += 1;
    const fuels = m.fuel_types.map((f) => `'${f}'`).join(', ');
    lines.push(
      `  { id: 'imp-${slug(make.name, m.model)}', make: '${make.name}', model: '${m.model}', ` +
      `bodyType: '${m.body_type}', fuelTypes: [${fuels}], ` +
      `originCountry: '${make.origin_country}', originPort: '${make.origin_port}', ` +
      `condition: 'new', displayOrder: ${i + 1} },`,
    );
  });
  lines.push('');
}

const out = `// Brand-new (0 km) import catalogue — the offline fallback for the list the
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
${lines.join('\n').replace(/\n+$/, '')}
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
        \`\${item.make} \${item.model}\`.toLowerCase().includes(q) ||
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
`;

fs.writeFileSync(target, out);
console.log(`Wrote ${path.relative(root, target)} — ${data.makes.length} makes, ${count} models.`);
