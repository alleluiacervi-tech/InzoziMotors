const { test } = require('node:test');
const assert = require('node:assert');
const { findFolder, SPECIAL_FOLDERS } = require('../src/lib/mail/mailbox');

// The folder rail hid Sent/Drafts/Junk/Trash whenever the server named them in a
// way the old exact-path match missed. These are the shapes real servers send.

const box = (path, extra = {}) => ({ path, delimiter: '.', flags: new Set(), ...extra });

test('special-use wins over names', () => {
  const list = [box('INBOX'), box('INBOX.Sent'), box('INBOX.Gesendet', { specialUse: '\\Sent' })];
  assert.equal(findFolder(list, SPECIAL_FOLDERS.sent), 'INBOX.Gesendet');
});

test('a raw \\Trash attribute in flags is honoured', () => {
  const list = [box('INBOX'), box('INBOX.Bin', { flags: new Set(['\\HasNoChildren', '\\Trash']) })];
  assert.equal(findFolder(list, SPECIAL_FOLDERS.trash), 'INBOX.Bin');
});

test('names match case-insensitively on the last segment, any delimiter', () => {
  const list = [
    box('INBOX'),
    box('INBOX/sent', { delimiter: '/' }),
    box('INBOX.DRAFTS'),
    box('INBOX.spam'),
    box('INBOX.Trash'),
  ];
  assert.equal(findFolder(list, SPECIAL_FOLDERS.sent), 'INBOX/sent');
  assert.equal(findFolder(list, SPECIAL_FOLDERS.drafts), 'INBOX.DRAFTS');
  assert.equal(findFolder(list, SPECIAL_FOLDERS.junk), 'INBOX.spam');
  assert.equal(findFolder(list, SPECIAL_FOLDERS.trash), 'INBOX.Trash');
});

test('a missing folder is null, so the caller creates it', () => {
  assert.equal(findFolder([box('INBOX')], SPECIAL_FOLDERS.trash), null);
});
