// ─────────────────────────────────────────────────────────────────────────────
// Public display data from platform_settings.
//
// A DEDICATED route per key rather than a generic /settings/:key reader. The
// table holds operational controls next to public numbers, and a general reader
// would make "is this key public?" a thing somebody has to remember every time
// they add a row. Here, publishing a setting is a deliberate act of writing a
// handler for it.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const { loadDutyRates } = require('../lib/duty-rates');

const router = express.Router();

// GET /settings/duty-rates — the rates the import calculator runs on.
//
// Never throws: loadDutyRates falls back to the reviewed defaults if the row is
// missing or invalid, because a duty calculator that returns 500 is worse than
// one showing last-reviewed figures it labels as an estimate.
router.get('/duty-rates', async (_req, res) => {
  const rates = await loadDutyRates();
  // Short, because a correction should reach the public site the same day it is
  // entered — but long enough that a page load is not a database read.
  res.set('Cache-Control', 'public, max-age=600');
  res.json(rates);
});

module.exports = router;
