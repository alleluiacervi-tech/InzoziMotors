// Shared fallback semantics for both marketplace entry points.
export function filterCars(list, { query = '', filters, sort } = {}) {
  const text = (value) => String(value || '').toLowerCase();
  const price = (car) => car.listingType === 'rental' ? car.dailyRate : car.price ?? car.currentBid;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let rows = list.filter((car) => terms.every((term) =>
    [car.title, car.make, car.model, car.category].some((value) => text(value).includes(term))));
  if (filters) rows = rows.filter((car) =>
    (!filters.make || text(car.make) === text(filters.make)) &&
    (!filters.body || text(car.category) === text(filters.body)) &&
    (!filters.fuel || text(car.fuel) === text(filters.fuel)) &&
    (!filters.transmission || text(car.transmission) === text(filters.transmission)) &&
    (!filters.driveSide || car.drive_side === filters.driveSide) &&
    (!filters.location || text(car.location).includes(text(filters.location))) &&
    (!filters.minPrice || price(car) >= filters.minPrice) &&
    (!filters.maxPrice || price(car) <= filters.maxPrice) &&
    (!filters.minYear || Number(car.year) >= filters.minYear) &&
    (!filters.maxYear || Number(car.year) <= filters.maxYear) &&
    (!filters.maxMileage || Number(car.mileage ?? Infinity) <= filters.maxMileage) &&
    (!filters.minScore || Number(car.inspectionScore || 0) >= filters.minScore));
  if (sort === 'Price ↑') rows.sort((a, b) => price(a) - price(b));
  if (sort === 'Price ↓') rows.sort((a, b) => price(b) - price(a));
  if (sort === 'Mileage') rows.sort((a, b) => Number(a.mileage) - Number(b.mileage));
  if (sort === 'Newest') rows.sort((a, b) => Number(b.year) - Number(a.year));
  return rows;
}

export function mergeCars(current, incoming) {
  return [...new Map([...current, ...incoming].map((car) => [car.id, car])).values()];
}
