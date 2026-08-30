// ─────────────────────────────────────────────────────────────────────────────
// Was this inspection plausibly performed?
//
// The 150-point checklist is the product, so a rubber-stamped one is worse than
// none at all: it certifies things nobody looked at, and after the fact it is
// indistinguishable from honest work. If the condition data becomes the real
// asset, a fabricated record does not weaken the set — it poisons it.
//
// Nothing here blocks anything, and that is the design. A mechanic can be
// interrupted and restart, and refusing the completion would punish honest work
// while teaching everyone else to game the clock. What these tests protect is
// that the signal is DERIVED, VISIBLE and permanent.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { REQUIRED_ITEM_IDS } = require('../src/lib/inspection-policy');
const { elapsedMinutes, integrityFlags, integrityPriority } = require('../src/lib/inspection-integrity');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
const checklist = (verdict = 'pass') => Object.fromEntries(REQUIRED_ITEM_IDS.map((id) => [id, verdict]));

let fixtureDay = 1000;
const nextDay = () => new Date(Date.now() + fixtureDay++ * 86400_000).toISOString().slice(0, 10);

async function register(overrides = {}) {
  const body = { name: 'Integrity User', email: unique('integrity'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin(user) {
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}
/** A booked walk-in, ready to start. */
async function booked(admin) {
  const day = nextDay();
  await pool.query(
    "DELETE FROM inspections i WHERE lower(i.center)='nyarutarama center' AND i.scheduled_on=$1::date"
      + " AND NOT EXISTS (SELECT 1 FROM rental_cars rc WHERE rc.inspection_id = i.id)", [day]
  );
  const res = await api().post('/inspections/standalone').set('Authorization', `Bearer ${admin}`).send({
    make: 'Toyota', model: 'Probox', year: 2013,
    center: 'Nyarutarama Center', scheduled_date: day, scheduled_time: '08:00 AM',
    customer: { name: 'Clock Test', email: unique('clock') },
  }).expect(201);
  return res.body;
}

test.after(async () => { await pool.end(); });

// ─── The rules themselves ────────────────────────────────────────────────────

test('the signal is derived from the clock and the shape of the result', () => {
  const at = (mins, results) => ({
    status: 'complete',
    started_at: new Date(Date.now() - mins * 60_000),
    completed_at: new Date(),
    checklist_results: results,
  });

  assert.equal(elapsedMinutes(at(45, {})), 45);
  assert.equal(elapsedMinutes({ status: 'complete', started_at: null, completed_at: new Date() }), null);
  // An inspection still in progress has nothing to judge yet.
  assert.deepEqual(integrityFlags({ status: 'in_progress' }), []);

  const rushed = integrityFlags(at(4, checklist()), { minMinutes: 20 }).map((f) => f.id);
  assert.ok(rushed.includes('too_fast'));
  assert.ok(rushed.includes('no_exceptions'));
  assert.equal(integrityPriority(integrityFlags(at(4, checklist()), { minMinutes: 20 })), 'urgent');

  // A careful inspector on a genuinely good car passes everything. That alone
  // is not a finding, and must never be reported as urgent.
  const clean = integrityFlags(at(50, checklist()), { minMinutes: 20 });
  assert.deepEqual(clean.map((f) => f.id), ['no_exceptions']);
  assert.equal(integrityPriority(clean), 'attention');

  // Real work with a real exception raises nothing at all.
  const honest = { ...checklist(), [REQUIRED_ITEM_IDS[0]]: 'flag' };
  assert.deepEqual(integrityFlags(at(50, honest), { minMinutes: 20 }), []);

  // Completed with no recorded start is its own problem.
  assert.equal(
    integrityFlags({ status: 'complete', started_at: null, completed_at: new Date(), checklist_results: honest })
      .some((f) => f.id === 'no_recorded_start'),
    true
  );

  // The floor is configurable, and the same inspection reads differently under
  // a different one — which is why nothing is stored as a verdict.
  assert.equal(integrityFlags(at(30, honest), { minMinutes: 20 }).length, 0);
  assert.equal(integrityFlags(at(30, honest), { minMinutes: 60 }).some((f) => f.id === 'too_fast'), true);
});

// ─── It never blocks ─────────────────────────────────────────────────────────

test('an implausibly fast inspection still completes, and says so permanently', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const inspection = await booked(admin);
  await api().post(`/inspections/${inspection.id}/start`).set(auth).expect(200);

  // Completed the instant it was started — the shape of a rubber stamp.
  const done = await api().post(`/inspections/${inspection.id}/complete`).set(auth)
    .send({ checklist_results: checklist() }).expect(200);

  assert.equal(done.body.score, 150, 'the work is accepted — this is a flag, never a refusal');
  assert.equal(typeof done.body.elapsed_minutes, 'number');
  const ids = done.body.integrity_flags.map((f) => f.id);
  assert.ok(ids.includes('too_fast'), 'and it is reported back at the moment of completion');

  // Written permanently into the audit log, where a later threshold change
  // cannot rewrite what was true on the day.
  const { rows } = await pool.query(
    "SELECT metadata FROM admin_audit_log WHERE target_id=$1 AND action='inspection.completed'",
    [inspection.id]
  );
  assert.equal(rows.length, 1);
  assert.equal(typeof rows[0].metadata.elapsed_minutes, 'number');
  assert.ok(rows[0].metadata.integrity_flags.includes('too_fast'));
});

// ─── It reaches a human ──────────────────────────────────────────────────────

test('a suspect record reaches the Action Center, and honest work does not', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };

  const rushed = await booked(admin);
  await api().post(`/inspections/${rushed.id}/start`).set(auth).expect(200);
  await api().post(`/inspections/${rushed.id}/complete`).set(auth)
    .send({ checklist_results: checklist() }).expect(200);
  // Age it by three days without changing the gap between start and finish.
  // The Action Center sorts urgent work oldest-first and caps the list, which
  // is the right queue discipline — so a record completed seconds ago sits at
  // the bottom. An unreviewed suspect inspection from three days back is both
  // what this queue is for and what a real backlog looks like.
  await pool.query(
    `UPDATE inspections SET started_at = started_at - INTERVAL '3 days',
                            completed_at = completed_at - INTERVAL '3 days'
      WHERE id = $1`, [rushed.id]
  );

  const careful = await booked(admin);
  await api().post(`/inspections/${careful.id}/start`).set(auth).expect(200);
  // Backdate the start so the clock reads like real work, with a real finding.
  await pool.query("UPDATE inspections SET started_at = NOW() - INTERVAL '55 minutes' WHERE id=$1", [careful.id]);
  await api().post(`/inspections/${careful.id}/complete`).set(auth)
    .send({ checklist_results: { ...checklist(), [REQUIRED_ITEM_IDS[0]]: 'flag' } }).expect(200);
  await pool.query(
    `UPDATE inspections SET started_at = started_at - INTERVAL '3 days',
                            completed_at = completed_at - INTERVAL '3 days'
      WHERE id = $1`, [careful.id]
  );

  // Filtered to this kind. The desk is capped at 60 items and every other test
  // file writes to the same database, so asking the whole queue made this
  // assertion a race against everyone else's backlog rather than a test of
  // whether a rushed inspection surfaces.
  const centre = await api().get('/admin/action-center?kind=Inspection').set(auth).expect(200);
  const ids = centre.body.items.map((entry) => entry.id);
  assert.ok(ids.includes(`inspection-integrity:${rushed.id}`), 'the rushed record must surface');
  assert.equal(ids.includes(`inspection-integrity:${careful.id}`), false, 'honest work must not');

  const flagged = centre.body.items.find((entry) => entry.id === `inspection-integrity:${rushed.id}`);
  assert.equal(flagged.priority, 'urgent');
  assert.match(flagged.detail, /minute/i, 'it must say what was observed, not just that something is wrong');
  assert.equal(flagged.href, `/inspections/${rushed.id}`);
});

// ─── The screen that makes it manageable ─────────────────────────────────────

test('per-inspector statistics describe the work rather than judge it', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const inspection = await booked(admin);
  await api().post(`/inspections/${inspection.id}/start`).set(auth).expect(200);
  await pool.query("UPDATE inspections SET started_at = NOW() - INTERVAL '40 minutes' WHERE id=$1", [inspection.id]);
  await api().post(`/inspections/${inspection.id}/complete`).set(auth)
    .send({ checklist_results: checklist() }).expect(200);

  const stats = await api().get('/admin/inspectors').set(auth).expect(200);
  const mine = stats.body.find((row) => row.inspector_id);
  assert.ok(mine, 'a completed inspection must appear against its inspector');
  assert.ok(mine.completed >= 1);
  assert.equal(typeof mine.median_minutes, 'number');
  assert.ok(mine.pass_rate >= 0 && mine.pass_rate <= 100);
  assert.ok(mine.critical_failure_rate >= 0 && mine.critical_failure_rate <= 100);

  const outsider = await register();
  await api().get('/admin/inspectors').set('Authorization', `Bearer ${outsider.token}`).expect(403);
  await api().get('/admin/inspectors').expect(401);
});

test('the floor is an editable setting, not a constant', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };

  const saved = await api().patch('/admin/settings/inspection_min_minutes').set(auth)
    .send({ value: 35 }).expect(200);
  assert.equal(saved.body.value, 35);
  // Zero is allowed: switching the signal off is a decision an operator may
  // make, but it must be a deliberate one that lands in the audit log.
  await api().patch('/admin/settings/inspection_min_minutes').set(auth).send({ value: 0 }).expect(200);
  await api().patch('/admin/settings/inspection_min_minutes').set(auth).send({ value: -5 }).expect(400);
  await api().patch('/admin/settings/inspection_min_minutes').set(auth).send({ value: 'quick' }).expect(400);

  await pool.query("UPDATE platform_settings SET value='20'::jsonb WHERE key='inspection_min_minutes'");
});

// ─── Saving the work as it is done ───────────────────────────────────────────

test('a checklist can be saved in pieces, and pieces never score anything', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const inspection = await booked(admin);

  // Nothing can be recorded before the work starts.
  await api().patch(`/inspections/${inspection.id}/checklist`).set(auth)
    .send({ checklist_results: { [REQUIRED_ITEM_IDS[0]]: 'pass' } }).expect(409);

  await api().post(`/inspections/${inspection.id}/start`).set(auth).expect(200);

  const first = await api().patch(`/inspections/${inspection.id}/checklist`).set(auth)
    .send({ checklist_results: Object.fromEntries(REQUIRED_ITEM_IDS.slice(0, 40).map((id) => [id, 'pass'])) })
    .expect(200);
  assert.equal(first.body.recorded, 40);
  assert.equal(first.body.remaining, REQUIRED_ITEM_IDS.length - 40);

  // A second save MERGES. Two tabs, or a flaky connection resending a smaller
  // object, must never be able to erase verdicts already recorded.
  const second = await api().patch(`/inspections/${inspection.id}/checklist`).set(auth)
    .send({ checklist_results: { [REQUIRED_ITEM_IDS[40]]: 'flag' } }).expect(200);
  assert.equal(second.body.recorded, 41, 'the earlier forty must survive');

  // A draft is a notebook, not a verdict: nothing is scored or passed yet.
  const { rows } = await pool.query(
    'SELECT status, score, passed FROM inspections WHERE id=$1', [inspection.id]
  );
  assert.equal(rows[0].status, 'in_progress');
  assert.equal(rows[0].score, null);
  assert.equal(rows[0].passed, false);

  // And the completion still demands the whole canonical checklist.
  const short = await api().post(`/inspections/${inspection.id}/complete`).set(auth)
    .send({ checklist_results: { [REQUIRED_ITEM_IDS[0]]: 'pass' } }).expect(400);
  assert.equal(short.body.code, 'INSPECTION_CHECKLIST_INCOMPLETE');

  const done = await api().post(`/inspections/${inspection.id}/complete`).set(auth)
    .send({ checklist_results: checklist() }).expect(200);
  assert.equal(done.body.score, 150);

  // A completed inspection is evidence. It is not editable, by anyone.
  const refused = await api().patch(`/inspections/${inspection.id}/checklist`).set(auth)
    .send({ checklist_results: { [REQUIRED_ITEM_IDS[0]]: 'fail' } }).expect(409);
  assert.equal(refused.body.code, 'INSPECTION_ALREADY_COMPLETE');
});

test('a draft refuses anything the completion would reject', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const inspection = await booked(admin);
  await api().post(`/inspections/${inspection.id}/start`).set(auth).expect(200);

  await api().patch(`/inspections/${inspection.id}/checklist`).set(auth)
    .send({ checklist_results: 'everything fine' }).expect(400);
  const unknown = await api().patch(`/inspections/${inspection.id}/checklist`).set(auth)
    .send({ checklist_results: { not_a_real_item: 'pass' } }).expect(400);
  assert.equal(unknown.body.code, 'INSPECTION_CHECKLIST_INVALID');
  const badVerdict = await api().patch(`/inspections/${inspection.id}/checklist`).set(auth)
    .send({ checklist_results: { [REQUIRED_ITEM_IDS[0]]: 'probably ok' } }).expect(400);
  assert.match(badVerdict.body.invalid.join(' '), /probably ok/);

  // Storing a bad entry would let a draft carry something the completion later
  // rejects, so nothing was written.
  const { rows } = await pool.query('SELECT checklist_results FROM inspections WHERE id=$1', [inspection.id]);
  assert.equal(rows[0].checklist_results, null);

  const outsider = await register();
  await api().patch(`/inspections/${inspection.id}/checklist`)
    .set('Authorization', `Bearer ${outsider.token}`)
    .send({ checklist_results: { [REQUIRED_ITEM_IDS[0]]: 'pass' } }).expect(403);
});
