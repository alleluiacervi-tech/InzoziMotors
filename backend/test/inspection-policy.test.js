const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CATEGORIES,
  REQUIRED_ITEM_IDS,
  SCORE_MAX,
  PUBLISH_THRESHOLD,
  evaluateChecklist,
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
