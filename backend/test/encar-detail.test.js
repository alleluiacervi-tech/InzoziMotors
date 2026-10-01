// What may leave the Korean reports, and how they are cached. No network or DB.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDetail, scrub, shapeRecord, shapeInspection, shapeDetail, findDisplacement } = require('../src/lib/encar/detail');
const { EncarError } = require('../src/lib/encar/client');

test('the record is rebuilt from named fields: counts, dates and costs only', () => {
  const r = shapeRecord({
    accidentCnt: 2, myAccidentCnt: 1, myAccidentCost: 1748300, otherAccidentCnt: 1, otherAccidentCost: 273719,
    ownerChangeCnt: 2, ownerChanges: ['2026-02-19', '2021-07-08', 'call 010-1234-5678'],
    carNoChangeCnt: 0, totalLossCnt: 0, totalLossDate: null, floodTotalLossCnt: 0, floodPartLossCnt: null,
    robberCnt: 0, use: '2', business: 0, firstDate: '2017-07-31', regDate: '2026-09-30T10:00:00',
    carNo: '123가4567', ownerName: 'Kim', vin: 'KNAPB81ABC1234567',
    accidents: [{ date: '2024-01-23', type: '3', partCost: 0, laborCost: 72630, paintingCost: 201089, insuranceBenefit: 300000, shop: 'Kim Motors' }],
  });
  assert.equal(r.accident_count, 2);
  assert.equal(r.commercial, false);
  assert.deepEqual(r.owner_changes, ['2026-02-19', '2021-07-08']); // the odd entry is not a date
  assert.deepEqual(r.accidents, [{ date: '2024-01-23', type: '3', part_cost: 0, labor_cost: 72630, painting_cost: 201089, insurance_benefit: 300000 }]);
  assert.doesNotMatch(JSON.stringify(r), /carNo|ownerName|"vin"|KNAPB|가|Kim|010-/i);
  assert.equal('total_loss_date' in r, false, 'null fields are left out, not sent as null');
});

test('the inspection keeps its summary, and scrubs the free-form parts', () => {
  const r = shapeInspection({
    vehicleId: '1', inspectionSource: 'x', directManagement: true,
    master: {
      accdient: false, simpleRepair: true, supplyNum: 'CERT-12345', registrationDate: '2026-09-01',
      detail: {
        vin: 'KNAPB81ABC1234567', mileage: 38200, waterlog: false, recall: 'none',
        engine: { check: 'good', plateNo: '12가3456' }, dealerPhone: '010-1234-5678', remark: 'seen at 12가3456',
      },
    },
    outers: [{ panel: 'door', status: 'paint' }],
    inners: [],
    etcs: [{ note: 'call 010-9999-8888 for details' }, { note: 'minor scratch' }],
    images: [{ url: 'https://x/y.jpg' }],
  });
  assert.equal(r.accident, false);
  assert.equal(r.simple_repair, true);
  assert.equal(r.inspected_on, '2026-09-01');
  assert.equal(r.detail.mileage, 38200);
  assert.equal(r.detail.engine.check, 'good');
  assert.deepEqual(r.exterior, [{ panel: 'door', status: 'paint' }]);
  assert.deepEqual(r.notes, [{ note: 'minor scratch' }]);
  assert.doesNotMatch(JSON.stringify(r), /KNAPB|CERT-|plate|가|010|dealer|https/i);
});

test('scrub caps depth and width, and an oversized inspection keeps only its headline', () => {
  assert.equal(JSON.stringify(scrub({ a: { b: { c: { d: { e: { f: { g: 'x' } } } } } } }) ?? '').includes('"g"'), false);
  assert.equal(scrub({ list: Array.from({ length: 500 }, (_, i) => i) }).list.length, 200);
  const huge = shapeInspection({ master: { accdient: true, detail: { rows: Array.from({ length: 200 }, (_, i) => ({ [`k${i}`]: 'y'.repeat(390) })) } }, outers: [] });
  assert.equal(huge.__truncated, true);
  assert.equal(huge.accident, true);
});

test('the vehicle detail keeps only the engine size and the price history', () => {
  const r = shapeDetail({
    spec: { displacement: 1998, colorName: 'white' }, vin: 'KNAPB81ABC1234567', contact: { phone: '010-1' },
    priceHistory: [{ price: 2500, observedAt: '2026-08-01T00:00:00Z' }, { price: 2400, observedAt: '2026-09-01T00:00:00Z' }, { price: 'x' }],
  });
  assert.deepEqual(r, { engine_cc: 1998, price_history: [{ price_man: 2500, observed_at: '2026-08-01' }, { price_man: 2400, observed_at: '2026-09-01' }] });
  assert.deepEqual(shapeDetail({ vin: 'x' }), {});
});

test('engine size is found wherever the provider puts it, and only if plausible', () => {
  assert.equal(findDisplacement({ spec: { engine: { displacement: 1998 } } }), 1998);
  assert.equal(findDisplacement({ displacement: 5 }), null);
  assert.equal(findDisplacement({ nothing: 1 }), null);
});

function fakeDb() {
  const rows = new Map();
  return {
    rows,
    async query(sql, params) {
      if (/SELECT payload/.test(sql)) {
        const r = rows.get(`${params[0]}|${params[1]}`);
        return { rows: r ? [r] : [] };
      }
      if (/INSERT INTO encar_detail_cache/.test(sql)) {
        rows.set(`${params[0]}|${params[1]}`, {
          payload: JSON.parse(params[2]), fetched_at: new Date(), expires_at: new Date(Date.now() + Number(params[3])),
        });
        return { rows: [] };
      }
      throw new Error(`unexpected SQL: ${sql}`);
    },
  };
}

test('a car opened twice costs one provider request, and concurrent opens share one', async () => {
  let calls = 0;
  const client = { configured: true, inspection: async () => { calls += 1; await new Promise((r) => setTimeout(r, 10)); return { master: { accdient: false } }; } };
  const detail = createDetail({ db: fakeDb(), client });
  const [a, b] = await Promise.all([detail.get('1', 'inspection'), detail.get('1', 'inspection')]);
  assert.equal(calls, 1);
  assert.equal(a.status, 'ok');
  assert.deepEqual(b.payload, { accident: false });
  await detail.get('1', 'inspection');
  assert.equal(calls, 1, 'second open is served from the cache');
});

test('the provider has no report for this car: answered "none", and remembered briefly', async () => {
  let calls = 0;
  const client = { configured: true, record: async () => { calls += 1; throw new EncarError('not_found', 'no record'); } };
  const detail = createDetail({ db: fakeDb(), client });
  assert.deepEqual(await detail.get('2', 'record'), { status: 'none' });
  assert.deepEqual(await detail.get('2', 'record'), { status: 'none' });
  assert.equal(calls, 1);
});

test('a provider failure serves the older copy when there is one, "unavailable" when there is not', async () => {
  const db = fakeDb();
  let fail = false;
  let t = Date.now();
  const client = { configured: true, inspection: async () => { if (fail) throw new EncarError('unavailable', 'down'); return { master: { simpleRepair: true } }; } };
  const detail = createDetail({ db, client, now: () => t });
  assert.equal((await detail.get('3', 'inspection')).status, 'ok');
  t += 25 * 3_600_000; // the 24 h copy has expired
  fail = true;
  const stale = await detail.get('3', 'inspection');
  assert.equal(stale.status, 'ok');
  assert.equal(stale.stale, true);
  assert.deepEqual(await detail.get('never-fetched', 'inspection'), { status: 'unavailable' });
});

test('with no key configured, nothing is requested', async () => {
  const detail = createDetail({ db: fakeDb(), client: { configured: false } });
  assert.deepEqual(await detail.get('4', 'inspection'), { status: 'unavailable' });
});

test('the daily on-demand budget stops further fetches but still serves what is cached', async () => {
  let calls = 0;
  const client = { configured: true, inspection: async () => { calls += 1; return { master: { accdient: false } }; } };
  const detail = createDetail({ db: fakeDb(), client, dailyMax: 2 });
  await detail.get('a', 'inspection');
  await detail.get('b', 'inspection');
  assert.deepEqual(await detail.get('c', 'inspection'), { status: 'unavailable' });
  assert.equal((await detail.get('a', 'inspection')).status, 'ok');
  assert.equal(calls, 2);
});

test('an unknown kind is refused without touching the provider', async () => {
  const detail = createDetail({ db: fakeDb(), client: { configured: true } });
  assert.deepEqual(await detail.get('1', 'owner'), { status: 'none' });
});
