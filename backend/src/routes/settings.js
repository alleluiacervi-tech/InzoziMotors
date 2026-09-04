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
const { loadAppRelease } = require('../lib/app-release');
const { loadServiceRates } = require('../lib/service-rates');

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

// GET /settings/app-release — the newest installable build, per platform.
//
// Read on every cold launch by the mobile app, which compares its own version
// against it. Two fields do the work: `latest_version` produces a dismissable
// "there is a newer version" prompt, and `min_supported_version` produces a
// blocking one. Both are inert while that platform's `url` is empty, so this
// endpoint cannot lock anybody out before there is a store to send them to.
//
// `ota_paused` is here too, and it is not for the app: mobile-update.yml reads
// it before publishing, so halting over-the-air updates is a switch in the
// admin console rather than a commit.
//
// Never throws — an app that cannot reach this must launch normally, not
// refuse to start because it could not confirm it was allowed to.
router.get('/app-release', async (_req, res) => {
  const release = await loadAppRelease();
  // Short: this is also the stop switch, and a stop switch on a ten-minute
  // cache is not a stop switch.
  res.set('Cache-Control', 'public, max-age=60');
  res.json(release);
});

// GET /settings/rate-card — what Sawa charges for a walk-in inspection, a
// resold report and a rental listing subscription.
//
// Never throws: loadServiceRates falls back to the reviewed defaults if the
// row is missing or invalid, because a pricing page that 500s is worse than
// one showing last-reviewed figures.
router.get('/rate-card', async (_req, res) => {
  const rates = await loadServiceRates();
  res.set('Cache-Control', 'public, max-age=600');
  res.json(rates);
});

module.exports = router;
