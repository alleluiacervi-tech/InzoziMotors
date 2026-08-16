const test = require('node:test');
const assert = require('node:assert/strict');
const { screenUserText } = require('../src/lib/moderation');

test('accepts ordinary marketplace text and normalizes whitespace', () => {
  assert.deepEqual(screenUserText('  Is the car still available?  ', 500), {
    ok: true,
    text: 'Is the car still available?',
  });
});

test('rejects empty, oversized, and high-risk UGC', () => {
  assert.equal(screenUserText('', 500).ok, false);
  assert.equal(screenUserText('a'.repeat(501), 500).ok, false);
  assert.equal(screenUserText("I'm going to kill you", 500).code, 'CONTENT_REJECTED');
  assert.equal(screenUserText('child sexual exploitation', 500).code, 'CONTENT_REJECTED');
});
