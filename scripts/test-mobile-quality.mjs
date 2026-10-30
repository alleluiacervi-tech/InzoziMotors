import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// These utilities have no platform imports; the same source runs under Node 20
// without changing the package's React Native module configuration.
async function utility(name) {
  const source = await readFile(new URL(`../src/utils/${name}.js`, import.meta.url), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { filterCars, mergeCars } = await utility('carSearch');
const { publicListingSnapshot, savedListings, resolveSavedRecords, reconcileSavedRecords } = await utility('savedListings');
const { authContinuation, resumeAfterAuth } = await utility('authContinuation');
const car = { id: 'a', title: 'Toyota RAV4', make: 'Toyota', year: 2021, category: 'SUV', mileage: 20000, price: 18000000, drive_side: 'LHD' };

test('both browse entry points use all search terms and tolerate missing fields', () => {
  assert.deepEqual(filterCars([car, { id: 'b', title: 'Toyota Yaris', category: 'Hatchback' }], { query: 'toyota suv' }), [car]);
  assert.deepEqual(filterCars([{ id: 'empty' }], { query: 'toyota' }), []);
});
test('fallback filters preserve year ranges, drive side and mileage constraints', () => {
  assert.deepEqual(filterCars([car], { filters: { minYear: 2020, maxYear: 2022, driveSide: 'LHD', maxMileage: 25000 } }), [car]);
  assert.equal(filterCars([car], { filters: { maxYear: 2020 } }).length, 0);
  assert.equal(filterCars([car], { filters: { driveSide: 'RHD' } }).length, 0);
});
test('rental sorting uses daily rates, not sale prices', () => {
  const expensive = { id: 'expensive', listingType: 'rental', dailyRate: 100000, price: 1 };
  const cheap = { id: 'cheap', listingType: 'rental', dailyRate: 50000, price: 100 };
  assert.deepEqual(filterCars([expensive, cheap], { sort: 'Price ↑' }).map((item) => item.id), ['cheap', 'expensive']);
});
test('overlapping server pages replace duplicate records without losing order', () => {
  assert.deepEqual(mergeCars([car], [{ ...car, price: 17000000 }, { id: 'b' }]).map((item) => [item.id, item.price]), [['a', 17000000], ['b', undefined]]);
});
test('saved records remain independent of the current catalogue page', () => {
  assert.deepEqual(savedListings(['a'], { a: car }, [{ id: 'other' }]), [car]);
  assert.deepEqual(savedListings(['unknown'], {}, []), [{ id: 'unknown', detailsUnavailable: true }]);
});
test('the latest saved detail wins over an older browse record', () => {
  assert.equal(savedListings(['a'], { a: { ...car, price: 17000000 } }, [car])[0].price, 17000000);
});
test('saved card snapshots never persist private contact or identity fields', () => {
  const snapshot = publicListingSnapshot({ ...car, sellerPhone: '+250000000000', sellerWhatsApp: 'private', id_front_url: 'private', token: 'private' });
  assert.equal(snapshot.id, car.id);
  for (const field of ['sellerPhone', 'sellerWhatsApp', 'id_front_url', 'token']) assert.equal(field in snapshot, false);
});
test('successful sign-in resumes a customer task with a usable back destination', () => {
  let state;
  resumeAfterAuth({ reset: (next) => { state = next; } }, { returnTo: 'CarSubmission', returnParams: { prefill: { make: 'Toyota' } } });
  assert.equal(state.index, 1);
  assert.deepEqual(state.routes, [{ name: 'Main' }, { name: 'CarSubmission', params: { prefill: { make: 'Toyota' } } }]);
});
test('an account tab can be resumed without creating duplicate Main routes', () => {
  let state;
  resumeAfterAuth({ reset: (next) => { state = next; } }, { returnTo: 'Main', returnParams: { screen: 'Messages' } });
  assert.deepEqual(state, { index: 0, routes: [{ name: 'Main', params: { screen: 'Messages' } }] });
});
test('authentication continuation rejects staff and unknown destinations', () => {
  for (const returnTo of ['AdminPanel', 'AdminAnalytics', 'https://other.example', undefined]) assert.deepEqual(authContinuation({ returnTo }), {});
  assert.deepEqual(authContinuation({ returnTo: 'Main', returnParams: { screen: 'AdminPanel' } }), {});
});
test('account continuation strips injected nested navigation state', () => {
  assert.deepEqual(authContinuation({ returnTo: 'Main', returnParams: { screen: 'Profile', state: { routes: [{ name: 'AdminPanel' }] } } }), { returnTo: 'Main', returnParams: { screen: 'Profile' } });
  assert.equal(authContinuation({ returnTo: 'KoreaCarDetail', returnParams: { id: 'car' } }).returnTo, 'KoreaCarDetail');
});

test('saved record recovery pages the public catalogue instead of counting a detail view', async () => {
  const calls = [];
  const first = Array.from({ length: 100 }, (_, id) => ({ id: `other-${id}` }));
  const found = await resolveSavedRecords(['a'], async ({ offset }) => {
    calls.push(offset);
    return offset === 0 ? first : [car];
  });
  assert.deepEqual(calls, [0, 100]);
  assert.deepEqual(found, [car]);
});
test('saved recovery stops when its screen state is superseded', async () => {
  let active = true;
  const found = await resolveSavedRecords(['a'], async () => { active = false; return [car]; }, () => active);
  assert.deepEqual(found, []);
});

test('a successful missing-record scan preserves the name but does not advertise an old price', () => {
  const records = reconcileSavedRecords(['a'], { a: car }, []);
  assert.equal(records.a.title, car.title);
  assert.equal(records.a.detailsUnavailable, true);
  assert.equal(records.a.price, undefined);
  assert.equal(publicListingSnapshot(records.a).detailsUnavailable, true);
});
test('the sale catalogue cannot mark a rental unavailable', () => {
  const rental = { ...car, listingType: 'rental', dailyRate: 50000 };
  assert.deepEqual(reconcileSavedRecords(['a'], { a: rental }, []).a, rental);
  assert.equal(savedListings(['a'], { a: rental }, [{ ...rental, dailyRate: 70000 }])[0].dailyRate, 70000);
});
test('a recovered live record replaces an earlier unavailable state', () => {
  const records = reconcileSavedRecords(['a'], { a: { id: 'a', detailsUnavailable: true } }, [car]);
  assert.equal(records.a.price, car.price);
  assert.equal(records.a.detailsUnavailable, undefined);
});
