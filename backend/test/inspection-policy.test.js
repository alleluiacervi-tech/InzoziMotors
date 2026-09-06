const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CATEGORIES,
  REQUIRED_ITEM_IDS,
  SCORE_MAX,
  PUBLISH_THRESHOLD,
  evaluateChecklist,
  attestableItemIds,
} = require('../src/lib/inspection-policy');

const checklist = (verdict = 'pass') => Object.fromEntries(REQUIRED_ITEM_IDS.map((id) => [id, verdict]));

test('canonical inspection policy defines exactly 150 one-point checks', () => {
  assert.equal(REQUIRED_ITEM_IDS.length, 150);
  assert.equal(SCORE_MAX, 150);
  assert.equal(CATEGORIES.reduce((sum, category) => sum + category.max_points, 0), 150);
  for (const category of CATEGORIES) assert.equal(category.items.length, category.max_points);
});

test('partial, unknown and invalid inspection results are rejected', () => {
  const partial = checklist();
  delete partial.e01;
  assert.equal(evaluateChecklist(partial).valid, false);
  assert.deepEqual(evaluateChecklist(partial).missing, ['e01']);

  const unknown = { ...checklist(), invented_check: 'pass' };
  assert.deepEqual(evaluateChecklist(unknown).unknown, ['invented_check']);

  const invalid = { ...checklist(), e01: 'excellent' };
  assert.deepEqual(evaluateChecklist(invalid).invalid, ['e01']);
});

test('a critical failure blocks publication even above the score threshold', () => {
  const results = checklist();
  results.e04 = 'fail';
  const evaluated = evaluateChecklist(results);
  assert.ok(evaluated.score >= PUBLISH_THRESHOLD);
  assert.equal(evaluated.valid, true);
  assert.equal(evaluated.passed, false);
  assert.deepEqual(evaluated.critical_failures.map((failure) => failure.id), ['e04']);
});

// ─── What a bulk attestation is allowed to fill ─────────────────────────────
// The route trusts this function completely to decide which items a single
// "attest the rest" action may answer — never by what a client sends. So its
// contract is: exactly the non-critical items of a category, nothing more.

test('attestableItemIds returns exactly the non-critical items of a category', () => {
  for (const category of CATEGORIES) {
    const ids = attestableItemIds(category.id);
    assert.ok(Array.isArray(ids));
    assert.deepEqual(ids, category.items.filter((item) => !item.critical).map((item) => item.id));
    // No critical item is ever in the attestable set, whichever category.
    for (const item of category.items) {
      if (item.critical) assert.equal(ids.includes(item.id), false, `${category.id}/${item.id} is critical`);
    }
  }
});

test('attestableItemIds refuses an unknown category rather than silently attesting nothing', () => {
  assert.equal(attestableItemIds('not_a_real_category'), null);
});

// Today every category has at least one non-critical item, so the route's
// "every item in this category is critical" refusal is defensive rather than
// reachable through a real category id. This pins that fact so a future edit
// to the checklist that removes the last non-critical item from a category
// is caught here — the moment that changes, the route's 400 branch becomes
// exercisable, and an integration test for it should be added alongside it.
test('every category currently has at least one attestable (non-critical) item', () => {
  for (const category of CATEGORIES) {
    assert.ok(attestableItemIds(category.id).length > 0, `${category.id} has nothing attestable`);
  }
});
