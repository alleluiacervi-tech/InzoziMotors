// What may leave the Korean reports, and how they are cached. No network or DB.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDetail, sanitize, findDisplacement } = require('../src/lib/encar/detail');
const { EncarError } = require('../src/lib/encar/client');

test('scrub drops plates, VINs, contacts and people, by key and by what a value looks like', () => {
  const { payload } = sanitize({
    accident: 'none',
    PlateNumber: '123가4567',
    note: 'seen at 12가3456 yesterday',
    vinCode: 'KNAPB81ABC1234567',
    comment: 'chassis KNAPB81ABC1234567 checked',
    dealer: { name: 'Kim Motors', phone: '010-1234-5678' },
    remark: 'call 010-1234-5678',
    mail: 'a@b.co',
    items: [{ name: 'Engine', status: 'good' }, { name: 'Brakes', status: 'good' }],
  });
  assert.equal(payload.accident, 'none');
  assert.deepEqual(payload.items, [{ name: 'Engine', status: 'good' }, { name: 'Brakes', status: 'good' }]);
  for (const k of ['PlateNumber', 'note', 'vinCode', 'comment', 'dealer', 'remark', 'mail']) {
    assert.equal(k in payload, false, `${k} must not survive`);
  }
  assert.doesNotMatch(JSON.stringify(payload), /010|KNAPB|가|@/);
});

test('scrub caps depth, width and size', () => {
  const deep = { a: { b: { c: { d: { e: { f: { g: 'x' } } } } } } };
  assert.equal(JSON.stringify(sanitize(deep).payload).includes('"g"'), false);
  const wide = { list: Array.from({ length: 500 }, (_, i) => i) };
  assert.equal(sanitize(wide).payload.list.length, 200);
  const huge = { big: Array.from({ length: 200 }, () => ({ t: 'y'.repeat(390) })), keep: 'yes' };
  const r = sanitize(huge);
  assert.equal(r.truncated, true);
  assert.equal(r.payload.keep, 'yes');
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
  const client = { configured: true, inspection: async () => { calls += 1; await new Promise((r) => setTimeout(r, 10)); return { ok: 'fine' }; } };
  const detail = createDetail({ db: fakeDb(), client });
  const [a, b] = await Promise.all([detail.get('1', 'inspection'), detail.get('1', 'inspection')]);
  assert.equal(calls, 1);
  assert.equal(a.status, 'ok');
  assert.deepEqual(b.payload, { ok: 'fine' });
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
  const client = { configured: true, inspection: async () => { if (fail) throw new EncarError('unavailable', 'down'); return { v: 1 }; } };
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
  const client = { configured: true, inspection: async (id) => { calls += 1; return { id }; } };
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
