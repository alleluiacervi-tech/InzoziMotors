// Persist only public card fields, never contact details or identity evidence.
const CARD_FIELDS = ['detailsUnavailable', 'id', 'title', 'make', 'model', 'year', 'price', 'dailyRate', 'listingType', 'image', 'mileage', 'fuel', 'transmission', 'category', 'location', 'drive_side', 'inspectionScore', 'inspected', 'listedDays', 'priceHistory', 'saves', 'status'];
export function publicListingSnapshot(car) {
  return Object.fromEntries(CARD_FIELDS.filter((key) => car[key] !== undefined).map((key) => [key, car[key]]));
}
export function savedListings(ids, records, catalogue) {
  const known = new Map(catalogue.map((car) => [car.id, car]));
  for (const car of Object.values(records)) {
    if (!known.has(car.id) || (!car.detailsUnavailable && car.listingType !== 'rental')) known.set(car.id, car);
  }
  return ids.map((id) => known.get(id) || { id, detailsUnavailable: true });
}

// Recover public card records without calling the detail endpoint, which
// records a vehicle view. Opening the app must not manufacture those views.
export async function resolveSavedRecords(ids, loadPage, isActive = () => true) {
  const missing = new Set(ids);
  const found = [];
  const limit = 100;
  for (let offset = 0; missing.size && isActive(); offset += limit) {
    const rows = await loadPage({ limit, offset });
    if (!isActive()) break;
    for (const car of rows) {
      if (missing.delete(car.id)) found.push(car);
    }
    if (rows.length < limit) break;
  }
  return found;
}

// Only a completed successful catalogue scan can mark a saved record missing.
// Rental records belong to their separate catalogue and are not disproved by it.
export function reconcileSavedRecords(ids, current, recovered) {
  const next = { ...current };
  const found = new Set(recovered.map((car) => car.id));
  for (const id of ids) {
    if (!found.has(id) && current[id]?.listingType !== 'rental') {
      next[id] = { id, title: current[id]?.title, image: current[id]?.image, detailsUnavailable: true };
    }
  }
  for (const car of recovered) next[car.id] = publicListingSnapshot(car);
  return next;
}
